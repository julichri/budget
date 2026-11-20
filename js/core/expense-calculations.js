'use strict';
function valIncome(p,k=monthKey){return (data.incomes||[]).filter(x=>!x.autoHousingAdjustment&&x.name!=='Ajustement frais logement'&&x.person===p&&activeIncomeInMonth(x,k)).reduce((s,x)=>s+Number(x.amount||0),0)}
function ratio(k=monthKey){return ratioForIncomes(data?.incomes,k)}
function monthBounds(k=monthKey){let [y,m]=k.split('-').map(Number);return [`${y}-${String(m).padStart(2,'0')}-01`,`${y}-${String(m).padStart(2,'0')}-${new Date(y,m,0).getDate()}`]}
function dateKey(value){if(value==null||value==='')return '';if(value instanceof Date)return Number.isNaN(value.getTime())?'':`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;let text=String(value).trim();if(!text)return '';let iso=text.match(/^(\d{4}-\d{2}-\d{2})/);if(iso)return iso[1];let french=text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);if(french)return `${french[3]}-${french[2].padStart(2,'0')}-${french[1].padStart(2,'0')}`;let parsed=new Date(text);return Number.isNaN(parsed.getTime())?'':parsed.toISOString().slice(0,10)}
// Utilisé par accueil, dépenses et logement : une date absente reste sans borne.
function isHousingAdjustment(e){return !!(e&&(e.autoHousingAdjustment||e.name==='Ajustement frais logement'))}
function expenseItemsForMonth(k=monthKey){const byId=new Map(),out=[];for(const e of data?.expenses||[]){if(isHousingAdjustment(e)||e.autoAccountOperation||e.accountOperation||e.debtRepayment)continue;if(e.id===undefined||e.id===null){out.push(e);continue}const id=String(e.id),prior=byId.get(id);if(!prior){byId.set(id,e);out.push(e)}else if(!String(prior.category||'').trim()&&String(e.category||'').trim())Object.assign(prior,e)}return out}
function shares(e,k=monthKey){let a=Number(e.amount)||0,owner=e.owner;if(!owner){if(e.split==='COM')owner='Commun';else if(e.split==='50/50')return[a/2,a/2];else owner=e.split==='J'?'Julien':'Carla'}if(owner==='Julien')return[a,0];if(owner==='Carla')return[0,a];let dynamic=e.shareMode==='prorata'||(e.shareMode==null&&e.shareJulien==null);let r=dynamic?ratio(k):Math.max(0,Math.min(100,Number(e.shareJulien)))/100;return[a*r,a*(1-r)]}
function isCouple(e){return e.owner==='Commun'||e.split==='COM'||e.split==='50/50'||e.split==='Commun'}
function isParts(e){return isCouple(e)&&e.settlementMode==='parts'}
function paidByPerson(e,k=monthKey){if(e.debtRepayment)return {J:0,C:0};if(isParts(e)){let sh=shares(e,k);return {J:e.paidJulien?sh[0]:0,C:e.paidCarla?sh[1]:0}}if(e.mode==='Multiple'){let out={J:0,C:0};for(const p of paymentsFor(e,k))out[p.payer==='C'||(p.payer==null&&e.payer==='C')?'C':'J']+=Math.max(0,Number(p.amount)||0);return out}if(e.paidMonths&&e.paidMonths[k]!==undefined?e.paidMonths[k]:e.paid){let amount=Number(e.amount)||0;return e.payer==='C'?{J:0,C:amount}:{J:amount,C:0}}return {J:0,C:0}}
function ownPaid(e,k=monthKey,id){let by=paidByPerson(e,k);if(isParts(e))return Math.min(shares(e,k)[id==='J'?0:1],by[id]);let paid=Math.min(Number(e.amount)||0,by.J+by.C),sh=shares(e,k);return (Number(e.amount)||0)?paid*sh[id==='J'?0:1]/(Number(e.amount)||0):0}
function paymentsFor(e,k=monthKey){return Array.isArray(e.payments?.[k])?e.payments[k].filter(p=>!p.cancelled):[]}
function paidAmount(e,k=monthKey){if(isParts(e)){let by=paidByPerson(e,k);return by.J+by.C}if(e.mode==='Multiple')return paymentsFor(e,k).reduce((s,p)=>s+(Number(p.amount)||0),0);return (e.paidMonths&&e.paidMonths[k]!==undefined?e.paidMonths[k]:e.paid)?Number(e.amount)||0:0}
function payerName(p){return p==='C'?'Carla':'Julien'}
function paidEntries(e,k=monthKey){/* Ajustement logement compté comme dépense payée, pas comme revenu. */if(e.autoHousingAdjustment)return [{amount:Math.max(0,Number(e.amount)||0),payer:e.payer==='C'?'C':'J',day:e.day}];if(isParts(e)){let sh=shares(e,k);return [...(e.paidJulien?[{amount:sh[0],payer:'J',day:e.dayJulien}]:[]),...(e.paidCarla?[{amount:sh[1],payer:'C',day:e.dayCarla}]:[])]}if(e.mode==='Multiple')return paymentsFor(e,k).map(p=>({amount:Number(p.amount)||0,payer:p.payer==='C'?'C':p.payer==='J'?'J':(e.payer==='C'?'C':'J')}));return (e.paidMonths&&e.paidMonths[k]!==undefined?e.paidMonths[k]:e.paid)?[{amount:Number(e.amount)||0,payer:e.payer==='C'?'C':'J',day:e.day}]:[]}
function reimbursementSources(k=monthKey){
 const sources=[];
 for(const r of (data.reimbursements?.[k]||[]))if(!r.settlementExpenseId&&r.reimbursedMonths?.[k]!==false)sources.push({...r,sourceType:'legacy'});
 for(const e of (data.expenses||[]))if(e.debtRepayment&&e.reimbursedMonths?.[k]!==false)sources.push({id:e.id,date:e.reimbursementDate||e.day?e.reimbursementDate||`${k}-${String(e.day).padStart(2,'0')}`:'',amount:Math.abs(Number(e.amount)||0),from:e.reimbursementFrom==='C'?'C':'J',to:e.reimbursementFrom==='C'?'J':'C',sourceType:'expense'});
 return sources;
}
function settlement(k=monthKey){
 let netCents=0,details=[];
 for(const e of (data.expenses||[]).filter(x=>!isHousingAdjustment(x)&&!isParts(x)&&!x.debtRepayment&&!x.accountOperation&&!x.autoAccountOperation)){
  const amount=Math.round((Number(e.amount)||0)*100);if(!amount)continue;
  const payer=e.payer==='C'?'C':e.payer==='J'?'J':null;
  if(payer){const partnerOwner=payer==='J'?'Carla':'Julien';let cents=0;
   if(e.owner===partnerOwner)cents=Math.abs(amount);
   else if(e.owner==='Commun'&&e.settlementMode==='avance'){const sh=shares(e,k),partnerShare=payer==='J'?sh[1]:sh[0];cents=Math.round(Math.abs(partnerShare)*100)}
   if(cents){netCents+=payer==='J'?cents:-cents;details.push({id:e.id,name:e.name||'Dépense',category:String(e.category||'').trim(),from:payer==='J'?'C':'J',to:payer,payer,shareJulien:shares(e,k)[0],shareCarla:shares(e,k)[1],gross:Math.abs(Number(e.amount)||0),amount:(payer==='J'?1:-1)*cents/100})}
  }
 }
 const housingOwed=Math.round((Number(housingSplit(k).owed)||0)*100);if(housingOwed){netCents+=housingOwed;details.push({name:'Ajustement frais logement',category:'Logement',from:housingOwed>0?'C':'J',to:housingOwed>0?'J':'C',payer:'Ajustement logement',shareJulien:0,shareCarla:0,gross:Math.abs(housingOwed)/100,amount:housingOwed/100,housingAdjustment:true})}
 const payments=reimbursementSources(k);
 for(const r of payments){let cents=Math.round(Math.abs(Number(r.amount)||0)*100),signedCents=(r.from==='C'?-cents:cents);netCents+=signedCents;details.push({id:r.id,name:`Remboursement · ${r.from==='C'?'Carla':'Julien'} → ${r.to==='C'?'Carla':'Julien'}`,category:'Remboursement',from:r.from,to:r.to,payer:r.from==='C'?'C':'J',shareJulien:0,shareCarla:0,gross:cents/100,amount:signedCents/100,reimbursement:true,date:r.date||''})}
 const reimbursements=[...payments];
 return {paid:{J:0,C:0},due:{J:0,C:0},reimbursements,net:Math.round(netCents)/100,details}
}
function accountOperationsForMonth(k=monthKey){
 const calc=settlement(k),out=[];
 const make=(id,role,owner,value,group,name,operationDate='')=>{let date=String(operationDate||'').startsWith(`${k}-`)?String(operationDate):`${k}-15`,day=Number(date.slice(8,10));out.push({id:`account-operation:${k}:${id}`,name,amount:value,category:'Opération compte',owner:owner==='J'?'Julien':'Carla',shareJulien:owner==='J'?100:0,shareMode:'custom',settlementMode:'avance',payer:owner,split:owner,type:'Compte',mode:'Unique',day,paid:role.startsWith('paid-'),paidMonths:{[k]:role.startsWith('paid-')},paidDates:{[k]:date},dayOverrides:{[k]:day},operationDate:date,autoAccountOperation:true,accountOperation:true,operationRole:role,pairGroup:group,linkId:group,pairAmount:Math.abs(value),operationDirection:value<0?-1:1})};
 const paymentSources=reimbursementSources(k);
 const remaining=Math.abs(calc.net),restCreditor=calc.net>=0?'J':'C',restDebtor=restCreditor==='J'?'C':'J';
 if(paymentSources.length){paymentSources.forEach((r,i)=>{let amount=Math.round(Math.abs(Number(r.amount)||0)*100)/100,source=String(r.id||`${k}-payment-${i}`),from=r.from==='C'?'C':'J',to=from==='C'?'J':'C',group=`repayment:${source}`,date=String(r.date||'');
  /* Une source unique crée deux écritures miroir : le compte du payeur (débiteur) est débité, celui du bénéficiaire (créancier) crédité. Le destinataire est toujours l'autre personne, jamais une valeur importée qui pourrait inverser les écritures. */
  const debtorFlow=-amount,creditorFlow=amount;
  make(`${source}:paid`,'paid-debtor',from,debtorFlow,group,'Opération compte · payé',date);
  make(`${source}:received`,'paid-receiver',to,creditorFlow,group,'Opération compte · payé',date);
 });
  if(remaining>0.005){let group=`remaining:${k}`,name='Opération compte · dette restante';make('remaining:creditor','remaining-creditor',restCreditor,remaining,group,name);make('remaining:debtor','remaining-debtor',restDebtor,-remaining,group,name)}
 }else if(remaining>0.005){let group=`default:${k}`,name='Opération compte · dette restante';make('default:creditor','remaining-creditor',restCreditor,remaining,group,name);make('default:debtor','remaining-debtor',restDebtor,-remaining,group,name)}
 return out
}
function settlementSourceLines(k=monthKey,factor=1){
 const details=settlement(k).details||[];
 return details.map((d,index)=>{
  const expense=d.id===undefined?null:(data.expenses||[]).find(e=>String(e.id)===String(d.id));
  const sh=expense?shares(expense,k):[Number(d.shareJulien)||0,Number(d.shareCarla)||0];
  const payer=d.payer==='J'||d.payer==='C'?payerName(d.payer):String(d.payer||'Ajustement');
  const amountCents=Math.round((Number(d.amount)||0)*factor*100);
  return {id:d.id,component:`settlement-source:${index}`,name:d.name||'Dépense',gross:Number(d.gross)||Math.abs(Number(d.amount)||0),retained:amountCents/100,party:`Payé par ${payer}`,shares:{J:Math.round((Number(sh[0])||0)*100)/100,C:Math.round((Number(sh[1])||0)*100)/100},status:d.reimbursement?'Remboursement':d.housingAdjustment?'Ajustement calculé':expense&&isPaid(expense,k)?'Payé':'Dépense contributrice',category:d.category||''};
 });
}
function accountOperationSignedAmount(operation){const amount=Math.abs(Number(operation?.amount)||0),role=String(operation?.operationRole||'');if(role==='paid-debtor')return -amount;if(role==='paid-receiver')return amount;return Number(operation?.amount)||0}
function trackingAccountOperations(k=monthKey){return accountOperationsForMonth(k).map(e=>({...e,trackingAccountOperation:true,trackingSign:Number(e.amount)<0?-1:1,amount:Math.abs(Number(e.amount)||0)}))}
function trackingAccountValue(e,filter='Toutes'){let value=(Number(e.trackingSign)===-1?-1:1)*Math.abs(Number(e.amount)||0),role=String(e.operationRole||'');if(filter==='Toutes'&&(role==='paid-debtor'||role==='paid-receiver'||role==='repayment-debt-clear'))return 0;/* Au total du foyer, la dette restante est une dépense positive du débiteur; la contre-écriture négative du créancier sert à sa ventilation individuelle et ne doit pas annuler la dépense globale. */if(filter==='Toutes'&&value<0&&(role.startsWith('remaining-')||role.startsWith('default-')))return 0;return value}
function trackingAccountContribution(e,filter='Toutes',k=monthKey){let signed=(Number(e.trackingSign)===-1?-1:1)*Math.abs(Number(e.amount)||0),spend=filter==='Toutes'?trackingAccountValue(e,filter):signed,paid=isPaid(e,k)?signed:0;return {signed,spend,paid,remaining:spend-paid}}
function trackingDebtSettlementTotals(k=monthKey){const totals={paid:{J:0,C:0},remaining:{J:0,C:0}};for(const e of accountOperationsForMonth(k)){const role=String(e.operationRole||''),person=e.owner==='Carla'?'C':'J',amount=Math.abs(Number(e.amount)||0);if(role==='paid-debtor'){totals.paid[person]+=amount;continue}if(!(role.startsWith('remaining-')||role.startsWith('default-'))||!role.endsWith('-debtor'))continue;totals.remaining[person]+=amount}return totals}
function trackingAccountTotals(operations,filter='Toutes',k=monthKey){let totals={spend:0,paid:0,people:{J:{spend:0,paid:0},C:{spend:0,paid:0}}};for(const e of operations){let owner=e.owner==='Julien'?'J':'C';if(filter!=='Toutes'&&filter!==owner)continue;let contribution=trackingAccountContribution(e,filter,k);totals.spend+=contribution.spend;totals.paid+=contribution.paid;totals.people[owner].spend+=contribution.signed;totals.people[owner].paid+=contribution.paid}return totals}
function reimbursementDueItems(from,k=monthKey){const to=from==='C'?'J':'C',items=[],paidIds=new Set((Array.isArray(data.reimbursements?.[k])?data.reimbursements[k]:[]).flatMap(r=>Array.isArray(r.itemIds)?r.itemIds:[]));for(const e of expenseItemsForMonth(k).filter(x=>!isParts(x))){const [j,c]=shares(e,k),base=Number(e.amount)||0;if(base<=0)continue;const add=(entry,stableKey)=>{const payer=entry.payer==='C'?'C':'J',other=payer==='J'?'C':'J',share=other==='J'?j:c,amount=Math.round((Math.max(0,Number(entry.amount)||0)*share/base)*100)/100;if(payer!==to||amount<=0.005)return;const id=`${e.id}|${k}|${stableKey}|${payer}`;if(!paidIds.has(id))items.push({id,name:e.name,payer,from:other,amount})};if(e.mode==='Multiple'){paymentsFor(e,k).forEach((p,i)=>add({amount:p.amount,payer:p.payer==='C'?'C':p.payer==='J'?'J':(e.payer==='C'?'C':'J')},`payment:${p.id||p.reimbursementId||(p.reimbursementId=newId())}:${Number(p.amount)||0}:${dateKey(p.date)||''}`))}else paidEntries(e,k).forEach((entry,i)=>add(entry,`paid:${i}:${entry.day||''}:${Number(entry.amount)||0}`))}items.sort((a,b)=>a.name.localeCompare(b.name,'fr')||a.id.localeCompare(b.id,'fr'));let legacyDue=Math.round((Array.isArray(data.reimbursements?.[k])?data.reimbursements[k]:[]).filter(r=>r.from===from&&!Array.isArray(r.itemIds)).reduce((n,r)=>n+(Number(r.amount)||0),0)*100)/100;for(const item of items){if(legacyDue<=0)break;let offset=Math.min(legacyDue,item.amount);item.amount=Math.round((item.amount-offset)*100)/100;legacyDue=Math.round((legacyDue-offset)*100)/100}return items.filter(x=>x.amount>0.005)}
function isPaid(e,k=monthKey){if(e.accountOperation||e.autoAccountOperation){let role=String(e.operationRole||'');if(role==='repayment-debt-clear')return false;if(role.startsWith('paid-'))return true;if(role.startsWith('remaining-')||role.startsWith('default-'))return false;let date=dateKey(e.operationDate||e.paidDates?.[k]||'');return !!date&&date<=dateInputToday()}if(e.debtRepayment)return true;if(isParts(e))return !!e.paidJulien&&!!e.paidCarla;if(e.mode==='Multiple')return paidAmount(e,k)>=(Number(e.amount)||0)-.005;return !!(e.paidMonths&&e.paidMonths[k]!==undefined?e.paidMonths[k]:e.paid)}
function isForPerson(e,person,k=monthKey){if(person==='Toutes')return true;let idx=person==='J'?0:1;return Math.abs(shares(e,k)[idx])>.000001}
function visibleExpenses(){return expenseItemsForMonth().filter(e=>isForPerson(e,personFilter)&&(filter==='Toutes'||e.category===filter))}
function expenseDay(e){let vals=isParts(e)?[effectiveExpenseDay(e,monthKey,'Julien'),effectiveExpenseDay(e,monthKey,'Carla')]:[effectiveExpenseDay(e)];if(e.mode==='Multiple')vals.push(...paymentsFor(e).map(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date||'')?Number(p.date.slice(8,10)):null));let nums=vals.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=31);return nums.length?Math.min(...nums):null}
function sortExpenses(list){let today=getToday().getDate();return [...list].sort((a,b)=>{if(expenseSort==='amount')return Math.abs(Number(b.amount)||0)-Math.abs(Number(a.amount)||0)||String(a.name).localeCompare(String(b.name),'fr');if(expenseSort==='name')return String(a.name).localeCompare(String(b.name),'fr',{sensitivity:'base'});if(expenseSort==='category')return String(a.category||'').localeCompare(String(b.category||''),'fr',{sensitivity:'base'})||String(a.name).localeCompare(String(b.name),'fr',{sensitivity:'base'});if(expenseSort==='type'){let rank={ESS:0,L:1,EP:2};return (rank[a.type]??3)-(rank[b.type]??3)||String(a.name).localeCompare(String(b.name),'fr',{sensitivity:'base'})}let da=expenseDay(a),db=expenseDay(b);if(da===null)return db===null?String(a.name).localeCompare(String(b.name),'fr'):1;if(db===null)return -1;let ra=da>=today?da-today:31-today+da,rb=db>=today?db-today:31-today+db;return ra-rb||String(a.name).localeCompare(String(b.name),'fr')})}
function sortSelect(){return `<label class="expense-sort-label" for="expenseSortSelect"><span>Trier</span><select class="expense-sort" id="expenseSortSelect" aria-label="Trier les dépenses">${[['day','Jour de prélèvement'],['amount','Montant'],['name','Nom'],['category','Catégorie'],['type','Type budget']].map(([id,label])=>`<option value="${id}" ${expenseSort===id?'selected':''}>${label}</option>`).join('')}</select></label>`} function expenseFilterTags(){let items=[...expenseItemsForMonth(),...accountOperationsForMonth()],pairs=items.flatMap(e=>[...(e.category?[[`category:${e.category}`,e.category]]:[]),...(e.type?[[`type:${e.type}`,budgetTypeLabel(e.type)]]:[])]);return [...new Map(pairs).entries()].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label,'fr',{sensitivity:'base'}))} function expenseTagsSelect(tags){let count=selectedExpenseTags.length;return `<details class="expense-tag-filter" id="expenseTagDropdown"><summary aria-label="Filtrer par catégorie ou type, sélection multiple"><span>${count?`Tags · ${count}`:'Tags · Tous'}</span><span aria-hidden="true">⌄</span></summary><div class="expense-tag-options" role="group" aria-label="Catégories et types">${tags.map(tag=>`<label><input type="checkbox" data-expense-filter-tag="${esc(tag.value)}" value="${esc(tag.value)}" ${selectedExpenseTags.includes(tag.value)?'checked':''}><span>${esc(tag.label)}</span></label>`).join('')||'<span class="expense-tag-empty">Aucun tag disponible</span>'}</div></details>`}
function personSegments(){return `<div class="person-segments" role="group" aria-label="Filtrer par personne">${[['Toutes','Tous'],['J','Julien'],['C','Carla']].map(([id,label])=>`<button type="button" class="person-segment ${personFilter===id?'selected '+(id==='J'?'julien':id==='C'?'carla':'all'):''}" data-person-filter="${id}" aria-pressed="${personFilter===id}">${label}</button>`).join('')}</div>`}
function filteredSummary(list){list=list.filter(e=>!e.autoAccountOperation&&!e.accountOperation);let idx=personFilter==='J'?0:1,total=list.reduce((sum,e)=>sum+(personFilter==='Toutes'?(Number(e.amount)||0):shares(e)[idx]),0);return `<div class="filter-summary"><span>${personFilter==='Toutes'?'Total affiché':`Part ${personFilter==='J'?'Julien':'Carla'} affichée`}</span><strong class="${personFilter==='J'?'person-color julien-text':personFilter==='C'?'person-color carla-text':''}">${eur(total)}</strong></div>`}
function personMetricClass(){return personFilter==='J'?'person-color julien-text':personFilter==='C'?'person-color carla-text':''}
function amountForFilter(e,amount){let n=Number(amount)||0;if(personFilter==='Toutes')return n;let base=Number(e.amount)||0;if(!base)return 0;let part=shares(e)[personFilter==='J'?0:1];return n*part/base}

function trackingPersonSegments(){return `<div class="person-segments" role="group" aria-label="Filtrer le suivi par personne">${[['Toutes','Tout'],['J','Julien'],['C','Carla']].map(([id,label])=>`<button type="button" class="person-segment ${trackingPersonFilter===id?'selected '+(id==='J'?'julien':id==='C'?'carla':'all'):''}" data-tracking-person-filter="${id}" aria-pressed="${trackingPersonFilter===id}">${label}</button>`).join('')}</div>`}
function trackingSpendFor(e,amount,filter){let n=Number(amount)||0;if(filter==='Toutes')return n;let base=Number(e.amount)||0;if(!base)return 0;return n*shares(e)[filter==='J'?0:1]/base}
function trackingPaidFor(e,filter,k=monthKey){let amount=Number(e.amount)||0;return filter==='Toutes'?Math.min(amount,paidAmount(e,k)):ownPaid(e,k,filter)}

function trackingPaidDetailEntries(e,k,amountCents,paidBy,paidTotal){
 const people={J:0,C:0},entries=[];
 if(isParts(e)){
  const raw=shares(e,k),jCents=Math.max(0,Math.min(amountCents,Math.round((Number(raw[0])||0)*100))),shareCents={J:jCents,C:amountCents-jCents};
  for(const entry of paidEntries(e,k)){const who=entry.payer==='C'?'C':'J',cents=Math.min(shareCents[who],Math.max(0,Math.round((Number(entry.amount)||0)*100)));if(cents){people[who]+=cents;entries.push({...entry,cents,attributed:{J:who==='J'?cents:0,C:who==='C'?cents:0}})}}
 }else{
  let remaining=paidTotal;
  // Une source partagée avec le calcul du suivi : les paiements et avances sont affectés au payeur réel, dans l'ordre enregistré.
  for(const entry of paidEntries(e,k)){if(remaining<=0)break;const cents=Math.min(remaining,Math.max(0,Math.round((Number(entry.amount)||0)*100))),who=entry.payer==='C'?'C':'J';if(cents){people[who]+=cents;entries.push({...entry,cents,attributed:{J:who==='J'?cents:0,C:who==='C'?cents:0}});remaining-=cents}}
 }
 return {people,entries};
}
function trackingPaidCentsByPerson(e,k,amountCents,paidBy,paidTotal){const detail=trackingPaidDetailEntries(e,k,amountCents,paidBy,paidTotal);return [detail.people.J,detail.people.C]}
function trackingRemainingCentsByPerson(e,k,amountCents,paidBy,paidTotal){
 const remainingCents=Math.max(0,amountCents-Math.min(amountCents,paidTotal));
 if(isParts(e)){
  const raw=shares(e,k),jCents=Math.max(0,Math.min(amountCents,Math.round((Number(raw[0])||0)*100))),sharesCents={J:jCents,C:amountCents-jCents},paid=trackingPaidCentsByPerson(e,k,amountCents,paidBy,paidTotal);
  return [Math.max(0,sharesCents.J-paid[0]),Math.max(0,sharesCents.C-paid[1])];
 }
 // Pour une dépense avancée, comme pour les paiements enregistrés, le payeur porte le solde restant.
 const payer=e.payer==='C'?'C':'J';return payer==='J'?[remainingCents,0]:[0,remainingCents];
}
function trackingDetailType(e){if(isParts(e))return 'Chacun sa part';if(isCouple(e)&&e.settlementMode==='avance')return 'Frais commun avancé';return e.owner==='Commun'||e.split==='COM'||e.split==='50/50'?'Dépense commune':'Dépense personnelle'}
function trackingExpenseContribution(e,filter,k=monthKey){
 const amountCents=Math.max(0,Math.round((Number(e.amount)||0)*100)),amount=amountCents/100,raw=shares(e,k),jCents=Math.max(0,Math.min(amountCents,Math.round((Number(raw[0])||0)*100))),shareCents=[jCents,amountCents-jCents],paidBy=paidByPerson(e,k),paidTotal=Math.min(amountCents,Math.round((Number(paidBy.J)||0)*100)+Math.round((Number(paidBy.C)||0)*100));
 const paidCents=trackingPaidCentsByPerson(e,k,amountCents,paidBy,paidTotal),remainingByPerson=trackingRemainingCentsByPerson(e,k,amountCents,paidBy,paidTotal);
 const index=filter==='J'?0:1,spendCents=filter==='Toutes'?amountCents:shareCents[index],paidValueCents=filter==='Toutes'?paidTotal:paidCents[index],remainingValueCents=filter==='Toutes'?Math.max(0,amountCents-paidTotal):remainingByPerson[index];return {spend:spendCents/100,paid:paidValueCents/100,remaining:remainingValueCents/100}
}
function trackingExpensePaidTotals(k=monthKey){const totals={J:0,C:0};for(const e of expenseItemsForMonth(k)){totals.J+=trackingExpenseContribution(e,'J',k).paid;totals.C+=trackingExpenseContribution(e,'C',k).paid}return totals}
function trackingExpenseRemainingTotals(k=monthKey){return {J:trackingLedger('J',k,{excludeSettlementLines:true}).totals.remaining,C:trackingLedger('C',k,{excludeSettlementLines:true}).totals.remaining}}
function paidReimbursementTotal(k=monthKey){return Math.round(reimbursementSources(k).reduce((sum,r)=>sum+Math.abs(Number(r.amount)||0),0)*100)/100}
function reimbursementSummary(k=monthKey){
 const calc=settlement(k),paid=reimbursementSources(k);
 const signedPaidCents=paid.reduce((sum,r)=>r.reimbursedMonths?.[k]===false?sum:sum+(r.from==='C'?-1:1)*Math.round(Math.abs(Number(r.amount)||0)*100),0);
 const baseCents=Math.round((Number(calc.net)||0)*100)-signedPaidCents,creditor=baseCents>=0?'J':'C',debtor=creditor==='J'?'C':'J',dueCents=Math.abs(baseCents);
 const repaidCents=Math.min(dueCents,paid.filter(r=>(r.from==='C'?'C':'J')===debtor&&r.reimbursedMonths?.[k]!==false).reduce((sum,r)=>sum+Math.max(0,Math.round(Math.abs(Number(r.amount)||0)*100)),0));
 return {due:dueCents/100,reimbursed:repaidCents/100,remaining:Math.max(0,dueCents-repaidCents)/100,creditor,debtor};
}
function trackingReimbursementTotals(k=monthKey){const s=reimbursementSummary(k),totals={reimbursedCents:Math.round(s.reimbursed*100),pendingCents:Math.round(s.remaining*100),people:{J:{reimbursedCents:0,pendingCents:0},C:{reimbursedCents:0,pendingCents:0}}};totals.people[s.debtor].reimbursedCents=totals.reimbursedCents;totals.people[s.debtor].pendingCents=totals.pendingCents;totals.people[s.creditor].reimbursedCents=totals.reimbursedCents;totals.people[s.creditor].pendingCents=totals.pendingCents;totals.reimbursed=s.reimbursed;totals.toReimburse=s.remaining;for(const person of ['J','C']){totals.people[person].reimbursed=totals.people[person].reimbursedCents/100;totals.people[person].toReimburse=totals.people[person].pendingCents/100}return totals}
function trackingReimbursementSignedTotals(k=monthKey){const s=reimbursementSummary(k),totals={reimbursed:{J:0,C:0},pending:{J:0,C:0}};totals.reimbursed[s.creditor]=s.reimbursed;totals.reimbursed[s.debtor]=-s.reimbursed;totals.pending[s.creditor]=s.remaining;totals.pending[s.debtor]=-s.remaining;return totals}
// Convention d’affichage du Suivi uniquement : créancier négatif, débiteur positif.
function trackingReimbursementDisplayTotals(k=monthKey){const totals=trackingReimbursementSignedTotals(k);return {reimbursed:{J:-totals.reimbursed.J,C:-totals.reimbursed.C},pending:{J:-totals.pending.J,C:-totals.pending.C}}}
function trackingLedger(filter='Toutes',k=monthKey,options={}){
 const excludeSettlementLines=!!options.excludeSettlementLines;
 const people=filter==='Toutes'?['J','C']: [filter], rows=[], seen=new Set();
 const add=(e,person,kind,contribution,meta={})=>{
  const identity=e.id===undefined||e.id===null?null:`${String(e.id)}|${person}`;
  if(identity!==null&&seen.has(identity))return;
  if(identity!==null)seen.add(identity);
  const spendCents=Math.round((Number(contribution.spend)||0)*100),paidCents=Math.round((Number(contribution.paid)||0)*100),remainingCents=Math.round((Number(contribution.remaining)||0)*100);
  rows.push({id:e.id,name:e.name||(kind==='expense'?'Dépense':'Opération compte'),category:String(e.category||'').trim(),gross:Math.abs(Number(e.amount)||0),person,kind,spendCents,paidCents,remainingCents,party:meta.party||'',status:meta.status||''});
 };
 for(const e of expenseItemsForMonth(k))for(const person of filter==='Toutes'?['Toutes']:people){
  const c=trackingExpenseContribution(e,person,k),who=person==='J'?'Julien':'Carla';
  add(e,person==='Toutes'?'Total':person,'expense',c,{party:filter==='Toutes'?'Julien & Carla':`${who} · ${e.owner||e.split||'Concernés'}`,status:isPaid(e,k)?'Payé':(c.paid>0?'Partiellement payé':'À payer')});
 }
 if(!excludeSettlementLines)for(const e of trackingAccountOperations(k)){
  const owner=e.owner==='Julien'?'J':'C';if(filter!=='Toutes'&&filter!==owner)continue;
  add(e,filter==='Toutes'?'Total':owner,'account',trackingAccountContribution(e,filter,k),{party:e.owner,status:isPaid(e,k)?'Déjà payé':'À payer'});
 }
 // Le prévisionnel du suivi reprend le total mensuel de l'Accueil : même périmètre,
 // mêmes parts et ajustement logement signé. Les opérations de compte ne sont pas des dépenses prévues.
 const homeSummary=homeMonthlyTotals(k);
 // Les opérations de remboursement restent visibles pour le payé, mais ne sont pas des dépenses prévues de l'Accueil.
 for(const row of rows){if(row.kind==='account'){row.spendCents=0;row.paidCents=0;row.remainingCents=0;}}
 if(!excludeSettlementLines){const adjustmentPeople=filter==='Toutes'?['J','C']:[filter];
 for(const person of adjustmentPeople){const amountCents=Math.round(Number(homeSummary.adjustment[person])||0);if(Math.abs(amountCents)>0){rows.push({id:null,name:'Ajustement frais logement',category:'Logement',gross:Math.abs(amountCents)/100,person,kind:'expense',spendCents:amountCents,paidCents:0,remainingCents:amountCents,party:`${person==='J'?'Julien':'Carla'} · Logement`,status:'Ajustement calculé'});}}}
 const sum=key=>rows.reduce((n,r)=>n+r[`${key}Cents`],0);
 const canonicalSpendCents=Math.round(filter==='Toutes'?homeSummary.expenseTotal:(Number(homeSummary.people[filter]?.total)||0));
 const paidCents=sum('paid'),remainingCents=sum('remaining');
 const totals={spend:canonicalSpendCents/100,paid:paidCents/100,remaining:(filter==='Toutes'?Math.max(0,remainingCents):remainingCents)/100};
 const personTotals={};for(const person of ['J','C'])personTotals[person]=trackingLedgerRowsForPerson(person,k)
 return {totals,people:personTotals,rows:rows.map(r=>({...r,spend:r.spendCents/100,paid:r.paidCents/100,remaining:r.remainingCents/100}))};
}
function trackingLedgerRowsForPerson(person,k){
 const rows=[],seen=new Set();
 for(const e of expenseItemsForMonth(k)){if(e.id!==undefined&&e.id!==null){const key=`${e.id}|${person}`;if(seen.has(key))continue;seen.add(key)}const c=trackingExpenseContribution(e,person,k);rows.push({spendCents:Math.round(c.spend*100),paidCents:Math.round(c.paid*100),remainingCents:Math.round(c.remaining*100)})}
 for(const e of trackingAccountOperations(k)){if((e.owner==='Julien'?'J':'C')!==person)continue;if(e.id!==undefined&&e.id!==null){const key=`${e.id}|${person}`;if(seen.has(key))continue;seen.add(key)}rows.push({kind:'account',spendCents:0,paidCents:0,remainingCents:0})}
 const summary=homeMonthlyTotals(k),spend=Math.round((Number(summary.people[person]?.total)||0)*100),paid=rows.reduce((n,r)=>n+r.paidCents,0),remaining=spend-paid;return {spend:spend/100,paid:paid/100,remaining:remaining/100};
}
function amountForTracking(e,amount){return trackingSpendFor(e,amount,trackingPersonFilter)}
function totals(){let list=expenseItemsForMonth(),spend=list.reduce((s,e)=>s+amountForFilter(e,e.amount),0),paid=list.reduce((s,e)=>s+(e.debtRepayment?0:(personFilter==='Toutes'?Math.min(Number(e.amount)||0,paidAmount(e)):ownPaid(e,monthKey,personFilter))),0),remaining=Math.max(0,spend-paid),inc=personFilter==='J'?valIncome('J'):personFilter==='C'?valIncome('C'):valIncome('J')+valIncome('C');return {spend,paid,remaining,inc}}
function balanceRecordFor(date){let record=data.realBalances?.[date];if(record&&typeof record==='object')return record;if(date===data.currentBalanceDate)return {J:data.currentBalanceJulien,C:data.currentBalanceCarla};return null}
function selectedBalanceDate(){return dateKey(data.currentBalanceDate)||dateInputToday()}
function balanceFor(person){let v=balanceRecordFor(selectedBalanceDate())?.[person];if(v===undefined&&selectedBalanceDate()===data.currentBalanceDate)v=person==='J'?data.currentBalanceJulien:data.currentBalanceCarla;return v===''||v==null||!Number.isFinite(Number(v))?null:Number(v)}
function latestRealBalance(person){let keys=Object.keys(data.realBalances||{}).filter(d=>validDateKey(d)&&data.realBalances[d]&&data.realBalances[d][person]!==null&&data.realBalances[d][person]!==undefined&&Number.isFinite(Number(data.realBalances[d][person]))).sort();if(!keys.length)return null;let date=keys[keys.length-1];return {date,value:Number(data.realBalances[date][person])}}
function latestBalanceDate(k=monthKey){let now=dateInputToday(),keys=Object.keys(data.realBalances||{}).filter(d=>d.startsWith(k+'-')&&d<=now&&['J','C'].some(p=>balanceRecordFor(d)?.[p]!==null&&balanceRecordFor(d)?.[p]!==undefined&&Number.isFinite(Number(balanceRecordFor(d)[p])))).sort();return keys.length?keys[keys.length-1]:''}
function localDateKey(d=getToday()){let [y,m]=monthKey.split('-').map(Number),day=Math.min(d.getDate(),new Date(y,m,0).getDate());return `${monthKey}-${String(day).padStart(2,'0')}`}
function paidDateFor(e,k=monthKey,who=''){let map=who?e[`paidDates${who}`]:e.paidDates,stored=map&&map[k];if(/^\d{4}-\d{2}-\d{2}$/.test(stored||''))return stored;if(!who&&/^\d{4}-\d{2}-\d{2}$/.test(e.paidDate||'')&&e.paidDate.slice(0,7)===k)return e.paidDate;return ''}
function historicalDays(e,k=monthKey,who=''){let observations=new Map(),all={};const addMap=(map,prefix='day')=>{for(const [m,d] of Object.entries(map||{})){if(m<k&&/^\d{4}-\d{2}-\d{2}$/.test(d||''))observations.set(`${prefix}|${m}|${d}`,Number(d.slice(8,10)))}};const matches=x=>x&&(x.id===e.id||(x.name===e.name&&x.category===e.category&&Number(x.amount)===Number(e.amount)));if(who)addMap(e[`paidDates${who}`],who);else if(e.mode==='Multiple'){for(const [m,ps] of Object.entries(e.payments||{}))if(m<k&&Array.isArray(ps))for(const p of ps){let d=dateKey(p.date);if(d)observations.set(`payment|${m}|${p.date}|${p.amount}|${p.payer}|${ps.indexOf(p)}`,Number(d.slice(8,10)))}}else{addMap(e.paidDates);if(isParts(e)){addMap(e.paidDatesJulien,'Julien');addMap(e.paidDatesCarla,'Carla')}}return [...observations.values()].filter(d=>Number.isInteger(d)&&d>=1&&d<=31)}
function effectiveExpenseDay(e,k=monthKey,who=''){let override=Number((who?e[`dayOverrides${who}`]:e.dayOverrides)?.[k]);if(Number.isInteger(override)&&override>=1&&override<=31)return override;let actual=paidDateFor(e,k,who);if(actual)return Number(actual.slice(8,10));let hist=historicalDays(e,k,who);if(hist.length)return Math.floor(hist.reduce((a,b)=>a+b,0)/hist.length);let fallback=who?e[who==='Julien'?'dayJulien':'dayCarla']:e.day;let d=Number(fallback);return Number.isInteger(d)&&d>=1&&d<=31?d:null}
function theoreticalExpenseDay(e,k=monthKey,who=''){let overrides=who?e[`dayOverrides${who}`]:e.dayOverrides,override=Number(overrides?.[k]),actual=paidDateFor(e,k,who);if(Number.isInteger(override)&&override>=1&&override<=31&&!(actual&&Number(actual.slice(8,10))===override))return override;let hist=historicalDays(e,k,who);if(hist.length)return Math.floor(hist.reduce((a,b)=>a+b,0)/hist.length);let fallback=who?e[who==='Julien'?'dayJulien':'dayCarla']:e.day,d=Number(fallback);return Number.isInteger(d)&&d>=1&&d<=31?d:null}
function storedPaidDay(date){return /^\d{4}-\d{2}-\d{2}$/.test(date||'')?Number(date.slice(8,10)):''}
function expensePaidDay(e,who=''){const stored=storedPaidDay(paidDateFor(e,monthKey,who));if(stored!=='')return stored;const paid=who?(who==='Julien'?!!e?.paidJulien:!!e?.paidCarla):isPaid(e,monthKey);return paid?effectiveExpenseDay(e,monthKey,who)||Number(localDateKey().slice(8,10)):''}
function incomePaidDay(i,k=monthKey){if(!incomeReceived(i,k))return '';return storedPaidDay(i?.receivedDates?.[k])||incomeDay(i,k)||Number(localDateKey().slice(8,10))}
function setExpensePaidDay(e,raw,who=''){
 const field=who?`paid${who}`:'paid',dates=who?`paidDates${who}`:'paidDates',overrides=who?`dayOverrides${who}`:'dayOverrides';
 if(raw===''){if(who)e[field]=false;else{e.paidMonths=e.paidMonths||{};e.paidMonths[monthKey]=false;e.paid=false}if(e[dates])delete e[dates][monthKey];if(e[overrides])delete e[overrides][monthKey];if(!who&&e.paidDate?.startsWith(monthKey+'-'))delete e.paidDate;return true}
 const day=Number(raw);if(!Number.isInteger(day)||day<1||day>31)return false;const [year,month]=monthKey.split('-').map(Number),realDay=Math.min(day,new Date(year,month,0).getDate()),date=`${monthKey}-${String(realDay).padStart(2,'0')}`;
 if(who)e[field]=true;else{e.paidMonths=e.paidMonths||{};e.paidMonths[monthKey]=true;e.paid=true}
 e[dates]={...(e[dates]||{}),[monthKey]:date};e[overrides]={...(e[overrides]||{}),[monthKey]:realDay};if(!who)e.paidDate=date;return true
}
function setIncomePaidDay(i,raw,k=monthKey){
 if(raw===''){i.receivedMonths={...(i.receivedMonths||{}),[k]:false};if(i.receivedDates)delete i.receivedDates[k];if(i.dayOverrides)delete i.dayOverrides[k];return true}
 const day=Number(raw);if(!Number.isInteger(day)||day<1||day>31)return false;const [year,month]=k.split('-').map(Number),realDay=Math.min(day,new Date(year,month,0).getDate()),date=`${k}-${String(realDay).padStart(2,'0')}`;
 i.receivedMonths={...(i.receivedMonths||{}),[k]:true};i.receivedDates={...(i.receivedDates||{}),[k]:date};i.dayOverrides={...(i.dayOverrides||{}),[k]:realDay};return true
}
function monthDayControl(e,who=''){let d=effectiveExpenseDay(e,monthKey,who),auto=!((who?e[`dayOverrides${who}`]:e.dayOverrides)||{})[monthKey]&&!paidDateFor(e,monthKey,who),autoLabel=auto&&historicalDays(e,monthKey,who).length>0;return `<span class="expense-day-control"><input class="expense-day-input ${autoLabel?'auto-day':''}" type="number" inputmode="numeric" min="1" max="31" value="${d??''}" data-real-day="${esc(e.id)}" ${who?`data-real-person="${who}"`:''} aria-label="Jour réel ou prévu du prélèvement, de 1 à 31${autoLabel?' · calcul automatique':''}" title="${autoLabel?'Jour auto-calculé depuis les mois précédents':'Jour de prélèvement de ce mois'}">${autoLabel?'<small class="auto-day-label">AUTO</small>':''}</span>`}
