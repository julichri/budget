'use strict';
document.getElementById('prev').onclick=()=>moveMonth(-1);document.getElementById('next').onclick=()=>moveMonth(1);function moveMonth(delta){let [y,m]=monthKey.split('-').map(Number);let d=new Date(y,m-1+delta,1);monthKey=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;load()}document.getElementById('fab').onclick=()=>tab==='income'?incomeModal():expenseModal();
function recurrenceOccurs(item,targetMonth,sourceMonth=''){
 const frequency=Number(item?.recurrence)||0;
 if(!Number.isInteger(frequency)||frequency<1)return false;
 const start=/^\d{4}-\d{2}$/.test(item.recurrenceStart||'')?item.recurrenceStart:sourceMonth;
 if(!/^\d{4}-\d{2}$/.test(start)||targetMonth<start)return false;
 const [sy,sm]=start.split('-').map(Number),[ty,tm]=targetMonth.split('-').map(Number);
 const elapsed=(ty-sy)*12+(tm-sm);
 return elapsed>=0&&elapsed%frequency===0;
 }
function makeRepository(sb,homeCode){
 const db=sb,home=homeCode;
 const check=async q=>{const r=await q;if(r.error)throw r.error;return r.data};
 async function loadState(month){
  const row=await check(db.from('budget_months').select('state_meta,data,income_receipts').eq('home_code',home).eq('month_key',month).maybeSingle());
  const snapshot=row?.data;
  // Un mois existant est strictement conservé. Les mois absents démarrent avec
  // uniquement les éléments récurrents dont l’échéance tombe ce mois-ci.
  if(snapshot&&Array.isArray(snapshot.expenses)&&Array.isArray(snapshot.incomes)){
   for(const [id,status] of Object.entries(row?.income_receipts||{})){const income=snapshot.incomes.find(i=>String(i.id)===String(id));if(!income)continue;income.receivedMonths={...(income.receivedMonths||{}),[month]:!!status.received};income.receivedDates={...(income.receivedDates||{})};income.dayOverrides={...(income.dayOverrides||{})};if(status.date)income.receivedDates[month]=status.date;else delete income.receivedDates[month];if(status.day!=null)income.dayOverrides[month]=status.day;else delete income.dayOverrides[month]}
   return cleanMonthState(snapshot)
  }
  if(row)return fresh();
  const created=fresh();
  const history=await check(db.from('budget_months').select('month_key,data').eq('home_code',home).lt('month_key',month).order('month_key',{ascending:false}));
  const newestByKind={expenses:new Map(),incomes:new Map()};
  for(const row of history||[]){
   const state=row?.data;
   for(const kind of ['expenses','incomes'])for(const item of state?.[kind]||[]){
    const id=String(item?.id??'');
    if(!id||newestByKind[kind].has(id)||!recurrenceOccurs(item,month,row.month_key))continue;
    newestByKind[kind].set(id,{item,sourceMonth:row.month_key});
   }
  }
  for(const kind of ['expenses','incomes'])for(const {item,sourceMonth} of newestByKind[kind].values()){
   const copy=structuredClone(item);
   if(kind==='expenses'){
    if(isHousingAdjustment(copy)||copy.autoHousingAdjustment||copy.autoAccountOperation||copy.accountOperation||copy.debtRepayment)continue;
    copy.paid=false;copy.paidMonths={[month]:false};copy.paidDates={};copy.dayOverrides={};copy.paidDatesJulien={};copy.paidDatesCarla={};copy.dayOverridesJulien={};copy.dayOverridesCarla={};copy.paidJulien=false;copy.paidCarla=false;copy.payments={};
    if(copy.paidDate&&String(copy.paidDate).startsWith(sourceMonth+'-'))delete copy.paidDate;
   }else{
    if(copy.autoHousingAdjustment||copy.name==='Ajustement frais logement')continue;
    copy.receivedMonths={[month]:false};copy.receivedDates={};copy.dayOverrides={};
   }
   if(copy.variableAmount)copy.amountEstimated=true;else delete copy.amountEstimated;
   created[kind].push(copy);
  }
  await saveState(created,month);
  return cleanMonthState(created);
 }
 async function saveRealBalance(date,person,value){
  const personne=person==='J'?'julien':'carla';
  await check(db.from('soldes_reels').upsert([{home_code:home,personne,date_solde:date,montant:value}],{onConflict:'home_code,personne,date_solde'}));
 }
 async function saveState(state,month){
  await check(db.from('foyers').upsert([{code:home,nom:home}],{onConflict:'code'}));
  const meta={...state};delete meta.incomes;delete meta.expenses;delete meta.realBalances;delete meta.reimbursements;
  // Le snapshot complet (et sa clé month_key) rend les montants strictement propres au mois.
  const income_receipts=Object.fromEntries((state.incomes||[]).filter(i=>!i.autoHousingAdjustment&&i.name!=='Ajustement frais logement').map(i=>[String(i.id),{received:!!i.receivedMonths?.[month],date:i.receivedDates?.[month]||null,day:i.dayOverrides?.[month]??null}]));
  await check(db.from('budget_months').upsert([{home_code:home,month_key:month,month,data:structuredClone(state),state_meta:meta,income_receipts}],{onConflict:'home_code,month_key'}));
 }
 return {loadState,saveState,saveRealBalance};
}
function validDay(x){let n=Number(x);return Number.isInteger(n)&&n>=1&&n<=31?n:null}
async function connectSupabase(){
 settings={url:document.getElementById('sbUrl')?.value.trim().replace(/\/$/, '')||settings.url,key:document.getElementById('sbKey')?.value.trim()||settings.key,code:testMode?'FOYER_TEST':(document.getElementById('homeCode')?.value.trim()||settings.code)};
 if(!settings.url||!settings.key||!settings.code){toast('Complétez URL, clé publique et code de foyer');return}
 try{persistSettings();if(!window.supabase)throw new Error('Librairie indisponible. Vérifiez Internet.');client=window.supabase.createClient(settings.url,settings.key);repository=makeRepository(client,settings.code);showConnection('Connexion…','warn');await load();const status=document.getElementById('syncStatus');if(status)status.textContent='Connecté · foyer '+settings.code;toast('Connexion Supabase réussie')}
 catch(err){repository=null;showConnection('Connexion/chargement impossible : '+(err.message||'vérifiez SQL, réseau et RLS.'),'error');toast('Erreur Supabase : '+(err.message||'voir le message'))}
}
function localLegacyMonths(){let raw=JSON.parse(localStorage.getItem('budgetApp')||'{}');return Object.entries(raw).filter(([k,v])=>/^\d{4}-\d{2}$/.test(k)&&v&&typeof v==='object').sort(([a],[b])=>a.localeCompare(b))}
async function importLocalData(){if(localStorage.getItem('budgetImported:'+settings.code)){toast('Import local déjà effectué pour ce foyer');return}if(!repository||!client){toast('Connectez d’abord Supabase');return}if(testMode){toast('Import désactivé en mode test');return}let months;try{months=localLegacyMonths()}catch(e){toast('Données locales illisibles');return}if(!months.length){toast('Aucune donnée locale à importer');return}if(!confirm(`Importer ${months.length} mois de données locales dans le foyer ${settings.code} ? Cette action écrira dans Supabase.`))return;try{for(const [mk,raw] of months){let imported=migrateMonth(structuredClone(raw),mk);await repository.saveState(imported,mk)}localStorage.setItem('budgetImported:'+settings.code,new Date().toISOString());await load();toast(`Import terminé : ${months.length} mois`)}catch(err){showConnection('Import interrompu : '+(err.message||'erreur réseau/policy')+'. Les mois déjà traités restent importés.','error');toast('Import incomplet — voir le message')}}

function exportMonth(){let blob=new Blob([JSON.stringify({month:monthKey,...data},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`budget-${monthKey}.json`;a.click();URL.revokeObjectURL(a.href)}