(function(){
const PEOPLE={Sameer:{full:'Dr. Sameer Ushkewar',short:'Sameer U.',ini:'SU'},RY:{full:'Dr. Rushikesh Yannawar',short:'Rushikesh Y.',ini:'RY'},RP:{full:'Dr. Rushikesh Patil',short:'Rushikesh P.',ini:'RP'},Santosh:{full:'Dr. Santosh Bhalerao',short:'Santosh B.',ini:'SB'},Anjali:{full:'Dr. Anjali Deshmukh',short:'Anjali D.',ini:'AD'},Pooja:{full:'Pooja Shinde',short:'Pooja S.',ini:'PS'},Clinic:{full:'Clinic account',short:'Clinic account',ini:'CA'}};
const ROLEKEY={'Owner':'owner','Therapist':'therapist','Front desk':'frontdesk'};
const ROLELABEL={owner:'Owner',therapist:'Therapist',frontdesk:'Front desk'};
const ME={owner:'Sameer',therapist:'Anjali',frontdesk:'Pooja'};
const inr=n=>'₹'+Math.round(Math.abs(n)).toLocaleString('en-IN');
const EXP_CATS=['Rent','Salaries','Consumables','Equipment','Utilities','Marketing','Travel (home visits)','Maintenance','Miscellaneous'];
const INC_CATS=['Clinic session','Home visit','Package','Other'];
const MODES=['Cash','UPI','Card','Bank transfer'];
const TODAY=14;
const SEED=[
{id:1,d:14,type:'in',cat:'Clinic session',desc:'Knee rehab session',patient:'Atharva Kale',mode:'Cash',amt:600,by:'Clinic',rec:'Pooja'},
{id:2,d:14,type:'out',cat:'Consumables',desc:'Kinesio tape, 6 rolls',mode:'UPI',amt:3240,by:'RP',rec:'RP',receipt:true},
{id:3,d:14,type:'in',cat:'Home visit',desc:'Neuro session, Kothrud',patient:'Kishor Kumar',mode:'UPI',amt:1200,by:'Anjali',rec:'Anjali'},
{id:4,d:13,type:'out',cat:'Travel (home visits)',desc:'Auto fare, Kothrud',mode:'Cash',amt:180,by:'Anjali',rec:'Anjali'},
{id:5,d:13,type:'in',cat:'Package',desc:'10-session spine package',patient:'Shruti Dhengale',mode:'Card',amt:6000,by:'Clinic',rec:'Pooja'},
{id:6,d:12,type:'out',cat:'Utilities',desc:'Electricity, September',mode:'Bank transfer',amt:4310,by:'Santosh',rec:'Santosh',receipt:true},
{id:7,d:11,type:'in',cat:'Clinic session',desc:'Shoulder mobilisation',patient:'Deva Kumar',mode:'Cash',amt:600,by:'RY',rec:'RY'},
{id:8,d:10,type:'out',cat:'Equipment',desc:'TENS unit',mode:'UPI',amt:12500,by:'Sameer',rec:'Sameer',receipt:true},
{id:9,d:9,type:'in',cat:'Home visit',desc:'Stroke rehab, Warje',patient:'M. Joshi',mode:'UPI',amt:1200,by:'Anjali',rec:'Anjali'},
{id:10,d:8,type:'out',cat:'Maintenance',desc:'AC servicing',mode:'Cash',amt:1400,by:'RY',rec:'Pooja'},
{id:11,d:7,type:'in',cat:'Home visit',desc:'Post-op knee, Karvenagar',patient:'S. Patwardhan',mode:'Cash',amt:1000,by:'Anjali',rec:'Anjali'},
{id:12,d:6,type:'in',cat:'Clinic session',desc:'Post-op ACL',patient:'Kundan Kumar',mode:'UPI',amt:800,by:'Clinic',rec:'Pooja'},
{id:13,d:5,type:'out',cat:'Rent',desc:'October rent',mode:'Bank transfer',amt:60000,by:'Clinic',rec:'Sameer',receipt:true},
{id:14,d:3,type:'out',cat:'Marketing',desc:'Google Business photos',mode:'UPI',amt:3200,by:'RP',rec:'RP'},
{id:15,d:2,type:'out',cat:'Consumables',desc:'Electrode pads, gel',mode:'UPI',amt:11200,by:'Santosh',rec:'Santosh',receipt:true},
{id:16,d:1,type:'out',cat:'Salaries',desc:'Watchman salary',mode:'Cash',amt:9000,by:'Sameer',rec:'Sameer'},
{id:17,d:1,type:'out',cat:'Salaries',desc:'Staff salary',mode:'Bank transfer',amt:21000,by:'Clinic',rec:'Sameer'}];
const EXP=[{n:'Rent',spent:60000,budget:62000,last:60000},{n:'Salaries',spent:38000,budget:40000,last:38000},{n:'Consumables',spent:21400,budget:20000,last:14650},{n:'Equipment',spent:12500,budget:25000,last:0},{n:'Utilities',spent:6850,budget:9000,last:7420},{n:'Travel (home visits)',spent:4900,budget:6000,last:3800},{n:'Marketing',spent:3200,budget:5000,last:5000},{n:'Maintenance',spent:2100,budget:4000,last:900},{n:'Miscellaneous',spent:1600,budget:3000,last:2130}];
const PARTNERS=[{k:'Sameer',paid:72400,recv:96300,share:25},{k:'RY',paid:18250,recv:88600,share:25},{k:'RP',paid:41900,recv:52800,share:25},{k:'Santosh',paid:12000,recv:61400,share:25}];
const RECUR=[{k:'watch',n:'Watchman salary',cat:'Salaries',day:1,amt:9000,logged:true},{k:'staff',n:'Staff salary',cat:'Salaries',day:1,amt:21000,logged:true},{k:'care',n:'Caretaker salary',cat:'Salaries',day:1,amt:8000},{k:'rent',n:'Rent',cat:'Rent',day:5,amt:60000,logged:true},{k:'elec',n:'Electricity',cat:'Utilities',day:10,amt:4500},{k:'net',n:'Internet',cat:'Utilities',day:15,amt:1199},{k:'waste',n:'Biomedical waste pickup',cat:'Maintenance',day:20,amt:700}];
const PERMS=[{g:'Finance'},{k:'finance.entry.create',l:'Log income & expenses',v:['All','Own','Own','—']},{k:'finance.entry.view',l:'View entries',v:['All','Own','Own','All']},{k:'finance.entry.edit_own',l:'Edit own entries (7 days)',v:['All','Own','Own','—']},{k:'finance.entry.edit_any',l:'Edit any entry',v:['All','—','—','—']},{k:'finance.report.view',l:'Dashboard & CA report',v:['All','—','—','All']},{k:'finance.settlement.manage',l:'Partner settlement',v:['All','—','—','—']},{k:'finance.budget.manage',l:'Budgets & funds',v:['All','—','—','—']},{g:'Settings'},{k:'settings.categories.manage',l:'Manage categories',v:['All','—','—','—']},{k:'settings.users.invite',l:'Invite users',v:['All','—','—','—']},{k:'settings.roles.manage',l:'Edit roles',v:['All','—','—','—']},{k:'audit.view',l:'View audit log',v:['All','—','—','All']},{g:'Later versions'},{k:'appointments.manage',l:'Appointments (V2)',v:['All','Own','All','—'],later:true},{k:'patients.view',l:'Patient records (V2)',v:['All','Own','All','—'],later:true},{k:'inventory.manage',l:'Inventory (V3)',v:['All','—','—','—'],later:true}];
const AUDIT=[{t:'14 Oct, 11:42',u:'Pooja S.',a:'Created',k:'Entries',e:'Income · Clinic session',b:'',af:'₹600 · Cash · Atharva Kale'},{t:'13 Oct, 19:05',u:'Rushikesh P.',a:'Edited',k:'Entries',e:'Expense · Consumables · amount',b:'₹3,420',af:'₹3,240'},{t:'12 Oct, 09:15',u:'Santosh B.',a:'Edited',k:'Entries',e:'Expense · Utilities · payment mode',b:'Cash',af:'Bank transfer'},{t:'11 Oct, 18:30',u:'Sameer U.',a:'Deleted',k:'Entries',e:'Expense · Miscellaneous',b:'₹450 · Tea & snacks (duplicate)',af:'Soft-deleted'},{t:'10 Oct, 10:02',u:'Sameer U.',a:'Settings',k:'Settings',e:'Budget · Consumables',b:'₹18,000',af:'₹20,000'},{t:'08 Oct, 16:20',u:'Sameer U.',a:'Settings',k:'Settings',e:'Role · Front desk · finance.entry.view',b:'None',af:'Own'},{t:'02 Oct, 21:10',u:'Rushikesh Y.',a:'Settled',k:'Entries',e:'Settlement · September 2026',b:'Open balance ₹31,240',af:'Marked settled'},{t:'01 Oct, 08:45',u:'Sameer U.',a:'Settings',k:'Settings',e:'Category · rename',b:'Travel',af:'Travel (home visits)'}];
const USERS=[{p:'Sameer',c:'+91 98220 41736 · sameer@atpxrehab.com',r:['Owner']},{p:'RY',c:'+91 98901 22457',r:['Owner']},{p:'RP',c:'+91 97300 81924',r:['Owner']},{p:'Santosh',c:'+91 98606 77031',r:['Owner']},{p:'Anjali',c:'+91 97654 22018',r:['Therapist']},{p:'Pooja',c:'+91 90110 56432',r:['Front desk']},{name:'Kulkarni & Associates',ini:'KA',c:'accounts@kulkarnica.in',r:['CA (read-only)'],invited:true}];
const NAV={dashboard:{l:'Dashboard',i:'layout-dashboard'},transactions:{l:'Transactions',i:'list'},settlement:{l:'Settlement',i:'scale'},budgets:{l:'Budgets & funds',i:'piggy-bank'},recurring:{l:'Recurring',i:'repeat'},reports:{l:'CA report',i:'file-text'},categories:{l:'Categories',i:'tags'},roles:{l:'Users & roles',i:'shield'},audit:{l:'Audit log',i:'history'},more:{l:'More',i:'ellipsis'},login:{l:'Sign in',i:'lock'},invite:{l:'Accept invite',i:'mail'}};
const LBL={owner:{},therapist:{dashboard:'My summary',transactions:'My entries'},frontdesk:{dashboard:'Today',transactions:'Entries'}};
const SUB={dashboard:'Wed, 14 Oct 2026',transactions:'October 2026',settlement:'1–14 Oct 2026',budgets:'October 2026',recurring:'October 2026',reports:'Monthly report for the CA',categories:'Settings',roles:'Settings',audit:'Every create, edit and delete',more:'ATP Rehab'};
const SCREEN_OPTS=[['login','Sign in'],['invite','Accept invite'],['dashboard','Dashboard'],['transactions','Transactions'],['settlement','Partner settlement'],['budgets','Budgets & funds'],['recurring','Recurring'],['reports','CA report / export'],['categories','Categories'],['roles','Users & roles'],['audit','Audit log'],['more','More (mobile)']];

const blankQ=role=>({type:'expense',amt:'',cat:null,mode:role==='owner'?'UPI':'Cash',by:ME[role],desc:'',patient:'',more:false,receipt:false,rk:null});
const demoQ=role=>({...blankQ(role),amt:'3240',cat:'Consumables',mode:'UPI',desc:'Kinesio tape, 6 rolls',more:true,receipt:true});

function initState(p){
  const role=ROLEKEY[p.role]||'owner';let screen=p.screen||'dashboard';let roleTab='roles';
  if(screen==='users'){screen='roles';roleTab='users';}
  const perms={};PERMS.forEach(x=>{if(x.k)perms[x.k]=x.v.slice();});
  return {device:(p.device||'Mobile').toLowerCase(),role,screen,roleTab,sheet:!!p.sheet,q:p.sheet?demoQ(role):blankQ(role),qErr:'',tx:SEED.slice(),search:'',fType:'All',fMode:'All',fCat:'All',fUser:'All',period:'This month',settled:false,logged:{},toast:'',perms,receipts:'Links',autoEmail:true,catTab:'Expense',cats:{Expense:EXP_CATS.slice(),Income:INC_CATS.slice()},archived:{Expense:['Printing'],Income:[]},newCat:'',auditF:'All',invite:!!p.invite,inviteRoles:['Therapist'],openedAt:Date.now()};
}
function propsChanged(self,prev){
  const p=self.props,u={};
  if(p.device!==prev.device&&p.device)u.device=p.device.toLowerCase();
  if(p.role!==prev.role&&p.role){u.role=ROLEKEY[p.role]||'owner';u.q=blankQ(u.role);}
  if(p.screen!==prev.screen&&p.screen){u.screen=p.screen==='users'?'roles':p.screen;if(p.screen==='users')u.roleTab='users';}
  if(p.sheet!==prev.sheet)u.sheet=!!p.sheet;
  if(Object.keys(u).length)self.setState(u);
}

function compute(self){
  const s=self.state,set=o=>self.setState(o),role=s.role,me=ME[role],isOwner=role==='owner',mobile=s.device==='mobile',desktop=!mobile;
  const embedded=self.props.chrome===false;
  const go=screen=>set({screen,sheet:false});
  const flash=t=>{set({toast:t});clearTimeout(self._t);self._t=setTimeout(()=>self.setState({toast:''}),2600);};
  const openAdd=pre=>set({sheet:true,q:{...blankQ(role),...(pre&&pre.cat?pre:{})},qErr:'',openedAt:Date.now()});
  const setQ=(k,v)=>self.setState(st=>({q:{...st.q,[k]:v},qErr:''}));
  const seg=(opts,cur,fn)=>opts.map((o,i)=>{const v=Array.isArray(o)?o[0]:o,label=Array.isArray(o)?o[1]:o;return {label,icon:Array.isArray(o)&&o[2]?'icon-'+o[2]:'',bg:v===cur?'var(--color-accent)':'#fff',bl:i?'2px solid var(--color-text)':'0',onClick:()=>fn(v)};});
  const authed=s.screen!=='login'&&s.screen!=='invite';
  const on={};Object.keys(NAV).forEach(k=>on[k]=s.screen===k);
  const lbl=k=>LBL[role][k]||NAV[k].l;
  const mk=k=>{const a=s.screen===k;return {label:lbl(k),icon:'icon-'+NAV[k].i,bg:a?'var(--color-accent-100)':'transparent',fg:a?'var(--color-accent-900)':'var(--color-text)',bar:a?'var(--color-accent)':'transparent',w:a?'800':'500',onClick:()=>go(k)};};
  const mainKeys=isOwner?['dashboard','transactions','settlement','budgets','recurring','reports']:['dashboard','transactions'];
  const setKeys=isOwner?['categories','roles','audit']:[];
  const moreKeys=['budgets','recurring','reports','categories','roles','audit'];
  const tabDefs=isOwner?[['dashboard','Home','house'],['transactions','Entries','list'],['ADD'],['settlement','Settle','scale'],['more','More','ellipsis']]:[['dashboard','Home','house'],['ADD'],['transactions','Entries','list']];
  const tabs=tabDefs.map(t=>{if(t[0]==='ADD')return {isAdd:true,notAdd:false};const a=s.screen===t[0]||(t[0]==='more'&&moreKeys.includes(s.screen));return {isAdd:false,notAdd:true,label:t[1],icon:'icon-'+t[2],fg:a?'var(--color-text)':'var(--color-neutral-600)',bar:a?'var(--color-accent)':'transparent',w:a?'800':'500',onClick:()=>go(t[0])};});

  // transactions
  const scoped=s.tx.filter(t=>isOwner||t.rec===me);
  const qs=s.search.trim().toLowerCase();
  const filt=scoped.filter(t=>(s.fType==='All'||(s.fType==='Expense'?t.type==='out':t.type==='in'))&&(s.fMode==='All'||t.mode===s.fMode)&&(s.fCat==='All'||t.cat===s.fCat)&&(s.fUser==='All'||t.by===s.fUser||t.rec===s.fUser)&&(!qs||(t.desc+' '+t.cat+' '+(t.patient||'')+' '+PEOPLE[t.by].short).toLowerCase().includes(qs)));
  const rowOf=t=>{const editable=isOwner||(t.rec===me&&TODAY-t.d<=7);return {day:String(t.d).padStart(2,'0'),title:t.desc,sub:[t.cat,t.mode,(t.type==='out'?'paid by ':'received by ')+PEOPLE[t.by].short].join(' · '),patient:t.patient?'Patient: '+t.patient:'',hasPatient:!!t.patient,amtLabel:(t.type==='out'?'−':'+')+inr(t.amt),amtColor:t.type==='out'?'var(--color-text)':'var(--color-accent-700)',rec:'Recorded by '+PEOPLE[t.rec].short,receipt:!!t.receipt,editable,locked:!editable,bg:t.isNew?'var(--color-accent-100)':'transparent'};};
  const sum=(a,ty)=>a.filter(t=>t.type===ty).reduce((x,t)=>x+t.amt,0);

  let tiles;
  if(isOwner){tiles=[{label:'Income',value:'₹3,29,100',sub:'+10% vs Sep',color:'var(--color-accent-700)'},{label:'Expense',value:'₹1,50,550',sub:'+14% vs Sep',color:'var(--color-text)'},{label:'Net',value:'₹1,78,550',sub:'+7% vs Sep',color:'var(--color-text)'},{label:'Cash in hand',value:'₹22,450',sub:'Cash in ₹41,200 − out ₹18,750',color:'var(--color-text)'}];}
  else{const mine=s.tx.filter(t=>t.rec===me);const held=mine.filter(t=>t.by===me&&t.mode==='Cash').reduce((x,t)=>x+(t.type==='in'?t.amt:-t.amt),0);
    tiles=[{label:'Entries logged',value:String(mine.length),sub:'This month',color:'var(--color-text)'},{label:'Income logged',value:inr(sum(mine,'in')),sub:'Patient payments',color:'var(--color-accent-700)'},{label:'Expense logged',value:inr(sum(mine,'out')),sub:'Paid for the clinic',color:'var(--color-text)'},{label:'Cash you hold',value:inr(held),sub:role==='frontdesk'?'Collected at desk':'Net cash on you',color:'var(--color-text)'}];}
  const maxS=Math.max(...EXP.map(e=>e.spent));
  const breakdown=EXP.map(e=>{const ch=e.last?Math.round((e.spent-e.last)/e.last*100):null;return {name:e.n,spentL:inr(e.spent),relW:(e.spent/maxS*100).toFixed(1)+'%',mom:ch===null?'new':(ch>0?'+':'')+ch+'%',momColor:ch>20?'#9A1A00':'var(--color-neutral-700)'};});
  const tone=p=>p>=1?{bg:'#FFE4DE',fg:'#9A1A00',bar:'#E5391B',st:'Over budget'}:p>=0.8?{bg:'#FFF1D1',fg:'#7A4F00',bar:'#E8A317',st:'Near limit'}:{bg:'var(--color-accent-100)',fg:'var(--color-accent-800)',bar:'var(--color-accent)',st:'On track'};
  const budgetRows=EXP.map(e=>{const p=e.spent/e.budget,t=tone(p);return {name:e.n,spentL:inr(e.spent),budgetL:inr(e.budget),barW:Math.min(100,p*100).toFixed(1)+'%',barC:t.bar,tagBg:t.bg,tagFg:t.fg,status:t.st,pctL:Math.round(p*100)+'%'};});

  const rStat=r=>{if(r.logged||s.logged[r.k])return {st:'Logged',bg:'var(--color-accent-100)',fg:'var(--color-accent-800)',lg:true};if(r.day<TODAY)return {st:'Overdue · due '+r.day+' Oct',bg:'#FFE4DE',fg:'#9A1A00'};return {st:'Due '+r.day+' Oct',bg:'var(--color-neutral-200)',fg:'var(--color-neutral-800)'};};
  const logR=r=>()=>openAdd({cat:r.cat,amt:String(r.amt),desc:r.n,rk:r.k,mode:'Bank transfer',by:'Clinic'});
  const recurRows=RECUR.map(r=>{const x=rStat(r);return {name:r.n,cat:r.cat,amtL:inr(r.amt),dayP:String(r.day).padStart(2,'0'),day:r.day,status:x.st,tagBg:x.bg,tagFg:x.fg,canLog:!x.lg,done:!!x.lg,btnBg:r.day<TODAY?'var(--color-accent)':'#fff',onLog:logR(r)};});
  const nLogged=recurRows.filter(r=>r.done).length,nOver=recurRows.filter(r=>!r.done&&r.day<TODAY).length;
  const recurDash=recurRows.filter(r=>!r.done).map(r=>({...r,status:r.day<TODAY?'Overdue':'Due '+r.day+' Oct',tagBg:r.day<TODAY?'#FFE4DE':'var(--color-neutral-200)',tagFg:r.day<TODAY?'#9A1A00':'var(--color-neutral-800)'}));
  const attention=[...RECUR.filter(r=>!rStat(r).lg&&r.day<TODAY).map(r=>({tone:'#E5391B',text:r.n+' not logged',sub:'Recurring · '+inr(r.amt)+' expected on '+r.day+' Oct',cta:'Log now',onClick:logR(r)})),...EXP.filter(e=>e.spent/e.budget>=0.8).map(e=>{const p=e.spent/e.budget;return {tone:p>=1?'#E5391B':'#E8A317',text:e.n+' at '+Math.round(p*100)+'% of budget',sub:inr(e.spent)+' of '+inr(e.budget),cta:'Budgets',onClick:()=>go('budgets')};})];

  const net=PARTNERS.reduce((a,p)=>a+p.recv-p.paid,0);
  const pr=PARTNERS.map(p=>({...p,bal:Math.round(p.recv-p.paid-net*p.share/100)}));
  const debt=pr.filter(r=>r.bal>0).map(r=>({k:r.k,v:r.bal})).sort((a,b)=>b.v-a.v),cred=pr.filter(r=>r.bal<0).map(r=>({k:r.k,v:-r.bal})).sort((a,b)=>b.v-a.v);
  const transfers=[];let i=0,j=0;while(i<debt.length&&j<cred.length){const v=Math.min(debt[i].v,cred[j].v);transfers.push({from:PEOPLE[debt[i].k].short,to:PEOPLE[cred[j].k].short,amt:inr(v)});debt[i].v-=v;cred[j].v-=v;if(debt[i].v<1)i++;if(cred[j].v<1)j++;}
  const owedTotal=pr.filter(r=>r.bal>0).reduce((a,r)=>a+r.bal,0);
  const partnerRows=pr.map(p=>({name:PEOPLE[p.k].full,ini:PEOPLE[p.k].ini,share:p.share+'%',paid:inr(p.paid),recv:inr(p.recv),balLabel:s.settled?'Balance':(p.bal>0?'Owes':'Is owed'),bal:s.settled?'₹0':inr(p.bal),balColor:s.settled?'var(--color-neutral-700)':(p.bal>0?'#9A1A00':'var(--color-accent-700)')}));
  const settleHistory=[...(s.settled?[{period:'1–14 Oct 2026',meta:'Settled today by '+PEOPLE[me].short+' · '+transfers.length+' payments',amt:inr(owedTotal)}]:[]),{period:'September 2026',meta:'Settled 2 Oct by Rushikesh Y. · 3 payments',amt:'₹31,240'},{period:'August 2026',meta:'Settled 3 Sep by Sameer U. · 2 payments',amt:'₹18,960'}];

  const q=s.q,isInc=q.type==='income';
  const qCats=(isInc?s.cats.Income:s.cats.Expense).map(c=>({name:c,bg:q.cat===c?'var(--color-accent)':'#fff',bd:q.cat===c?'var(--color-text)':'var(--color-neutral-300)',onClick:()=>setQ('cat',c)}));
  const byKeys=isOwner?['Sameer','RY','RP','Santosh','Clinic']:[me,'Clinic'];
  const amtN=parseFloat(String(q.amt).replace(/[^\d.]/g,''))||0;
  const save=()=>{if(!amtN){set({qErr:'Enter an amount.'});return;}if(!q.cat){set({qErr:'Pick a category.'});return;}
    const t={id:Date.now(),d:TODAY,type:isInc?'in':'out',cat:q.cat,desc:q.desc||(q.patient?q.cat+' · '+q.patient:q.cat),patient:q.patient,mode:q.mode,amt:amtN,by:q.by,rec:me,receipt:q.receipt,isNew:true};
    const secs=Math.max(1,Math.round((Date.now()-s.openedAt)/1000));
    set({tx:[t,...s.tx],sheet:false,logged:q.rk?{...s.logged,[q.rk]:true}:s.logged});flash('Saved '+inr(amtN)+' · '+q.cat+' · '+secs+'s');};

  const roleCols=[{name:'Owner',users:'4 users'},{name:'Therapist',users:'1 user'},{name:'Front desk',users:'1 user'},{name:'CA (read-only)',users:'1 invited'}];
  const cyc={'All':'Own','Own':'—','—':'All'};
  const cellStyle=v=>v==='All'?{bg:'var(--color-accent)',fg:'var(--color-text)',bd:'2px solid var(--color-text)'}:v==='Own'?{bg:'var(--color-accent-100)',fg:'var(--color-accent-900)',bd:'2px solid var(--color-accent-400)'}:{bg:'transparent',fg:'var(--color-neutral-500)',bd:'2px solid transparent'};
  const permRows=PERMS.map(p=>p.g?{isGroup:true,isPerm:false,label:p.g}:{isGroup:false,isPerm:true,label:p.l,key:p.k,op:p.later?'.55':'1',cells:s.perms[p.k].map((v,ci)=>({v:v==='—'?'None':v,...cellStyle(v),onClick:()=>{if(ci===0||p.later)return;const np={...s.perms,[p.k]:s.perms[p.k].map((x,k)=>k===ci?cyc[x]:x)};set({perms:np});}}))});
  const users=USERS.map(u=>{const pp=u.p?PEOPLE[u.p]:null;return {name:pp?pp.full:u.name,ini:pp?pp.ini:u.ini,contact:u.c,roles:u.r,status:u.invited?'Invited':'Active',stFg:u.invited?'#7A4F00':'var(--color-neutral-700)',avBg:u.r[0]==='Owner'?'var(--color-accent)':'#fff'};});

  const auditRows=AUDIT.filter(a=>s.auditF==='All'||a.k===s.auditF).map(a=>{const tg={Created:['var(--color-accent-100)','var(--color-accent-800)'],Edited:['#FFF1D1','#7A4F00'],Deleted:['#FFE4DE','#9A1A00'],Settings:['var(--color-neutral-200)','var(--color-neutral-800)'],Settled:['var(--color-accent)','var(--color-text)']}[a.a];return {t:a.t,u:a.u,action:a.a,entity:a.e,before:a.b,hasBefore:!!a.b,after:a.af,tagBg:tg[0],tagFg:tg[1]};});

  const catRows=s.cats[s.catTab].map(c=>{const r=RECUR.filter(x=>x.cat===c);return {name:c,hasRec:s.catTab==='Expense'&&r.length>0,rec:r.map(x=>x.n+' '+inr(x.amt)+' on day '+x.day).join(' · '),onArchive:()=>set({cats:{...s.cats,[s.catTab]:s.cats[s.catTab].filter(x=>x!==c)},archived:{...s.archived,[s.catTab]:[...s.archived[s.catTab],c]}})};});
  const archRows=s.archived[s.catTab].map(c=>({name:c,onRestore:()=>set({archived:{...s.archived,[s.catTab]:s.archived[s.catTab].filter(x=>x!==c)},cats:{...s.cats,[s.catTab]:[...s.cats[s.catTab],c]}})}));

  const W=mobile?390:1280,H=mobile?844:800;
  const title=on.login?'Sign in':on.invite?'Accept invite':lbl(s.screen);
  return {
    showChrome:!embedded, stagePad:embedded?'0':'32px 16px',
    fw:W+(mobile?20:2)+'px', fh:H+(mobile?20:2)+'px', fBorder:mobile?'10px solid #201e1d':'1px solid #c9c9d6', fRadius:mobile?'48px':'10px',
    isMobile:mobile,isDesktop:desktop, statusBg:'var(--color-bg)',
    devSeg:seg(['Mobile','Desktop'],mobile?'Mobile':'Desktop',v=>set({device:v.toLowerCase()})),
    roleSeg:seg(['Owner','Therapist','Front desk'],ROLELABEL[role],v=>{const r=ROLEKEY[v];set({role:r,q:blankQ(r),screen:r!=='owner'&&!['dashboard','transactions','login','invite'].includes(s.screen)?'dashboard':s.screen});}),
    screen:s.screen, screenOpts:SCREEN_OPTS.map(o=>({v:o[0],l:o[1]})), onScreenSel:e=>{const v=e.target.value;set({screen:v,sheet:false,role:['dashboard','transactions','login','invite','more'].includes(v)?role:'owner'});},
    showSidebar:desktop&&authed, showTopbar:desktop&&authed, showMobileHeader:mobile&&authed, showTabs:mobile&&authed,
    hasSettingsNav:setKeys.length>0, navMain:mainKeys.map(mk), navSet:setKeys.map(mk), tabs,
    meIni:PEOPLE[me].ini, meName:PEOPLE[me].full, meShort:PEOPLE[me].short, roleLabel:ROLELABEL[role],
    signOut:()=>go('login'), signIn:()=>go('dashboard'), goInvite:()=>go('invite'), acceptInvite:()=>{set({role:'therapist',screen:'dashboard'});flash('Welcome, Dr. Anjali');},
    title, subtitle:SUB[s.screen]||'', offline:false,
    sbw:mobile?'none':'thin', cPad:mobile?'16px 16px 24px':'24px 32px 40px', gapLg:mobile?'20px':'28px', tileFs:mobile?'22px':'28px',
    authMargin:mobile?'0':'-24px -32px -40px', authPad:mobile?'24px 8px':'48px 56px',
    on, isOwner, notOwner:!isOwner,
    showPeriod:isOwner&&on.dashboard, periodInContent:mobile&&isOwner,
    periodSeg:seg(['Today','This week','This month'],s.period,v=>set({period:v})),
    openAdd:()=>openAdd(), closeAdd:()=>set({sheet:false}),
    tiles, attention, breakdown, transfers, settled:s.settled, notSettled:!s.settled,
    recurDash:recurDash.slice(0,3), recurSummary:nLogged+' of '+RECUR.length+' logged',
    recentTitle:isOwner?'Latest entries':'Your latest entries', recent:scoped.slice(0,5).map(rowOf),
    goSettlement:()=>go('settlement'), goRecurring:()=>go('recurring'), goTransactions:()=>go('transactions'),
    search:s.search, onSearch:e=>set({search:e.target.value}),
    typeSeg:seg(['All','Income','Expense'],s.fType,v=>set({fType:v})),
    fCat:s.fCat, onFCat:e=>set({fCat:e.target.value}), catOpts:[{v:'All',l:'All categories'},...[...EXP_CATS,...INC_CATS].map(c=>({v:c,l:c}))],
    fMode:s.fMode, onFMode:e=>set({fMode:e.target.value}), modeOpts:[{v:'All',l:'All modes'},...MODES.map(m=>({v:m,l:m}))],
    fUser:s.fUser, onFUser:e=>set({fUser:e.target.value}), userOpts:[{v:'All',l:'Everyone'},...['Sameer','RY','RP','Santosh','Anjali','Pooja','Clinic'].map(k=>({v:k,l:PEOPLE[k].short}))],
    txRows:filt.map(rowOf), txEmpty:filt.length===0, txCount:String(filt.length), txIn:inr(sum(filt,'in')), txOut:inr(sum(filt,'out')),
    markSettled:()=>{set({settled:true});flash('Settlement recorded · '+transfers.length+' payments');}, undoSettle:()=>set({settled:false}),
    settleNet:inr(net), partnerRows, settleHistory,
    budgetRows, funds:[{name:'Equipment fund',rule:'10% of monthly net',bal:'₹1,42,300',alloc:'₹17,860',drawn:'₹12,500'},{name:'Emergency reserve',rule:'₹10,000 fixed each month',bal:'₹85,000',alloc:'₹10,000',drawn:'₹0'},{name:'Clinic expansion',rule:'Manual top-ups',bal:'₹2,40,000',alloc:'₹0',drawn:'₹0'}],
    recurStats:[{label:'Logged',value:nLogged+'/'+RECUR.length,color:'var(--color-text)'},{label:'Overdue',value:String(nOver),color:nOver?'#9A1A00':'var(--color-text)'},{label:'Expected',value:'₹1,04,399',color:'var(--color-text)'}],
    recurRows, goCategoriesLink:e=>{e.preventDefault();go('categories');},
    genPdf:()=>flash('CA report for September ready · 6 pages'),
    exportBtns:[{label:'Excel (.xlsx)',icon:'icon-sheet',onClick:()=>flash('Exported September as Excel')},{label:'CSV',icon:'icon-file-spreadsheet',onClick:()=>flash('Exported September as CSV')},{label:'Receipts (.zip)',icon:'icon-folder-archive',onClick:()=>flash('Zipped 38 receipt photos')},{label:'Email to CA',icon:'icon-send',onClick:()=>flash('Sent to accounts@kulkarnica.in')}],
    receiptSeg:seg([['Links','As links'],['Embed','Embedded'],['None','Leave out']],s.receipts,v=>set({receipts:v})),
    receiptsMode:s.receipts==='Links'?'linked':s.receipts==='Embed'?'embedded in appendix':'not included',
    toggleAutoEmail:()=>set({autoEmail:!s.autoEmail}), autoBg:s.autoEmail?'var(--color-accent)':'#fff', autoKnob:s.autoEmail?'22px':'2px',
    reportCats:[['Rent','₹60,000'],['Salaries','₹38,000'],['Consumables','₹14,650'],['Utilities','₹7,420'],['Marketing','₹5,000'],['Other','₹6,830']].map(x=>({n:x[0],v:x[1]})),
    reportTx:[['01 Sep','Salaries · Watchman','Cash','₹9,000'],['01 Sep','Salaries · Staff','Bank','₹21,000'],['02 Sep','Clinic session · R. Pawar','UPI','₹600'],['03 Sep','Consumables · Gel','UPI','₹2,150'],['05 Sep','Rent · September','Bank','₹60,000'],['05 Sep','Package · A. Kulkarni','Card','₹6,000']].map(x=>({d:x[0],c:x[1],m:x[2],a:x[3]})),
    catTabSeg:seg(['Expense','Income'],s.catTab,v=>set({catTab:v})), newCat:s.newCat, onNewCat:e=>set({newCat:e.target.value}),
    addCat:()=>{const n=s.newCat.trim();if(!n)return;set({cats:{...s.cats,[s.catTab]:[...s.cats[s.catTab],n]},newCat:''});flash('Added '+n);},
    catRows, archRows, hasArchived:archRows.length>0,
    roleTabSeg:seg([['roles','Roles & permissions'],['users','Users']],s.roleTab,v=>set({roleTab:v})), roleTabRoles:s.roleTab==='roles', roleTabUsers:s.roleTab==='users',
    roleCols, permRows, users,
    openInvite:()=>set({invite:true}), closeInvite:()=>set({invite:false}), inviteOpen:s.invite,
    sendInvite:()=>{set({invite:false});flash('Invite sent on WhatsApp');},
    inviteRoleChips:['Owner','Therapist','Front desk','CA (read-only)'].map(r=>({label:r,bg:s.inviteRoles.includes(r)?'var(--color-accent)':'#fff',onClick:()=>set({inviteRoles:s.inviteRoles.includes(r)?s.inviteRoles.filter(x=>x!==r):[...s.inviteRoles,r]})})),
    auditSeg:seg(['All','Entries','Settings'],s.auditF,v=>set({auditF:v})), auditRows,
    moreItems:moreKeys.map(k=>({label:NAV[k].l,icon:'icon-'+NAV[k].i,onClick:()=>go(k)})),
    sheet:s.sheet,
    sp:mobile?{left:'0',top:'64px',bt:'2px solid var(--color-text)',bl:'0'}:{left:'calc(100% - 460px)',top:'0',bt:'0',bl:'2px solid var(--color-text)'},
    q, qTypeSeg:seg([['expense','Expense','arrow-up-right'],['income','Income','arrow-down-left']],q.type,v=>self.setState(st=>({q:{...st.q,type:v,cat:null}}))),
    onAmt:e=>setQ('amt',e.target.value.replace(/[^\d]/g,'')),
    qCatLabel:isInc?'Income type':'Category', qCats,
    qModes:MODES.map((m,k)=>({label:m==='Bank transfer'?'Bank':m,bg:q.mode===m?'var(--color-accent)':'#fff',bl:k?'2px solid var(--color-text)':'0',onClick:()=>setQ('mode',m)})),
    qByLabel:isInc?'Received by':'Paid by', qByOpts:byKeys.map(k=>({v:k,l:k===me?PEOPLE[k].short+' (me)':PEOPLE[k].short})), onBy:e=>setQ('by',e.target.value),
    qIsIncome:isInc, onPatient:e=>setQ('patient',e.target.value), onDesc:e=>setQ('desc',e.target.value),
    qMoreClosed:!q.more, toggleQMore:()=>setQ('more',true),
    toggleReceipt:()=>setQ('receipt',!q.receipt), rcBd:q.receipt?'var(--color-accent-700)':'var(--color-neutral-500)', rcBg:q.receipt?'var(--color-accent-100)':'#fff', rcIcon:q.receipt?'icon-circle-check':'icon-camera', rcLabel:q.receipt?'receipt_1014.jpg attached':'Add receipt photo', rcSub:q.receipt?'Tap to remove':'Camera or gallery',
    qErr:!!s.qErr, qErrMsg:s.qErr, save, saveBg:amtN&&q.cat?'var(--color-accent)':'var(--color-neutral-200)', saveLabel:amtN?'Save '+inr(amtN)+(q.cat?' · '+q.cat:''):'Save',
    hasToast:!!s.toast, toast:s.toast, toastBottom:mobile&&authed?'110px':'28px'
  };
}
window.ClinicOS={initState,propsChanged,compute};
})();
