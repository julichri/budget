'use strict';
document.getElementById('prev').onclick=()=>moveMonth(-1);document.getElementById('next').onclick=()=>moveMonth(1);function moveMonth(delta){let [y,m]=monthKey.split('-').map(Number);let d=new Date(y,m-1+delta,1);monthKey=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;load()}document.getElementById('fab').onclick=()=>tab==='income'?incomeModal():expenseModal();
async function copyPrevious(){
 if(!testMode&&!repository){toast('Connectez Supabase avant de copier un mois');return}
 const [y,m]=monthKey.split('-').map(Number),d=new Date(y,m-2,1),prev=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,target=monthKey;
 try{
  const prior=testMode?(testMonthData.has(prev)?cleanMonthState(testMonthData.get(prev)):fresh()):await repository.loadState(prev);
  if(!prior||(!(prior.expenses||[]).length&&!(prior.incomes||[]).length&&!(prior.reimbursements?.[prev]||[]).length&&!(prior.realBalances&&Object.keys(prior.realBalances).length))){toast(`Aucune donnée trouvée pour ${monthName(prev)}`);return}
  const existing=testMode?(testMonthData.has(target)?cleanMonthState(testMonthData.get(target)):fresh()):await repository.loadState(target);
  const targetHasData=!!(existing&&((existing.expenses||[]).length||(existing.incomes||[]).length||(existing.reimbursements?.[target]||[]).length||(existing.realBalances&&Object.keys(existing.realBalances).length)||Object.keys(existing).some(key=>!['expenses','incomes','reimbursements','realBalances','currentBalanceJulien','currentBalanceCarla','currentBalanceDate'].includes(key))));
  if(targetHasData&&!confirm(`Le mois ${monthName(target)} contient déjà des données. Les remplacer entièrement par celles de ${monthName(prev)} ?`))return;
  const next=cleanMonthState(prior),shiftDate=value=>{const key=dateKey(value);if(!key||!key.startsWith(prev+'-'))return value;const day=Math.min(Number(key.slice(8,10)),new Date(Number(target.slice(0,4)),Number(target.slice(5,7)),0).getDate());return `${target}-${String(day).padStart(2,'0')}`};
  const copyMonthMap=(map,dateValues=false)=>{if(!map||typeof map!=='object'||Array.isArray(map))return {};if(!Object.prototype.hasOwnProperty.call(map,prev))return {};const value=map[prev];return {[target]:dateValues?shiftDate(value):structuredClone(value)}};
  next.expenses=(next.expenses||[]).filter(e=>!isHousingAdjustment(e)&&!e.autoAccountOperation&&!e.accountOperation).map(e=>{
   const x={...e};
   for(const field of ['paidMonths','paidDates','dayOverrides','paidDatesJulien','paidDatesCarla','dayOverridesJulien','dayOverridesCarla','reimbursedMonths'])x[field]=copyMonthMap(e[field],field==='paidDates'||field==='paidDatesJulien'||field==='paidDatesCarla');
   // The copied expense is a fresh forecast: discard completed single/partial payments and their actual dates.
   x.paidMonths={[target]:false};x.paid=false;x.paidDates={};x.dayOverrides={};x.paidDatesJulien={};x.paidDatesCarla={};x.dayOverridesJulien={};x.dayOverridesCarla={};
   x.payments={};if(e.paidJulien!==undefined)x.paidJulien=false;if(e.paidCarla!==undefined)x.paidCarla=false;
   if(e.paidDate&&String(e.paidDate).startsWith(prev+'-'))delete x.paidDate;
   if(e.reimbursementDate)x.reimbursementDate=shiftDate(e.reimbursementDate);
   return x;
  });
  next.incomes=(next.incomes||[]).map(i=>{const x={...i};for(const field of ['receivedDays','receivedDates','receivedDatesByDay','receivedMonths','dayOverrides'])x[field]=copyMonthMap(i[field],field==='receivedDates');for(const field of ['receivedDays','receivedDates','receivedDatesByDay','dayOverrides'])delete x[field][target];x.receivedMonths={[target]:false};return x});
  next.realBalances={};next.balanceAdjustments=[];for(const [date,values] of Object.entries(prior.realBalances||{}))if(date.startsWith(prev+'-'))next.realBalances[shiftDate(date)]=structuredClone(values);
  const balanceDates=Object.keys(next.realBalances).sort(),latestBalance=balanceDates.at(-1);next.currentBalanceDate=latestBalance||null;next.currentBalanceJulien=latestBalance?next.realBalances[latestBalance].J??null:null;next.currentBalanceCarla=latestBalance?next.realBalances[latestBalance].C??null:null;
  next.reimbursements={};if(Array.isArray(prior.reimbursements?.[prev]))next.reimbursements[target]=prior.reimbursements[prev].map(r=>({...r,date:shiftDate(r.date),reimbursedMonths:copyMonthMap(r.reimbursedMonths)}));
  next.autoHousingPaidMonths={};
  if(testMode){data=next;migrateMonth(data,target);testMonthData.set(target,structuredClone(data));render();toast('Mois précédent copié (mode test, non sauvegardé)');return}
  saveQueue=saveQueue.catch(()=>{}).then(()=>repository.saveState(next,target));
  await saveQueue;
  if(target!==monthKey)return;
  data=next;migrateMonth(data,target);render();toast('Mois précédent copié et enregistré dans Supabase');
 }catch(err){console.error(err);toast('Impossible de copier : '+(err.message||'erreur Supabase'))}
}
function makeRepository(sb,homeCode){
 const db=sb,home=homeCode;
 const check=async q=>{const r=await q;if(r.error)throw r.error;return r.data};
 async function loadState(month){
  const row=await check(db.from('budget_months').select('state_meta,data,income_receipts').eq('home_code',home).eq('month_key',month).maybeSingle());
  const snapshot=row?.data;
  // Chaque snapshot est la source de vérité mensuelle. Ne jamais reconstruire un mois
  // absent depuis les tables de revenus/dépenses partagées à l’échelle du foyer.
  if(snapshot&&Array.isArray(snapshot.expenses)&&Array.isArray(snapshot.incomes)){
   for(const [id,status] of Object.entries(row?.income_receipts||{})){const income=snapshot.incomes.find(i=>String(i.id)===String(id));if(!income)continue;income.receivedMonths={...(income.receivedMonths||{}),[month]:!!status.received};income.receivedDates={...(income.receivedDates||{})};income.dayOverrides={...(income.dayOverrides||{})};if(status.date)income.receivedDates[month]=status.date;else delete income.receivedDates[month];if(status.day!=null)income.dayOverrides[month]=status.day;else delete income.dayOverrides[month]}
   return cleanMonthState(snapshot)
  }
  return fresh();
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
