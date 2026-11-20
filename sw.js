const CACHE='a-deux-budget-reorganise-v24';
const SHELL=['./','./index.html','./manifest.json','./css/base.css','./css/overrides/01-test-mode.css','./css/overrides/02-tracking-chart.css','./css/overrides/03-home-expense-summary.css','./css/overrides/04-expense-controls.css','./css/overrides/05-chart-ledger.css','./css/overrides/06-tracking-mobile.css','./css/overrides/07-loading-actions.css','./js/core/constants.js','./js/core/state-storage-functions.js','./js/core/app-state.js','./js/core/expense-calculations.js','./js/core/account-evolution.js','./js/views/render.js','./js/views/modals.js','./js/core/data-actions.js','./js/app.js','./js/ui-compat.js','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 const isAppDocument=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/';
 event.respondWith((async()=>{
  if(isAppDocument){
   try{
    const response=await fetch(event.request);
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
    return response;
   }catch(error){return (await caches.match(event.request))||(await caches.match('./index.html'))}
  }
  const cached=await caches.match(event.request);
  if(cached)return cached;
  try{
   const response=await fetch(event.request);
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
   return response;
  }catch(error){return caches.match('./index.html')}
 })());
});
