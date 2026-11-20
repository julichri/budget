'use strict';
if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Service worker',e)));
(function importConfigFromHash(){
  try{
    var m=/^#cfg=([A-Za-z0-9_-]+)$/.exec(location.hash||'');
    if(!m)return;
    var b64=m[1].replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
    var cfg=JSON.parse(decodeURIComponent(escape(atob(b64))));
    var url=String(cfg.u||'').trim().replace(/\/$/,''),key=String(cfg.k||'').trim(),code=String(cfg.c||'').trim();
    try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}
    if(!/^https:\/\//i.test(url)||!key||!code||code==='FOYER_TEST')return;
    if(settings.url&&(settings.url!==url||settings.code!==code)&&!confirm('Remplacer la configuration Supabase de cet appareil par celle du QR code ?'))return;
    settings={url:url,key:key,code:code};
    localStorage.setItem('budgetSettings',JSON.stringify(settings));
    setTimeout(function(){if(typeof toast==='function')toast('Configuration Supabase importée depuis le QR code')},800);
  }catch(e){console.warn('Configuration QR invalide',e)}
})();
if(settings.url&&settings.key&&settings.code&&window.supabase){try{client=window.supabase.createClient(settings.url,settings.key);repository=makeRepository(client,settings.code)}catch(e){showConnection('Configuration Supabase invalide.','error')}}load();
