#!/usr/bin/env python3
"""Read-only checks of live old and new service URLs on a networked CI runner."""
from __future__ import annotations

import sys
import urllib.error
import urllib.request

BASE = "https://boxenstopp-hn.de"
PAGES = (
    "achsvermessung-heilbronn",
    "getriebespuelung-heilbronn",
    "dpf-reinigung-heilbronn",
    "reifenservice-heilbronn",
    "klimaservice-heilbronn",
    "p242f-fehlercode-heilbronn",
)


class RedirectTracker(urllib.request.HTTPRedirectHandler):
    def __init__(self):
        super().__init__()
        self.redirects = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.redirects.append((code, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def probe(url):
    tracker = RedirectTracker()
    opener = urllib.request.build_opener(tracker)
    request = urllib.request.Request(
        url, headers={"User-Agent": "Boxenstopp-SEO-Audit/1.0"}
    )
    try:
        with opener.open(request, timeout=15) as response:
            return response.status, response.url, tracker.redirects
    except urllib.error.HTTPError as exc:
        return exc.code, exc.url, tracker.redirects


def main():
    failures = []
    for page in PAGES:
        canonical = f"{BASE}/{page}"
        old = canonical + ".html"
        try:
            for url in (old, canonical):
                status, end, redirects = probe(url)
                print(
                    f"{url}: HTTP {status}, final={end}, hops={redirects}",
                    flush=True,
                )
                if status != 200 or end != canonical:
                    failures.append(f"Unexpected final URL or HTTP status: {url}")
                if url == old and not redirects:
                    failures.append(f"Old .html URL did not redirect: {url}")
                if url == old and redirects and redirects[0][0] not in (301, 308):
                    failures.append(f"Old .html URL not permanently redirected: {url}")
        except Exception as exc:
            failures.append(f"{old}: {type(exc).__name__}: {exc}")

    unknown = f"{BASE}/this-url-must-return-404-20261111"
    try:
        status, end, hops = probe(unknown)
        print(f"{unknown}: HTTP {status}, final={end}, hops={hops}", flush=True)
        if status != 404:
            failures.append(f"Unknown URL must give HTTP 404, got {status}")
    except Exception as exc:
        failures.append(f"Unknown URL check failed: {exc}")

    for failure in failures:
        print("ERROR:", failure)
    print(f"Live URL checks: {len(PAGES)*2 + 1} requests, {len(failures)} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
