function validDateKey(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return false;let [y,m,d]=s.split('-').map(Number),x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d}
function realTodayKey(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function getToday(){let k=testMode&&validDateKey(testDateKey)?testDateKey:realTodayKey(),[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)}
function dateInputToday(){let d=getToday();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fresh(){return {expenses:[],incomes:[],reimbursements:{},realBalances:{}}}
function cleanMonthState(state){const copy=structuredClone(state||fresh()),legacyKeys=['start'+'Date','end'+'Date','start','end','date'+'_debut','date'+'_fin','start'+'_date','end'+'_date'];const clean=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(clean);return}for(const key of legacyKeys)delete value[key];Object.values(value).forEach(clean)};clean(copy);return copy}
function newId(){return globalThis.crypto?.randomUUID?.()||`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}
function esc(s){return String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
function eur(n){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0)}
function monthName(k){let [y,m]=k.split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(y,m-1,1))}
function migrateExpense(e,key){
 if(typeof e.owner==='string'){let ownerKey=e.owner.toLocaleLowerCase('fr');if(ownerKey==='julien')e.owner='Julien';else if(ownerKey==='carla')e.owner='Carla';else if(ownerKey==='commun')e.owner='Commun'}
 if(typeof e.payer==='string'){let payerKey=e.payer.toLocaleLowerCase('fr');if(payerKey==='julien')e.payer='J';else if(payerKey==='carla')e.payer='C'}
 if(!e.mode)e.mode='Unique';
 if(!e.payments||typeof e.payments!=='object')e.payments={};
 if(e.owner===undefined){if(e.split==='COM'){e.owner='Commun';e.shareJulien=Math.round(ratioForIncomes(data?.incomes)*10000)/100}else if(e.split==='50/50'){e.owner='Commun';e.shareJulien=50}else if(e.split==='J'){e.owner='Julien';e.shareJulien=100}else{e.owner='Carla';e.shareJulien=0}}
 if(e.shareJulien===undefined&&e.owner==='Commun')e.shareJulien=50;
 if(e.owner==='Commun'&&e.shareMode===undefined){let defaultShare=Math.round(ratioForIncomes(data?.incomes,key)*100);e.shareMode=e.split==='50/50'?'custom':(e.split==='COM'||Math.round(Number(e.shareJulien))===defaultShare?'prorata':'custom')}
 if(e.owner==='Commun'&&e.settlementMode===undefined)e.settlementMode='avance';
 if(e.payer===undefined)e.payer=e.owner==='Carla'?'C':'J';
 for(const month in e.payments)if(Array.isArray(e.payments[month]))e.payments[month]=e.payments[month].map(p=>({...p,payer:p.payer==='C'?'C':p.payer==='J'?'J':e.payer}));
 if(e.day===undefined)e.day='';
 if(e.dayJulien===undefined)e.dayJulien=e.day||'';
 if(e.dayCarla===undefined)e.dayCarla=e.day||'';
 if(e.paidJulien===undefined)e.paidJulien=false;
 if(e.paidCarla===undefined)e.paidCarla=false;
 if(!e.paidMonths||typeof e.paidMonths!=='object')e.paidMonths={[key]:!!e.paid};
 return e
}
function activeIncomeInMonth(i,k=monthKey){return !(i?.autoHousingAdjustment||i?.name==='Ajustement frais logement')}
function ratioForIncomes(incomes,k=monthKey){let counted=(incomes||[]).filter(x=>!x.autoHousingAdjustment&&x.name!=='Ajustement frais logement'&&x.includeInSplit!==false&&activeIncomeInMonth(x,k)),j=counted.filter(x=>x.person==='J').reduce((a,x)=>a+(Number(x.amount)||0),0),c=counted.filter(x=>x.person==='C').reduce((a,x)=>a+(Number(x.amount)||0),0);return j+c?j/(j+c):.5}
function migrateMonth(obj,key){if(!obj||!Array.isArray(obj.expenses))return obj;obj=cleanMonthState(obj);data=obj;if(!Array.isArray(obj.incomes))obj.incomes=[];obj.incomes=obj.incomes.filter(i=>!i.autoHousingAdjustment&&i.name!=='Ajustement frais logement');obj.incomes.forEach(i=>{if(i.includeInSplit===undefined)i.includeInSplit=true});if(!obj.logement||typeof obj.logement!=='object')obj.logement={};obj.logement={habite:obj.logement.habite==='carla'?'carla':'julien',mode:obj.logement.mode==='egal'?'egal':'prorata',julien:{depenses:Array.isArray(obj.logement.julien?.depenses)?obj.logement.julien.depenses:[],recettes:Array.isArray(obj.logement.julien?.recettes)?obj.logement.julien.recettes:[]},carla:{depenses:Array.isArray(obj.logement.carla?.depenses)?obj.logement.carla.depenses:[],recettes:Array.isArray(obj.logement.carla?.recettes)?obj.logement.carla.recettes:[]}};if(obj.currentBalanceJulien==null&&obj.currentBalance!==undefined&&obj.currentBalance!==null&&obj.currentBalance!=='')obj.currentBalanceJulien=obj.currentBalance;if(obj.currentBalanceJulien===undefined)obj.currentBalanceJulien=null;if(obj.currentBalanceCarla===undefined)obj.currentBalanceCarla=null;delete obj.currentBalance;if(!obj.realBalances||typeof obj.realBalances!=='object')obj.realBalances={};if(!Array.isArray(obj.balanceAdjustments))obj.balanceAdjustments=[];obj.balanceAdjustments=obj.balanceAdjustments.filter(a=>a&&validDateKey(a.date)&&['J','C'].includes(a.person)&&Number.isFinite(Number(a.amount)));if(/^\d{4}-\d{2}-\d{2}$/.test(obj.currentBalanceDate||''))obj.realBalances[obj.currentBalanceDate]={...(obj.realBalances[obj.currentBalanceDate]||{}),J:obj.currentBalanceJulien??null,C:obj.currentBalanceCarla??null};obj.expenses=obj.expenses.filter(e=>!isHousingAdjustment(e));obj.expenses.forEach(e=>migrateExpense(e,key));return obj}
let pendingLoads=0;
function setLoading(on){const el=document.getElementById('loadingIndicator');if(el)el.hidden=!on;document.body?.classList.toggle('is-loading',!!on)}
async function load(){pendingLoads++;setLoading(true);try{await loadData()}finally{pendingLoads=Math.max(0,pendingLoads-1);if(!pendingLoads)setLoading(false)}}
async function loadData(){
 const generation=++loadGeneration;
 if(testMode){data=testMonthData.has(monthKey)?structuredClone(testMonthData.get(monthKey)):fresh();migrateMonth(data,monthKey);const opening=await resolveMonthOpeningBalances(monthKey);if(generation!==loadGeneration)return;data.openingBalances=opening;syncModeBanner();document.getElementById('monthLabel').textContent=monthName(monthKey);render();return}
 try{
  if(repository){const loaded=await repository.loadState(monthKey);if(generation!==loadGeneration)return;data=loaded;migrateMonth(data,monthKey);const opening=await resolveMonthOpeningBalances(monthKey);if(generation!==loadGeneration)return;data.openingBalances=opening}
  else {data=fresh();migrateMonth(data,monthKey);data.openingBalances={J:0,C:0};showConnection('Non connecté - configurez Supabase dans Réglages','warn')}
 }catch(err){if(generation!==loadGeneration)return;console.error(err);data=fresh();migrateMonth(data,monthKey);data.openingBalances={J:0,C:0};repository=null;showConnection('Non connecté - configurez Supabase dans Réglages','error')}
 if(generation!==loadGeneration)return;
 document.getElementById('monthLabel').textContent=monthName(monthKey);render()
}
function save(){
 if(data)recalculateBalanceAdjustments();
 if(testMode){if(data)testMonthData.set(monthKey,cleanMonthState(data));syncModeBanner();return}
 if(!repository){showConnection('Non sauvegardé : configurez Supabase dans Réglages.','warn');return}
 const snapshot=cleanMonthState(data),key=monthKey;
 saveQueue=saveQueue.catch(()=>{}).then(()=>repository.saveState(snapshot,key));saveQueue.then(()=>showConnection('Synchronisé avec Supabase · '+new Date().toLocaleTimeString('fr-FR'),'ok')).catch(err=>{console.error(err);showConnection('Erreur d’écriture Supabase : '+(err.message||'réseau ou permissions')+'. Modifications conservées en mémoire.','error')})
}
function showConnection(message,kind='warn'){let el=document.getElementById('connectionBanner');if(!el)return;el.textContent=message;el.style.display=message?'block':'none';el.dataset.kind=kind}
function syncModeBanner(){let el=document.getElementById('testBanner');if(el)el.style.display=testMode?'block':'none'}
function persistSettings(){let saved={...settings};if(testMode){let prior=localStorage.getItem('foyerAvantTest');if(prior!==null)saved.code=prior;else delete saved.code}if(saved.code==='FOYER_TEST')delete saved.code;localStorage.setItem('budgetSettings',JSON.stringify(saved))}
function setTestMode(on){on=!!on;if(on===testMode)return;loadGeneration++;if(on){let realCode=settings.code==='FOYER_TEST'?(localStorage.getItem('foyerAvantTest')||''):(settings.code??'');localStorage.setItem('foyerAvantTest',realCode);testMode=true;settings.code='FOYER_TEST';repository=client?makeRepository(client,'FOYER_TEST'):null;installTestDemoData();let d=getToday();monthKey=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;data=structuredClone(testMonthData.get(monthKey)||fresh());migrateMonth(data,monthKey);syncModeBanner();render();toast('Mode test activé : données fictives chargées, aucune donnée réelle n’est modifiée')}else{testMode=false;let prior=localStorage.getItem('foyerAvantTest');if(prior!==null){settings.code=prior;localStorage.removeItem('foyerAvantTest')}else if(settings.code==='FOYER_TEST'){delete settings.code}persistSettings();repository=client&&settings.code?makeRepository(client,settings.code):null;testDateKey='';localStorage.removeItem('budgetTestDate');let d=getToday();monthKey=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;syncModeBanner();load()}}
