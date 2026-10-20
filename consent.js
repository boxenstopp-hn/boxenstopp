/* Boxenstopp – zentrale Consent-Steuerung (Basic Consent: Google-Tags erst nach Zustimmung) */
(function(){
  'use strict';

  const CONSENT_KEY = 'boxenstopp_consent_v1';
  const CONSENT_VERSION = 1;
  const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 180 Tage
  const GA_MEASUREMENT_ID = 'G-66HQFSY5N1';
  let analyticsLoaded = false;

  function readConsent(){
    try{
      const raw = localStorage.getItem(CONSENT_KEY);
      if(!raw) return null;
      const value = JSON.parse(raw);
      if(!value || value.version !== CONSENT_VERSION || !value.savedAt) return null;
      if(Date.now() - value.savedAt > CONSENT_MAX_AGE_MS){
        localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return {
        version: CONSENT_VERSION,
        necessary: true,
        analytics: value.analytics === true,
        external: value.external === true,
        savedAt: value.savedAt
      };
    }catch(e){ return null; }
  }

  function saveConsent(choices){
    const value = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: choices.analytics === true,
      external: choices.external === true,
      savedAt: Date.now()
    };
    try{ localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); }catch(e){}
    applyConsent(value);
    return value;
  }

  function loadAnalytics(){
    if(analyticsLoaded || document.querySelector('script[data-boxenstopp-ga]')) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('consent','default',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    script.setAttribute('data-boxenstopp-ga','1');
    document.head.appendChild(script);
  }

  function loadGoogleMap(){
    const box = document.getElementById('mapConsent');
    if(!box || box.querySelector('iframe')) return;
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.google.com/maps?q=Schafhohle%202%2C%2074226%20Nordheim&output=embed';
    iframe.title = 'Google Maps – Boxenstopp Nordheim';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.setAttribute('allowfullscreen','');
    box.innerHTML = '';
    box.appendChild(iframe);
  }

  function applyConsent(value){
    if(value && value.analytics) loadAnalytics();
    if(value && value.external) loadGoogleMap();
  }

  function hideBanner(){ const el=document.getElementById('bs-consent-banner'); if(el) el.hidden=true; }
  function showBanner(){ const el=document.getElementById('bs-consent-banner'); if(el) el.hidden=false; }
  function closeSettings(){ const el=document.getElementById('bs-consent-modal'); if(el) el.hidden=true; }

  function openSettings(){
    const current = readConsent() || {analytics:false,external:false};
    const a = document.getElementById('bs-consent-analytics');
    const e = document.getElementById('bs-consent-external');
    if(a) a.checked = !!current.analytics;
    if(e) e.checked = !!current.external;
    const modal = document.getElementById('bs-consent-modal');
    if(modal){ modal.hidden=false; setTimeout(()=>{ const first=modal.querySelector('input,button,a'); if(first) first.focus(); },0); }
  }

  function createUi(){
    const banner = document.createElement('div');
    banner.id = 'bs-consent-banner';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Datenschutz-Einstellungen');
    banner.hidden = true;
    banner.innerHTML = '<div class="bs-consent-banner-inner"><div class="bs-consent-copy"><strong>Datenschutz-Einstellungen</strong>Wir verwenden notwendige Speicherungen für Ihre Datenschutzauswahl. Optionale Statistik und externe Inhalte werden nur mit Ihrer Zustimmung aktiviert. <a href="datenschutz.html">Mehr erfahren</a>.</div><div class="bs-consent-actions"><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="necessary">Alle ablehnen</button><button class="bs-consent-btn" type="button" data-bs-consent="settings">Einstellungen</button><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="all">Alle akzeptieren</button></div></div>';
    document.body.appendChild(banner);

    const modal = document.createElement('div');
    modal.id = 'bs-consent-modal';
    modal.hidden = true;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','bs-consent-title');
    modal.innerHTML = '<div class="bs-consent-panel"><h2 id="bs-consent-title">Datenschutz-Einstellungen</h2><p class="bs-consent-panel-intro">Sie entscheiden, welche optionalen Dienste auf dieser Website aktiviert werden. Notwendige Funktionen bleiben immer aktiv.</p><div class="bs-consent-row"><div><h3>Notwendig</h3><p>Speichert ausschließlich Ihre Datenschutzauswahl und ermöglicht technisch erforderliche Funktionen.</p></div><span class="bs-consent-status">Immer aktiv</span></div><div class="bs-consent-row"><div><h3>Statistik / Analyse</h3><p>Google Analytics hilft uns zu verstehen, welche Seiten genutzt werden. Google Analytics wird erst nach Ihrer Zustimmung geladen.</p></div><label class="bs-consent-switch" aria-label="Statistik und Analyse"><input id="bs-consent-analytics" type="checkbox"><span class="bs-consent-slider"></span></label></div><div class="bs-consent-row"><div><h3>Externe Inhalte</h3><p>Erlaubt das Nachladen eingebetteter externer Inhalte, derzeit Google Maps auf der Startseite.</p></div><label class="bs-consent-switch" aria-label="Externe Inhalte"><input id="bs-consent-external" type="checkbox"><span class="bs-consent-slider"></span></label></div><div class="bs-consent-panel-actions"><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="necessary">Alle ablehnen</button><button class="bs-consent-btn" type="button" data-bs-consent="save">Auswahl speichern</button><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="all">Alle akzeptieren</button></div><a class="bs-consent-panel-link" href="datenschutz.html">Datenschutzerklärung öffnen</a></div>';
    document.body.appendChild(modal);

    const footer = document.querySelector('footer');
    if(footer){
      const wrap = document.createElement('div');
      wrap.className='bs-privacy-settings-wrap';
      wrap.innerHTML='<button class="bs-privacy-settings" type="button" data-bs-consent="settings">Datenschutz-Einstellungen</button>';
      footer.appendChild(wrap);
    }
  }


  /* Sprachspezifische Beschriftungen ohne Änderung der bestehenden Consent-Logik */
  function localizeConsentUi(){
    const l=(document.documentElement.getAttribute('lang')||'de').toLowerCase();
    const t={"en":["Privacy settings","We use essential local storage to remember your privacy choice. Optional analytics and external content are enabled only with your consent.","Learn more","Reject all","Settings","Accept all","Choose which optional services may be enabled. Essential functions remain active.","Essential","Stores your privacy choice and provides technically necessary functions only.","Always active","Statistics / Analytics","Google Analytics shows us which pages are used. It is loaded only with your consent.","External content","Allows embedded external content, currently Google Maps on the German home page.","Save selection","Open privacy policy"],"tr":["Gizlilik ayarları","Gizlilik seçiminizi saklamak için gerekli yerel depolamayı kullanırız. İsteğe bağlı analiz ve dış içerikler yalnızca izninizle açılır.","Daha fazla bilgi","Tümünü reddet","Ayarlar","Tümünü kabul et","İsteğe bağlı hizmetlerden hangilerine izin vereceğinizi seçin. Gerekli işlevler her zaman açıktır.","Gerekli","Yalnızca gizlilik seçiminizi saklar ve teknik olarak gerekli işlevleri sağlar.","Her zaman açık","İstatistik / Analiz","Google Analytics hangi sayfaların kullanıldığını anlamamıza yardımcı olur. Yalnızca izninizle yüklenir.","Dış içerikler","Gömülü dış içeriklerin yüklenmesine izin verir; şu anda Almanca ana sayfada Google Maps.","Seçimi kaydet","Gizlilik politikasını aç"],"ro":["Setări de confidențialitate","Folosim stocarea locală necesară pentru a memora alegerea ta. Analiza opțională și conținutul extern se activează doar cu acordul tău.","Mai multe detalii","Respinge toate","Setări","Acceptă toate","Alege serviciile opționale pe care le permiți. Funcțiile necesare rămân mereu active.","Necesare","Memorează doar alegerea și asigură funcțiile tehnice necesare.","Mereu active","Statistici / Analiză","Google Analytics ne ajută să vedem ce pagini sunt utilizate. Se încarcă doar cu acordul tău.","Conținut extern","Permite încărcarea conținutului extern integrat, în prezent Google Maps pe pagina principală germană.","Salvează alegerea","Deschide politica de confidențialitate"]}[l];
    if(!t) return; // Deutsch bleibt komplett unverändert.
    const b=document.getElementById('bs-consent-banner');
    const m=document.getElementById('bs-consent-modal');
    if(!b||!m)return;
    const e=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const privacy='/'+l+'/datenschutz';
    b.setAttribute('aria-label',t[0]);
    b.innerHTML='<div class="bs-consent-banner-inner"><div class="bs-consent-copy"><strong>'+e(t[0])+'</strong>'+e(t[1])+' <a href="'+privacy+'">'+e(t[2])+'</a>.</div><div class="bs-consent-actions"><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="necessary">'+e(t[3])+'</button><button class="bs-consent-btn" type="button" data-bs-consent="settings">'+e(t[4])+'</button><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="all">'+e(t[5])+'</button></div></div>';
    m.innerHTML='<div class="bs-consent-panel"><h2 id="bs-consent-title">'+e(t[0])+'</h2><p class="bs-consent-panel-intro">'+e(t[6])+'</p><div class="bs-consent-row"><div><h3>'+e(t[7])+'</h3><p>'+e(t[8])+'</p></div><span class="bs-consent-status">'+e(t[9])+'</span></div><div class="bs-consent-row"><div><h3>'+e(t[10])+'</h3><p>'+e(t[11])+'</p></div><label class="bs-consent-switch" aria-label="'+e(t[10])+'"><input id="bs-consent-analytics" type="checkbox"><span class="bs-consent-slider"></span></label></div><div class="bs-consent-row"><div><h3>'+e(t[12])+'</h3><p>'+e(t[13])+'</p></div><label class="bs-consent-switch" aria-label="'+e(t[12])+'"><input id="bs-consent-external" type="checkbox"><span class="bs-consent-slider"></span></label></div><div class="bs-consent-panel-actions"><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="necessary">'+e(t[3])+'</button><button class="bs-consent-btn" type="button" data-bs-consent="save">'+e(t[14])+'</button><button class="bs-consent-btn bs-consent-btn-primary" type="button" data-bs-consent="all">'+e(t[5])+'</button></div><a class="bs-consent-panel-link" href="'+privacy+'">'+e(t[15])+'</a></div>';
    document.querySelectorAll('button.bs-privacy-settings').forEach(x=>{x.textContent=t[0]});
  }

  function applyChoiceAndClose(next){
    const current = readConsent();
    const needsReload = !!(current && ((current.analytics && !next.analytics) || (current.external && !next.external)));
    saveConsent(next);
    hideBanner();
    closeSettings();
    if(needsReload) window.location.reload();
  }


  function trackContactEvent(eventName){
    const consent = readConsent();
    if(!consent || !consent.analytics || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, {
      contact_method: eventName.replace('click_',''),
      page_path: window.location.pathname,
      page_title: document.title
    });
  }

  function bindContactTracking(){
    document.addEventListener('click', function(ev){
      const link = ev.target.closest('a[href]');
      if(!link) return;

      const rawHref = (link.getAttribute('href') || '').trim();
      let eventName = null;

      if(/^mailto:/i.test(rawHref)){
        eventName = 'click_email';
      }else if(/^tel:/i.test(rawHref)){
        eventName = 'click_phone';
      }else{
        try{
          const url = new URL(link.href, window.location.href);
          const host = url.hostname.toLowerCase().replace(/^www\./,'');
          if(host === 'wa.me' || host === 'whatsapp.com' || host.endsWith('.whatsapp.com')){
            eventName = 'click_whatsapp';
          }else if(host === 'cal.com' || host.endsWith('.cal.com')){
            eventName = 'click_cal';
          }
        }catch(e){}
      }

      if(eventName) trackContactEvent(eventName);
    }, true);
  }

  function bindUi(){
    document.addEventListener('click',function(ev){
      const btn = ev.target.closest('[data-bs-consent]');
      if(!btn) return;
      const action = btn.getAttribute('data-bs-consent');
      if(action === 'all'){
        applyChoiceAndClose({analytics:true,external:true});
      }else if(action === 'necessary'){
        applyChoiceAndClose({analytics:false,external:false});
      }else if(action === 'settings'){
        openSettings();
      }else if(action === 'save'){
        const a=document.getElementById('bs-consent-analytics');
        const e=document.getElementById('bs-consent-external');
        applyChoiceAndClose({analytics:!!(a&&a.checked),external:!!(e&&e.checked)});
      }
    });

    document.addEventListener('keydown',function(ev){
      if(ev.key === 'Escape') closeSettings();
    });

    const mapButton = document.getElementById('loadMapBtn');
    if(mapButton){
      mapButton.addEventListener('click',function(){
        const current=readConsent() || {analytics:false,external:false};
        saveConsent({analytics:!!current.analytics,external:true});
        hideBanner();
        loadGoogleMap();
      });
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    createUi();
    localizeConsentUi();
    bindUi();
    bindContactTracking();
    const consent = readConsent();
    if(consent){ applyConsent(consent); }
    else{ showBanner(); }
  });
})();
