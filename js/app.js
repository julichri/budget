'use strict';
if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Service worker',e)));
if(settings.url&&settings.key&&settings.code&&window.supabase){try{client=window.supabase.createClient(settings.url,settings.key);repository=makeRepository(client,settings.code)}catch(e){showConnection('Configuration Supabase invalide.','error')}}load();
