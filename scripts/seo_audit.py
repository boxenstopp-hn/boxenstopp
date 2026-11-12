#!/usr/bin/env python3
"""Static SEO checks for the Boxenstopp Cloudflare Pages repository.

Run: python3 scripts/seo_audit.py
Requires Python standard library only. Never changes site files.
"""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

DOMAIN = "boxenstopp-hn.de"
ROOT = Path(__file__).resolve().parents[1]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonicals = []
        self.robots = []
        self.links = []
        self.alternates = {}

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "link":
            rel = (data.get("rel") or "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(data.get("href") or "")
            if "alternate" in rel and data.get("hreflang"):
                self.alternates[data["hreflang"]] = data.get("href") or ""
        if tag == "meta" and data.get("name", "").lower() == "robots":
            self.robots.append(data.get("content") or "")
        if tag in ("a", "area") and data.get("href"):
            self.links.append(data["href"])


def file_for_url(url):
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or parts.hostname not in (DOMAIN, "www." + DOMAIN):
        return None
    route = unquote(parts.path)
    if not route.startswith("/") or ".." in Path(route).parts:
        return None
    if route.endswith("/"):
        return ROOT / route.lstrip("/") / "index.html"
    if route.endswith(".html"):
        return ROOT / route.lstrip("/")
    return ROOT / (route.lstrip("/") + ".html")


def main():
    try:
        document = ET.parse(ROOT / "sitemap.xml").getroot()
    except (OSError, ET.ParseError) as exc:
        print(f"ERROR sitemap.xml: {exc}")
        return 1

    urls = [(el.text or "").strip() for el in document.iter()
            if el.tag.split("}")[-1] == "loc"]
    errors = []
    warnings = []
    if not urls:
        errors.append("Sitemap has no URLs")
    if len(set(urls)) != len(urls):
        errors.append("Sitemap has duplicate URLs")

    known_urls = set(urls)
    checked = set()
    for url in urls:
        if not url.startswith(f"https://{DOMAIN}/"):
            errors.append(f"Unexpected sitemap URL: {url}")
            continue
        path = file_for_url(url)
        if path is None or not path.is_file():
            errors.append(f"Missing HTML for {url}: {path}")
            continue

        checked.add(path)
        parser = PageParser()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
        except (UnicodeError, OSError) as exc:
            errors.append(f"Cannot read {path}: {exc}")
            continue

        if parser.canonicals != [url]:
            errors.append(
                f"Canonical mismatch {path.relative_to(ROOT)}: "
                f"{parser.canonicals!r}; expected {url}"
            )
        if any("noindex" in item.lower() for item in parser.robots):
            errors.append(f"Sitemap page has noindex: {path.relative_to(ROOT)}")

        for lang, alternate in parser.alternates.items():
            if lang != "x-default" and alternate not in known_urls:
                warnings.append(
                    f"hreflang {lang} target not in sitemap: "
                    f"{path.relative_to(ROOT)} -> {alternate}"
                )

        for href in parser.links:
            parsed = urlsplit(href)
            if parsed.scheme and parsed.scheme not in ("http", "https"):
                continue
            if parsed.netloc and parsed.hostname not in (DOMAIN, "www." + DOMAIN):
                continue
            if not parsed.path or not parsed.path.startswith("/"):
                continue
            if parsed.path.startswith(("/cdn-cgi/", "/assets/")):
                continue
            target = file_for_url(f"https://{DOMAIN}{parsed.path}")
            if target and not target.exists():
                warnings.append(
                    f"Potential broken internal link: "
                    f"{path.relative_to(ROOT)} -> {href}"
                )

    print(f"SEO audit: {len(urls)} sitemap URLs; {len(checked)} HTML files checked")
    for item in sorted(set(warnings)):
        print("WARNING:", item)
    for item in sorted(set(errors)):
        print("ERROR:", item)
    print(f"Result: {len(set(errors))} error(s), {len(set(warnings))} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
