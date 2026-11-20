'use strict';
const CATEGORIES=['Logement','Impôts/taxes','Véhicule','Santé','Alimentation','Vie quotidienne','Numérique','Enfants','Loisir','Animaux','Autres','Épargne','Opération compte'];
const TABS=[['home','⌂','Accueil'],['tracking','◷','Suivi'],['expenses','↗','Dépenses'],['income','＋','Revenus'],['housing','⌂','Logement'],['rules','◷','50/30/20'],['settings','⚙','Réglages']];
const seed={"incomes":[{"id":"inc-j","name":"Revenu Julien","person":"J","amount":4349.98},{"id":"inc-c","name":"Revenu Carla","person":"C","amount":3523.67}],"expenses":[{"id":"e1","name":"Crédit maison","amount":871.89,"category":"Logement","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e2","name":"Crédit appart","amount":992.84,"category":"Logement","split":"J","type":"EP","payer":"J","paid":false},{"id":"e3","name":"Domofinance","amount":145.08,"category":"Logement","split":"J","type":"EP","payer":"J","paid":false},{"id":"e4","name":"Charges appart","amount":159.34,"category":"Logement","split":"J","type":"ESS","payer":"J","paid":false},{"id":"e5","name":"Assurance Macif Metzeresche","amount":52.83,"category":"Logement","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e6","name":"Macif Garche","amount":8.2,"category":"Logement","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e7","name":"EDF","amount":190.86,"category":"Logement","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e8","name":"EPS","amount":11.75,"category":"Logement","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e9","name":"Taxe foncière","amount":75,"category":"Impôts/taxes","split":"J","type":"ESS","payer":"J","paid":false},{"id":"e10","name":"Crédit voiture","amount":346.5,"category":"Véhicule","split":"C","type":"ESS","payer":"C","paid":false},{"id":"e11","name":"Assurance voiture","amount":51.71,"category":"Véhicule","split":"C","type":"ESS","payer":"C","paid":false},{"id":"e12","name":"Essence","amount":270,"category":"Véhicule","split":"C","type":"ESS","payer":"C","paid":false},{"id":"e13","name":"Parking","amount":50,"category":"Véhicule","split":"J","type":"ESS","payer":"J","paid":false},{"id":"e14","name":"Prévoyance Macif","amount":17.12,"category":"Santé","split":"J","type":"ESS","payer":"J","paid":false},{"id":"e15","name":"Ongles","amount":60,"category":"Loisir","split":"C","type":"L","payer":"C","paid":false},{"id":"e16","name":"Courses","amount":800,"category":"Alimentation","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e17","name":"Argent de poche S1","amount":50,"category":"Vie quotidienne","split":"J","type":"L","payer":"J","paid":false},{"id":"e18","name":"Argent de poche S1","amount":50,"category":"Vie quotidienne","split":"C","type":"L","payer":"C","paid":false},{"id":"e19","name":"Argent de poche S2","amount":50,"category":"Vie quotidienne","split":"J","type":"L","payer":"J","paid":false},{"id":"e20","name":"Argent de poche S2","amount":50,"category":"Vie quotidienne","split":"C","type":"L","payer":"C","paid":false},{"id":"e21","name":"Argent de poche S3","amount":50,"category":"Vie quotidienne","split":"J","type":"L","payer":"J","paid":false},{"id":"e22","name":"Argent de poche S3","amount":50,"category":"Vie quotidienne","split":"C","type":"L","payer":"C","paid":false},{"id":"e23","name":"Argent de poche S4","amount":50,"category":"Vie quotidienne","split":"J","type":"L","payer":"J","paid":false},{"id":"e24","name":"Argent de poche S4","amount":50,"category":"Vie quotidienne","split":"C","type":"L","payer":"C","paid":false},{"id":"e25","name":"Abo téléphone","amount":6.99,"category":"Numérique","split":"J","type":"L","payer":"J","paid":false},{"id":"e26","name":"Téléphone enfant","amount":13.98,"category":"Enfants","split":"J","type":"L","payer":"J","paid":false},{"id":"e27","name":"iCloud","amount":9.99,"category":"Numérique","split":"COM","type":"L","payer":"J","paid":false},{"id":"e28","name":"Spotify","amount":11.12,"category":"Numérique","split":"J","type":"L","payer":"J","paid":false},{"id":"e29","name":"Internet","amount":36.99,"category":"Numérique","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e30","name":"Pension","amount":327.23,"category":"Enfants","split":"C","type":"ESS","payer":"C","paid":false},{"id":"e31","name":"Bayard","amount":5.74,"category":"Enfants","split":"J","type":"L","payer":"J","paid":false},{"id":"e32","name":"Nounou","amount":281.27,"category":"Enfants","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e33","name":"Cotisation Eléonore","amount":240.46,"category":"Enfants","split":"COM","type":"ESS","payer":"J","paid":false},{"id":"e34","name":"Chien","amount":150,"category":"Animaux","split":"50/50","type":"ESS","payer":"J","paid":false},{"id":"e35","name":"Frais bancaires","amount":15.19,"category":"Autres","split":"50/50","type":"ESS","payer":"J","paid":false},{"id":"e36","name":"Épargne Macif","amount":50,"category":"Épargne","split":"J","type":"EP","payer":"J","paid":false},{"id":"e37","name":"Livret A","amount":500,"category":"Épargne","split":"50/50","type":"EP","payer":"J","paid":false}]};
const TEST_DEMO_MONTHS=(()=>{
 const expenses=(month,items)=>items.map((x,i)=>{
  const id=`demo-${month}-${i+1}`,shared=x.owner==='Commun',date=x.paid?`${month}-${String(x.date||x.day||10).padStart(2,'0')}`:'';
  const e={id,name:x.name,amount:x.amount,category:x.category,split:shared?(x.share===50?'50/50':'COM'):x.owner==='Julien'?'J':'C',type:x.type||'ESS',payer:x.payer,owner:x.owner,shareJulien:shared?(x.share??54):x.owner==='Julien'?100:0,shareMode:shared?'custom':'custom',settlementMode:shared?'parts':'avance',mode:'Unique',day:x.day||10,paid:!!x.paid,paidMonths:{[month]:!!x.paid},paidDates:date?{[month]:date}:{}};
  if(shared){e.paidJulien=!!x.paidJulien;e.paidCarla=!!x.paidCarla;e.dayJulien=x.dayJulien||x.day||10;e.dayCarla=x.dayCarla||x.day||10;e.paidDatesJulien=x.paidJulien?{[month]:`${month}-${String(x.dayJulien||x.date||10).padStart(2,'0')}`} :{};e.paidDatesCarla=x.paidCarla?{[month]:`${month}-${String(x.dayCarla||x.date||10).padStart(2,'0')}`}:{}}
  return e;
 });
 const incomes=month=>[
  {id:`demo-inc-j-${month}`,name:'Salaire Julien',person:'J',amount:4349.98,day:1,includeInSplit:true,receivedMonths:{[month]:true},receivedDates:{[month]:`${month}-01`},dayOverrides:{[month]:1}},
  {id:`demo-inc-c-${month}`,name:'Salaire Carla',person:'C',amount:3523.67,day:2,includeInSplit:true,receivedMonths:{[month]:true},receivedDates:{[month]:`${month}-02`},dayOverrides:{[month]:2}}
 ];
 const monthData=(month,items,refunds=[],adjustment=false)=>{
  const state={incomes:incomes(month),expenses:expenses(month,items),reimbursements:{[month]:refunds},logement:{habite:'julien',mode:'prorata',julien:{depenses:[],recettes:[]},carla:{depenses:[],recettes:[]}},realBalances:{},balanceAdjustments:[],currentBalanceDate:null,currentBalanceJulien:null,currentBalanceCarla:null};
  if(month==='2026-11'){state.realBalances[`${month}-01`]={J:2350.00,C:1280.00};state.currentBalanceDate=`${month}-01`;state.currentBalanceJulien=2350.00;state.currentBalanceCarla=1280.00}
  if(adjustment)state.balanceAdjustments.push({id:'demo-balance-adjustment-carla',person:'C',amount:42.37,date:'2026-11-14',name:'Ajustement solde Carla'});
  return state;
 };
 const standard=(month,advance,paidBack,extra,carriedDebt=0)=>{
  const [y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate();
  const refunds=[{id:`demo-refund-${month}`,date:`${month}-${String(last-2).padStart(2,'0')}`,amount:paidBack,from:'C',to:'J',accountOperation:true}];
  const items=[];if(carriedDebt)items.push({name:'Dette reportée du mois précédent',amount:carriedDebt,category:'Autres',owner:'Carla',payer:'J',day:3,paid:true,date:3});
  items.push(
   {name:'Avance ponctuelle de Julien pour Carla',amount:advance,category:'Autres',owner:'Carla',payer:'J',day:8,paid:true,date:8},
   {name:'Courses au supermarché',amount:extra,category:'Alimentation',owner:'Commun',payer:'J',share:54,day:11,paid:true,paidJulien:true,paidCarla:true,date:11},
   {name:'Carburant',amount:92.40,category:'Véhicule',owner:'Carla',payer:'C',day:14,paid:true,date:14},
   {name:'Abonnement internet',amount:36.99,category:'Numérique',owner:'Commun',payer:'J',share:54,day:18,paid:false},
   {name:'Consultation pharmacie',amount:24.60,category:'Santé',owner:'Julien',payer:'J',day:20,paid:true,date:20}
  );
  return monthData(month,items,refunds);
 };
 return {
  '2026-08':standard('2026-08',720,220,178.35,0),
  '2026-09':standard('2026-09',810,810,203.80,500),
  '2026-10':standard('2026-10',760,760,191.25,500),
  '2026-11':monthData('2026-11',[
   {name:'Réparation auto avancée par Julien pour Carla',amount:650,category:'Véhicule',owner:'Carla',payer:'J',day:6,paid:true,date:6},
   {name:'Courses communes',amount:216.45,category:'Alimentation',owner:'Commun',payer:'J',share:54,day:8,paid:true,paidJulien:true,paidCarla:true,date:8},
   {name:'Électricité',amount:118.20,category:'Logement',owner:'Commun',payer:'J',share:54,day:11,paid:true,paidJulien:true,paidCarla:true,date:11},
   {name:'Pharmacie',amount:18.70,category:'Santé',owner:'Carla',payer:'C',day:14,paid:true,date:14},
   {name:'Déjeuner',amount:23.80,category:'Alimentation',owner:'Julien',payer:'J',day:14,paid:true,date:14},
   {name:'Abonnement streaming',amount:14.99,category:'Numérique',owner:'Julien',payer:'J',day:19,paid:false},
   {name:'Vétérinaire',amount:86.50,category:'Animaux',owner:'Commun',payer:'C',share:50,day:22,paid:false}
  ],[{id:'demo-refund-2026-11-01',date:'2026-11-12',amount:150,from:'C',to:'J',accountOperation:true}],true)
 };
})();
