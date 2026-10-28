(function(){
const TH={sameer:{full:'Dr. Sameer Ushkewar',short:'Dr. Sameer',ini:'SU'},neha:{full:'Dr. Neha Patil',short:'Dr. Neha',ini:'NP'},rahul:{full:'Rahul Deshpande',short:'Rahul',ini:'RD'}};
const THK=['sameer','neha','rahul'];
const ME={owner:{name:'Dr. Sameer Ushkewar',short:'Dr. Sameer',ini:'SU',th:'sameer'},therapist:{name:'Dr. Neha Patil',short:'Dr. Neha',ini:'NP',th:'neha'},frontdesk:{name:'Snehal More',short:'Snehal',ini:'SM',th:null}};
const ROLEKEY={'Owner':'owner','Therapist':'therapist','Front desk':'frontdesk'},ROLELABEL={owner:'Owner',therapist:'Therapist',frontdesk:'Front desk'};
const DAYS=[['Mon','27 Oct'],['Tue','28 Oct'],['Wed','29 Oct'],['Thu','30 Oct'],['Fri','31 Oct'],['Sat','1 Nov'],['Sun','2 Nov']].map((d,i)=>({i,dow:d[0],dm:d[1],lbl:d[0]+' '+d[1]}));
const DOWF=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TODAY=1,NOW=620;
const CLINIC={addr:'Lane No. 2, Bhagyoday Colony, Karvenagar, Pune',phone:'+91 98220 41736',tel:'tel:+919822041736',map:'https://maps.google.com/?q=ATP+Rehab+Bhagyoday+Colony+Karvenagar+Pune'};
const BR={kvn:{name:'Karvenagar',code:'KVN',addr:'Lane No. 2, Bhagyoday Colony, Karvenagar, Pune',phone:'+91 98220 41736'},ktd:{name:'Kothrud',code:'KTD',addr:'Paud Road, near Vanaz Corner, Kothrud, Pune',phone:'+91 98220 41737'},wrj:{name:'Warje',code:'WRJ',addr:'Warje Malwadi Road, Warje, Pune',phone:'+91 98220 41738'}};
const BRK=['kvn','ktd','wrj'];
const PBR={priya:'kvn',amit:'kvn',sunita:'kvn',rohan:'kvn',meera:'ktd',kavita:'kvn',deepak:'wrj',anil:'ktd',walkin:'kvn'};
const IBR={i1:'ktd',i2:'kvn',i3:'kvn',i4:'wrj',i5:'kvn',i6:'ktd',i7:'kvn',i8:'kvn'};
const tm=x=>{const a=String(x).split(':').map(Number);return a[0]*60+(a[1]||0);};
const hm=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const rng=(a,b)=>hm(a)+'–'+hm(b);
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const dig=p=>String(p||'').replace(/\D/g,'').slice(-10);
const wa=(phone,text)=>'https://wa.me/91'+dig(phone)+'?text='+encodeURIComponent(text);
const telOf=p=>'tel:+91'+dig(p);
const fmtPhone=p=>{const d=dig(p);return d.length===10?'+91 '+d.slice(0,5)+' '+d.slice(5):p;};
const mask=p=>{const d=dig(p);return '+91 '+d.slice(0,2)+'xxx xxx'+d.slice(8);};
const partOf=m=>m<720?'Morning':m<960?'Afternoon':'Evening';
const ini=n=>n.replace(/^Dr\.\s*/,'').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const R=(s,e,loc,br)=>({s:tm(s),e:tm(e),loc:loc||'Clinic',br:br||'kvn'});
function seedHours(){const wk=(f,sat)=>[f(),f(),f(),f(),f(),sat,[]];
  return {sameer:wk(()=>[R('09:00','14:00','Clinic','kvn'),R('17:00','20:00','Clinic','wrj')],[R('09:00','13:00','Clinic','ktd')]),
    neha:wk(()=>[R('09:00','13:00','Clinic','kvn'),R('16:00','20:00','Clinic','ktd')],[R('09:00','13:00','Clinic','kvn')]),
    rahul:wk(()=>[R('10:00','14:00','Home visits','kvn'),R('16:00','19:00','Clinic','wrj')],[R('09:00','13:00','Home visits','kvn')])};}
const A=(id,day,s,e,pid,th,loc,st,src)=>({id,day,s:tm(s),e:tm(e),pid,th,loc:loc||'Clinic',st:st||'confirmed',src:src||'Phone call'});
const APPTS=[A('a1',1,'09:00','09:45','priya','neha','Clinic','completed'),A('a2',1,'10:00','10:45','amit','neha'),A('a3',1,'10:00','11:00','sunita','rahul','Home'),A('a4',1,'11:30','12:15','rohan','sameer','Clinic','noshow'),{...A('a5',1,'16:00','16:45','meera','neha','Clinic','confirmed','Web request'),pending:true},
A('b1',0,'09:00','09:45','kavita','neha','Clinic','completed'),A('b2',0,'10:00','11:00','sunita','rahul','Home','completed'),A('b3',0,'17:30','18:15','deepak','sameer','Clinic','completed'),A('b4',0,'18:00','18:45','anil','neha','Clinic','completed'),
A('c1',2,'09:30','10:15','deepak','sameer'),A('c2',2,'18:00','18:45','amit','neha'),A('c3',2,'10:00','11:00','sunita','rahul','Home'),
A('d1',3,'10:00','10:45','kavita','sameer'),A('d2',3,'16:30','17:15','anil','rahul'),
A('e1',4,'09:00','09:45','priya','neha'),A('e2',4,'10:00','11:00','sunita','rahul','Home'),A('e3',4,'18:00','18:45','deepak','sameer'),
A('f1',5,'09:00','10:00','sunita','rahul','Home'),A('f2',5,'10:00','10:45','kavita','neha')];
const OFF=[{id:'o1',th:'sameer',day:1,s:780,e:840,reason:'Personal',label:'Lunch',when:'Tue 28 Oct · 13:00–14:00'},{id:'o2',th:'neha',day:3,s:480,e:1200,reason:'Leave',label:'Leave',when:'Thu 30 Oct · all day'},{id:'o3',th:'rahul',day:9,s:480,e:1200,reason:'Training',label:'Training',when:'Mon 3 – Wed 5 Nov · all day',note:'IAP workshop, Mumbai'}];
const PATIENTS=[
{id:'priya',name:'Priya Kulkarni',age:34,g:'Female',phone:'+91 98220 41721',email:'priya.k@gmail.com',ref:'Doctor',refNote:'Dr. Apte',complaint:'Right knee pain after running',addr:'Flat 6, Shreeyash Apartments, Karvenagar, Pune',th:'neha',visits:6,noshow:0,pkg:{name:'10 sessions',total:10,used:6,sold:'12 Oct',price:6000}},
{id:'amit',name:'Amit Joshi',age:52,g:'Male',phone:'+91 98904 37712',email:'',ref:'Google',complaint:'Lower back pain, desk job',addr:'B-203, Karve Nagar Housing Society, Pune',th:'neha',visits:2,noshow:0},
{id:'sunita',name:'Sunita Pawar',age:67,g:'Female',phone:'+91 94221 58830',email:'',ref:'Doctor',refNote:'Dr. Kulkarni',complaint:'Post knee replacement rehab, home visits',addr:'Plot 18, Hingne Home Colony, Karvenagar, Pune',th:'rahul',visits:9,noshow:0},
{id:'rohan',name:'Rohan Gokhale',age:19,g:'Male',phone:'+91 77200 91463',email:'rohan.g19@gmail.com',ref:'Friend',complaint:'Ankle sprain, football',addr:'Warje, Pune',th:'sameer',visits:1,noshow:1},
{id:'meera',name:'Meera Shah',age:41,g:'Female',phone:'+91 98230 11842',email:'meera.shah@outlook.com',ref:'Google',refNote:'Web request',complaint:'Frozen shoulder',addr:'Kothrud, Pune',th:'neha',visits:0,noshow:0},
{id:'kavita',name:'Kavita Nair',age:45,g:'Female',phone:'+91 98500 62219',email:'',ref:'Walk-in',complaint:'Neck pain, cervical spondylosis',addr:'Erandwane, Pune',th:'neha',visits:4,noshow:0},
{id:'deepak',name:'Deepak Patwardhan',age:58,g:'Male',phone:'+91 90490 17736',email:'',ref:'Doctor',complaint:'Left shoulder impingement',addr:'Karvenagar, Pune',th:'sameer',visits:3,noshow:0},
{id:'anil',name:'Anil Shinde',age:29,g:'Male',phone:'+91 88050 44190',email:'',ref:'Friend',complaint:'Hamstring strain, cricket',addr:'Warje, Pune',th:'rahul',visits:2,noshow:0},
{id:'walkin',name:'Walk-in',hidden:true,phone:'',th:'neha',complaint:'',addr:''}];
const HIST={priya:[['12 Oct','09:00','neha','completed'],['14 Oct','09:00','neha','completed'],['16 Oct','09:00','neha','completed'],['18 Oct','10:00','neha','completed'],['21 Oct','09:00','neha','completed']],amit:[['14 Oct','18:00','neha','completed'],['21 Oct','18:00','neha','completed']],rohan:[['21 Oct','11:30','sameer','completed']],sunita:[['23 Oct','10:00','rahul','completed'],['25 Oct','09:00','rahul','completed']]};
const PAY={priya:[{d:'12 Oct',amt:800,mode:'UPI',for:'Assessment · 12 Oct'},{d:'12 Oct',amt:6000,mode:'Card',for:'Package · 10 sessions'}],amit:[{d:'14 Oct',amt:800,mode:'Cash',for:'Session · 14 Oct'},{d:'21 Oct',amt:800,mode:'UPI',for:'Session · 21 Oct'}],sunita:[{d:'23 Oct',amt:1200,mode:'UPI',for:'Home visit · 23 Oct'},{d:'25 Oct',amt:1200,mode:'Cash',for:'Home visit · 25 Oct'},{d:'27 Oct',amt:1200,mode:'UPI',for:'Home visit · 27 Oct'}],rohan:[{d:'21 Oct',amt:800,mode:'Cash',for:'Session · 21 Oct'}]};
const NOTES=[
{id:'n5',pid:'priya',kind:'Session',by:'neha',date:'Today, 09:45',sess:'Tue 28 Oct, 09:00',text:'Pain 3/10. Started single-leg squats. Home exercises updated; keep icing after runs.'},
{id:'n4',pid:'priya',kind:'General',by:'sameer',date:'24 Oct',sess:'',text:'Asked about running shoes. Suggested a gait check at the next visit.'},
{id:'n3',pid:'priya',kind:'Session',by:'neha',date:'21 Oct',sess:'Tue 21 Oct, 09:00',text:'Pain 4/10. Added step-downs and side planks. Tolerated well.'},
{id:'n2',pid:'priya',kind:'Treatment plan',by:'neha',date:'12 Oct',sess:'',text:'10 sessions over 4 weeks. Quads and glute strengthening, patellar taping, ITB release. Easy running from week 3.'},
{id:'n1',pid:'priya',kind:'Diagnosis',by:'neha',date:'12 Oct',sess:'Assessment, 12 Oct',text:'Patellofemoral pain, right knee. Pain 6/10 on stairs and after 3 km. Weak hip abductors, tight ITB.'},
{id:'n6',pid:'amit',kind:'Diagnosis',by:'neha',date:'14 Oct',sess:'Tue 14 Oct, 18:00',text:'Mechanical low back pain, L4–L5. No radiating symptoms. Sits 9–10 hours a day.'}];
const INQ=[
{id:'i1',name:'Meera Shah',phone:'+91 98230 11842',email:'meera.shah@outlook.com',day:'Tomorrow',dayI:2,part:'Morning',reason:'Shoulder stiff for 3 months',st:'new',ago:'12 min ago',at:'Today, 10:08'},
{id:'i2',name:'Kunal Jadhav',phone:'+91 99700 23518',email:'',day:'Any day',dayI:1,part:'Evening',reason:'Neck pain',st:'new',ago:'1 h ago',at:'Today, 09:14'},
{id:'i3',name:'Priya K.',phone:'+91 98220 41721',email:'',day:'Wed 29 Oct',dayI:2,part:'Morning',reason:'Knee pain again, want 2 more sessions',st:'new',ago:'2 h ago',at:'Today, 08:20'},
{id:'i4',name:'Vikram Rao',phone:'+91 97640 88215',email:'vikram.rao@gmail.com',day:'Today',dayI:1,part:'Afternoon',reason:'Tennis elbow',st:'new',ago:'3 h ago',at:'Today, 07:31'},
{id:'i5',name:'Asha Kale',phone:'+91 98812 66470',email:'',day:'Sat 1 Nov',dayI:5,part:'Morning',reason:'Father needs home visit after stroke',st:'contacted',ago:'Yesterday',at:'Mon, 18:40',home:true},
{id:'i6',name:'Sanjay Pandit',phone:'+91 93720 50164',email:'',day:'Thu 30 Oct',dayI:3,part:'Evening',reason:'Follow-up after ACL surgery',st:'contacted',ago:'Yesterday',at:'Mon, 12:05'},
{id:'i7',name:'Neeta Bhosale',phone:'+91 98605 31277',email:'',day:'Mon 27 Oct',dayI:0,part:'Any',reason:'Heel pain in the mornings',st:'booked',ago:'2 days ago',at:'Sun, 20:15'},
{id:'i8',name:'Test',phone:'+91 99999 99999',email:'',day:'Today',dayI:1,part:'Any',reason:'test',st:'closed',closeR:'Wrong number',ago:'3 days ago',at:'Sat, 11:02'}];
const TAG={new:['New','var(--color-accent-100)','var(--color-accent-800)','var(--color-accent-100)'],contacted:['Contacted','#FFF1D1','#7A4F00','#FFF1D1'],booked:['Booked','transparent','var(--color-text)','var(--color-text)'],closed:['Closed','var(--color-neutral-200)','var(--color-neutral-800)','var(--color-neutral-200)'],
confirmed:['Confirmed','var(--color-accent)','var(--color-text)','var(--color-accent)'],completed:['Completed','var(--color-neutral-200)','var(--color-neutral-800)','var(--color-neutral-200)'],noshow:['No-show','#FFE4DE','#9A1A00','#FFE4DE'],cancelled:['Cancelled','transparent','var(--color-neutral-700)','var(--color-neutral-400)'],pending:['Payment pending','#FFF1D1','#7A4F00','#FFF1D1'],
Diagnosis:['Diagnosis','var(--color-accent-100)','var(--color-accent-800)','var(--color-accent-100)'],'Treatment plan':['Treatment plan','transparent','var(--color-text)','var(--color-text)'],Session:['Session','var(--color-neutral-200)','var(--color-neutral-800)','var(--color-neutral-200)'],General:['General','transparent','var(--color-neutral-700)','var(--color-neutral-400)']};
const tag=k=>{const t=TAG[k];return {l:t[0],bg:t[1],fg:t[2],bd:t[3],td:k==='cancelled'?'line-through':'none',hasIcon:k==='completed'};};
const BLK={confirmed:['var(--color-accent)','4px solid var(--color-text)','var(--color-text)'],completed:['var(--color-neutral-200)','4px solid var(--color-neutral-500)','var(--color-neutral-800)'],noshow:['#FFE4DE','4px solid #E5391B','#9A1A00'],cancelled:['var(--color-neutral-100)','4px solid var(--color-neutral-300)','var(--color-neutral-600)']};
const HATCH='repeating-linear-gradient(135deg,var(--color-neutral-200) 0 6px,var(--color-neutral-100) 6px 12px)';
const CLOSE_R=['Not interested','Duplicate','Wrong number','Other'];
const STATUS_R=['Patient request','Therapist unavailable','No response','Rescheduled','Other'];
const REFS=['Doctor','Friend','Google','Walk-in','Other'];
const SCREENS=[['book','Public · Book a session'],['login','Sign in'],['calendar','Today / Calendar'],['inquiries','Inquiries'],['patients','Patients'],['patient','Patient profile'],['availability','Availability'],['branches','Branches (Owner)'],['more','More (mobile)'],['noperm','No permission']];

const brAt=(st,th,day,m)=>{const rr=(st.hours[th]||[])[day]||[];const r=rr.find(x=>m>=x.s&&m<x.e)||rr[0];return r?r.br:'kvn';};
const apBr=(st,a)=>a.br||brAt(st,a.th,a.day,a.s);
function freeSlots(st,th,day,dur,br){
  if(day<TODAY||day>6)return [];
  const ranges=((st.hours[th]||[])[day]||[]).filter(r=>!br||r.br===br);
  const busy=[...st.appts.filter(a=>a.th===th&&a.day===day&&a.st!=='cancelled').map(a=>[a.s,a.e]),...st.off.filter(o=>o.th===th&&o.day===day).map(o=>[o.s,o.e])];
  const min=day===TODAY?Math.ceil(NOW/15)*15:0,out=[];
  ranges.forEach(r=>{let t=Math.max(r.s,min);while(t+dur<=r.e){if(busy.some(b=>t<b[1]&&t+dur>b[0]))t+=15;else{out.push(t);t+=dur;}}});
  return out;
}
const matchOf=(st,phone)=>st.patients.find(p=>!p.hidden&&dig(p.phone)===dig(phone));
function mkCv(st,id){
  const q=st.inqs.find(i=>i.id===id)||st.inqs[0];const m=matchOf(st,q.phone);const day=Math.max(TODAY,q.dayI);
  let th=m?m.th:q.home?'rahul':(['neha','sameer','rahul'].find(t=>freeSlots(st,t,day,45,q.br).length)||'neha');
  return {br:q.br||'kvn',id:q.id,matchId:m?m.id:null,use:!!m,th,day,slot:null,dur:45,loc:q.home?'Home':'Clinic',addr:m?m.addr:'',more:false,done:false,apptId:null};
}
const blankAp=st=>({br:'kvn',pid:null,q:'',newP:false,th:'neha',day:TODAY,slot:null,manual:'',dur:45,loc:'Clinic',addr:'',notes:'',more:false,override:false,editId:null});
const blankBook=()=>({br:'',step:'form',name:'',phone:'',email:'',day:'Tomorrow',date:'',time:'Morning',reason:'',errs:{},limited:false});

function applyVariant(st,p){
  const v=p.variant||'';
  if(p.bookStep==='sent')st.book={...blankBook(),br:'ktd',step:'sent',name:'Meera Shah',phone:'98230 11821',day:'Tomorrow',time:'Morning',reason:'Shoulder stiff for 3 months'};
  if(p.bookStep==='filled')st.book={...blankBook(),br:'ktd',name:'Meera Shah',phone:'98230 11821',email:'meera.shah@outlook.com',day:'Tomorrow',time:'Morning',reason:'Shoulder stiff for 3 months'};
  if(p.bookStep==='errors')st.book={...blankBook(),name:'',phone:'98230 118',day:'Tomorrow',time:'Evening',reason:'Shoulder stiff',errs:{br:'Choose a branch.',name:'Enter your full name.',phone:'Enter a 10-digit mobile number.'}};
  if(p.bookStep==='limit')st.book={...blankBook(),br:'ktd',name:'Meera Shah',phone:'98230 11821',day:'Tomorrow',time:'Morning',reason:'Shoulder stiff for 3 months',limited:true};
  if(p.inquiry)st.inqSel=p.inquiry;
  if(p.inqMenu)st.inqMenu=p.inqMenu;
  if(p.sheet==='convert'){st.sheet='convert';st.cv=mkCv(st,p.inquiry||'i3');
    if(v==='slot'||v==='done'){const fs=freeSlots(st,st.cv.th,st.cv.day,45,st.cv.br);st.cv.slot=fs.find(t=>t>=960)||fs[0];}
    if(v==='done'){const c=st.cv;const a={id:'n'+1,br:c.br,day:c.day,s:c.slot,e:c.slot+c.dur,pid:c.matchId,th:c.th,loc:c.loc,st:'confirmed',src:'Web request'};st.appts=[...st.appts,a];c.done=true;c.apptId=a.id;st.inqs=st.inqs.map(i=>i.id===c.id?{...i,st:'booked'}:i);}
    if(v==='home'){st.cv=mkCv(st,'i5');}}
  if(p.sheet==='appt'){st.sheet='appt';st.ap=blankAp(st);
    if(v==='conflict')Object.assign(st.ap,{pid:'rohan',th:'neha',manual:'10:00'});
    else if(v==='hours')Object.assign(st.ap,{pid:'kavita',th:'neha',manual:'14:00'});
    else if(v==='search')Object.assign(st.ap,{q:'9822'});
    else Object.assign(st.ap,{pid:'amit',th:'neha',day:2});}
  if(p.sheet==='detail'){st.sheet='detail';const id=p.appt||'a2';st.dt={id,mode:v||'view',reason:v==='cancel'?'Patient request':'',note:'',usePkg:true,pay:false,amt:'800',payMode:'UPI'};
    if(v==='complete')st.appts=st.appts.map(a=>a.id===id?{...a,st:'confirmed'}:a);}
  if(p.sheet==='patient'){st.sheet='patient';st.fm=v==='dup'?{name:'Priya K',phone:'98220 41721',email:'',age:'34',gender:'Female',addr:'',ref:'Google',complaint:'Knee pain'}:{name:'Kunal Jadhav',phone:'99700 23518',email:'',age:'31',gender:'Male',addr:'Karvenagar, Pune',ref:'Google',complaint:'Neck pain'};}
  if(p.sheet==='sellpkg'){st.sheet='sellpkg';st.fm={pkName:'10 sessions',pkN:'10',pkPrice:'6000',mode:'UPI',br:'kvn'};}
  if(p.sheet==='payment'){st.sheet='payment';st.fm={amt:'800',mode:'UPI',for:'Session · Tue 28 Oct, 09:00',br:'kvn'};}
  if(p.sheet==='branch'){st.sheet='branch';st.fm={bName:'Baner',bCode:'BNR',bAddr:'Shop 4, Baner Road, near Balewadi Phata, Baner, Pune',bPhone:'+91 98220 41739',bPublic:true,editId:null};}
  if(p.sheet==='timeoff'){st.sheet='timeoff';st.fm={th:'rahul',from:'2026-11-08',fromT:'09:00',to:'2026-11-08',toT:'13:00',reason:'Personal',note:'Family function'};}
  if(p.toast==='booked'||p.toast==='both')st.toasts.push({id:1,msg:'Booked Priya Kulkarni · Tue 28 Oct, 10:00 with Dr. Neha',tone:'ok'});
  if(p.toast==='taken'||p.toast==='both')st.toasts.push({id:2,msg:'Slot just got taken: pick another time',tone:'danger'});
}
function initState(p){
  const role=ROLEKEY[p.role]||'frontdesk';
  const st={br:p.branch||'all',lb:p.listBranch?{[p.screen||'calendar']:p.listBranch}:{},device:(p.device||'Mobile').toLowerCase(),role,screen:p.screen||'calendar',calView:p.calView||'day',day:TODAY,calF:'All',inqF:p.inqFilter||'New',inqSel:null,inqMenu:null,inqClose:null,
    inqs:INQ.map(x=>({...x,br:IBR[x.id]})),appts:APPTS.map(x=>({...x})),off:OFF.map(x=>({...x})),hours:seedHours(),patients:PATIENTS.map(x=>({...x,br:PBR[x.id],pkg:x.pkg?{...x.pkg}:null})),pay:JSON.parse(JSON.stringify(PAY)),notes:NOTES.slice(),
    pSearch:'',branches:Object.keys(BR).map(k=>({id:k,...BR[k],public:true})),pSel:p.patient||'priya',ptab:p.ptab||'overview',availTab:p.availTab||'hours',sheet:null,cv:null,ap:null,dt:null,fm:{},toasts:[],book:blankBook(),
    loading:!!p.loading,offline:!!p.offline,noteK:'Session',noteT:'',taken:!!p.simulateTaken};
  if(p.empty)st.inqs=st.inqs.map(i=>i.st==='new'?{...i,st:'contacted'}:i);
  applyVariant(st,p);
  return st;
}
function propsChanged(self,prev){
  const p=self.props,u={};
  if(p.device!==prev.device&&p.device)u.device=p.device.toLowerCase();
  if(p.role!==prev.role&&p.role)u.role=ROLEKEY[p.role]||'frontdesk';
  if(p.screen!==prev.screen&&p.screen)u.screen=p.screen;
  if(p.simulateTaken!==prev.simulateTaken)u.taken=!!p.simulateTaken;
  if(p.offline!==prev.offline)u.offline=!!p.offline;
  if(p.loading!==prev.loading)u.loading=!!p.loading;
  if(p.branch!==prev.branch){u.br=p.branch||'all';u.lb={};}
  if(Object.keys(u).length)self.setState(u);
}

function compute(self){
  const s=self.state,set=o=>self.setState(o),role=s.role,me=ME[role],mobile=s.device==='mobile',desktop=!mobile;
  if(s.branches){s.branches.forEach(b=>{BR[b.id]=b;});BRK.length=0;s.branches.forEach(b=>BRK.push(b.id));}
  const isTh=role==='therapist',isFD=role==='frontdesk',canNotes=!isFD,canInq=!isTh;
  const embedded=self.props.chrome===false;
  const P=id=>s.patients.find(p=>p.id===id)||PATIENTS[0];
  const upd=(k,patch)=>self.setState(st=>({[k]:{...st[k],...patch}}));
  const setFm=(k,v)=>self.setState(st=>({fm:{...st.fm,[k]:v}}));
  const F=k=>({v:s.fm[k]==null?'':s.fm[k],on:e=>setFm(k,e.target.value)});
  const flash=(msg,tone)=>{const id=Date.now()+Math.random();self.setState(st=>({toasts:[...st.toasts,{id,msg,tone:tone||'ok'}]}));setTimeout(()=>self.setState(st=>({toasts:st.toasts.filter(t=>t.id!==id)})),3400);};
  const seg=(opts,cur,fn)=>opts.map((o,i)=>{const v=Array.isArray(o)?o[0]:o,label=Array.isArray(o)?o[1]:o;return {label,bg:v===cur?'var(--color-accent)':'#fff',bl:i?'2px solid var(--color-text)':'0',onClick:()=>fn(v)};});
  const chip=(label,a,fn,extra)=>({label,bg:a?'var(--color-accent)':'#fff',bd:'var(--color-text)',fg:'var(--color-text)',onClick:fn,...(extra||{})});
  const go=(screen,extra)=>set({screen,sheet:null,inqMenu:null,inqClose:null,...(extra||{})});
  const authed=!['login','book'].includes(s.screen);
  const isPublic=s.screen==='book';
  const on={};SCREENS.forEach(x=>on[x[0]]=s.screen===x[0]&&!s.loading);on.login=s.screen==='login';on.book=isPublic;
  const myTh=me.th;
  const thScope=isTh?[myTh]:THK;
  const loc=l=>l==='Home'?{l:'Home visit',icon:'icon-house',bg:'var(--color-accent-100)'}:{l:'Clinic',icon:'icon-building-2',bg:'transparent'};
  const pNext=pid=>s.appts.filter(a=>a.pid===pid&&a.st==='confirmed'&&(a.day>TODAY||(a.day===TODAY&&a.e>NOW))).sort((a,b)=>a.day-b.day||a.s-b.s)[0];
  const pLast=pid=>{const w=s.appts.filter(a=>a.pid===pid&&a.st==='completed').sort((a,b)=>b.day-a.day||b.s-a.s)[0];if(w)return w.day===TODAY?'Today':DAYS[w.day].dm;const h=HIST[pid];return h?h[h.length-1][0]:'—';};
  const whenL=a=>(a.day===TODAY?'Today':DAYS[a.day].lbl)+', '+hm(a.s);
  const thName=k=>TH[k]?TH[k].short:'';
  const nNew=s.inqs.filter(i=>i.st==='new').length;
  const eff=k=>s.lb[k]!=null?s.lb[k]:s.br;
  const brN=k=>BR[k]?BR[k].name:'All branches';
  const brChips=k=>[['all','All branches'],...BRK.map(b=>[b,BR[b].name])].map(x=>chip(x[1],eff(k)===x[0],()=>set({lb:{...s.lb,[k]:x[0]}})));
  const defBr=(th,day,m)=>eff('calendar')!=='all'?eff('calendar'):th?brAt(s,th,day==null?TODAY:day,m==null?NOW:m):'kvn';

  // ---------- open sheets
  const openAppt=pre=>{const p0=pre||{};const th=p0.th||myTh||'neha';set({sheet:'appt',ap:{...blankAp(s),th,br:p0.br||defBr(th,p0.day,p0.manual?tm(p0.manual):null),...p0},inqMenu:null});};
  const openDetail=id=>set({sheet:'detail',dt:{id,mode:'view',reason:'',note:'',usePkg:true,pay:false,amt:'800',payMode:'UPI'}});
  const openConvert=id=>set({sheet:'convert',cv:mkCv(s,id),inqMenu:null,inqClose:null});
  const openPatientForm=pre=>set({sheet:'patient',fm:{name:'',phone:'',email:'',age:'',gender:'',addr:'',ref:'',complaint:'',...(pre||{})}});
  const openPatient=(id,tab)=>go('patient',{pSel:id,ptab:tab||'overview'});
  const closeSheet=()=>set({sheet:null});
  const openAdd=()=>s.screen==='patients'?openPatientForm():s.screen==='availability'&&s.availTab==='off'?set({sheet:'timeoff',fm:{th:myTh||'neha',from:'',fromT:'09:00',to:'',toT:'13:00',reason:'Leave',note:''}}):openAppt({day:s.screen==='calendar'?Math.max(s.day,TODAY):TODAY});

  // ---------- booking core
  const tryBook=o=>{
    if(s.taken&&!self._tk){self._tk=true;const g={id:'g'+Date.now(),br:o.br,day:o.day,s:o.s,e:o.s+o.dur,pid:'walkin',th:o.th,loc:'Clinic',st:'confirmed',src:'Phone call'};return {ghost:g};}
    const clash=s.appts.find(a=>a.th===o.th&&a.day===o.day&&a.st!=='cancelled'&&a.id!==o.editId&&o.s<a.e&&o.s+o.dur>a.s);
    if(clash)return {ghost:null,taken:true};
    return {appt:{id:o.editId||'x'+Date.now(),br:o.br,day:o.day,s:o.s,e:o.s+o.dur,pid:o.pid,th:o.th,loc:o.loc,st:'confirmed',src:o.src||'Phone call'}};
  };
  const takenFlash=()=>flash('Slot just got taken: pick another time','danger');
  const bookedMsg=(pid,a)=>'Booked '+P(pid).name+' · '+DAYS[a.day].lbl+', '+hm(a.s)+' with '+thName(a.th)+' at '+BR[a.br].name;

  // ---------- picker (shared by convert + appt)
  const pkKey=s.sheet==='convert'?'cv':s.sheet==='appt'?'ap':null;const pk=pkKey?s[pkKey]:null;
  let picker={};
  if(pk){
    const fs=freeSlots(s,pk.th,pk.day,pk.dur,pk.br);const works=t=>((s.hours[t]||[])[pk.day]||[]).some(r=>r.br===pk.br);const cvInq=pkKey==='cv'?s.inqs.find(i=>i.id===pk.id):null;const pref=cvInq&&cvInq.part!=='Any'?cvInq.part:null;
    const lim=pk.more?fs.length:8;
    const onLeave=t=>s.off.some(o=>o.th===t&&o.day===pk.day&&o.s<=540&&o.e>=1140);
    picker={
      brSeg:seg(BRK.map(b=>[b,BR[b].name]),pk.br,v=>upd(pkKey,{br:v,slot:null,override:false})),
      thChips:thScope.map(t=>{const lv=onLeave(t);const w=works(t);const n=freeSlots(s,t,pk.day,pk.dur,pk.br).length;return {...chip(TH[t].short,pk.th===t,()=>upd(pkKey,{th:t,slot:null,override:false})),sub:lv?'On leave':!w?'Not here':n?n+' free':'Full',subFg:lv?'#9A1A00':'var(--color-neutral-700)'};}),
      dateChips:[1,2,3,4,5].map(d=>({dow:d===TODAY?'Today':DAYS[d].dow,dm:DAYS[d].dm,bg:pk.day===d?'var(--color-accent)':'#fff',onClick:()=>upd(pkKey,{day:d,slot:null,override:false})})),
      slotChips:fs.slice(0,lim).map(t=>{const a=pk.slot===t&&!pk.manual;const pr=!pref||partOf(t)===pref;return {label:hm(t),bg:a?'var(--color-accent)':'#fff',bd:a||pr?'var(--color-text)':'var(--color-neutral-400)',fg:a||pr?'var(--color-text)':'var(--color-neutral-700)',onClick:()=>upd(pkKey,{slot:t,manual:'',override:false})};}),
      hasSlots:fs.length>0,noSlots:fs.length===0,
      noSlotsMsg:onLeave(pk.th)?TH[pk.th].short+' is on leave on '+DAYS[pk.day].lbl+'.':!works(pk.th)?TH[pk.th].short+' isn\u2019t at '+BR[pk.br].name+' on '+DAYS[pk.day].lbl+'.':'No free time for '+TH[pk.th].short+' at '+BR[pk.br].name+' on '+DAYS[pk.day].lbl+'.',
      showMore:fs.length>8&&!pk.more,toggleMore:()=>upd(pkKey,{more:true}),moreLabel:'More times ('+(fs.length-8)+')',
      slotKicker:'Free times · '+TH[pk.th].short+' at '+BR[pk.br].name+(pref?' · '+pref+' preferred':''),
      durSeg:seg([[30,'30 min'],[45,'45 min'],[60,'60 min']],pk.dur,v=>upd(pkKey,{dur:v,slot:null})),
      locSeg:seg([['Clinic','Clinic'],['Home','Home visit']],pk.loc,v=>upd(pkKey,{loc:v})),
      isHome:pk.loc==='Home',addr:pk.addr,onAddr:e=>upd(pkKey,{addr:e.target.value}),
      manualOn:pkKey==='ap',manual:pk.manual,onManual:e=>upd(pkKey,{manual:e.target.value,slot:null,override:false})
    };
  }

  // ---------- convert sheet
  let cvV={};
  if(s.sheet==='convert'&&s.cv){const c=s.cv,q=s.inqs.find(i=>i.id===c.id),m=c.matchId?P(c.matchId):null;
    const mNext=m?pNext(m.id):null;const pid=c.use&&m?m.id:null;const pname=pid?m.name:q.name;
    const done=c.done?s.appts.find(a=>a.id===c.apptId):null;
    const dBr=done?BR[done.br||c.br]:null;
    const waText=done?'Hi '+pname.split(' ')[0]+', your physiotherapy session at ATP Rehab '+dBr.name+' is confirmed for '+DAYS[done.day].lbl+', '+hm(done.s)+' with '+thName(done.th)+'. Address: '+dBr.addr+'.':'';
    cvV={brName:BR[q.br].name,q:{...q,dayPart:q.day+' · '+q.part+' · '+BR[q.br].name},hasMatch:!!m,noMatch:!m,matchName:m?m.name:'',matchLine:m?fmtPhone(m.phone)+' · last visit '+pLast(m.id).toLowerCase().replace('today','today'):'',
      matchNext:mNext?'Already booked: '+whenL(mNext)+' with '+thName(mNext.th):'',hasMatchNext:!!mNext,
      useSeg:seg([['use','Use this patient'],['new','Create a new one']],c.use?'use':'new',v=>upd('cv',{use:v==='use'})),
      newLine:q.name+' · '+fmtPhone(q.phone)+' will be added to patients.',
      notDone:!c.done,done:!!c.done,doneTitle:done?pname:'',doneWhen:done?DAYS[done.day].lbl+' · '+rng(done.s,done.e):'',doneWho:done?TH[done.th].full+' · '+(done.loc==='Home'?'Home visit from ':'')+dBr.name:'',
      waHref:done?wa(q.phone,waText):'#',waText};
  }
  const cvConfirm=()=>{const c=s.cv;if(c.slot==null){flash('Pick a time first','danger');return;}const q=s.inqs.find(i=>i.id===c.id);
    let pid=c.use&&c.matchId?c.matchId:null,newPats=s.patients;
    if(!pid){pid='p'+Date.now();newPats=[...s.patients,{id:pid,name:q.name,age:'',g:'',phone:fmtPhone(q.phone),email:q.email,ref:'Other',refNote:'Web request',complaint:q.reason,addr:c.addr||'',th:c.th,visits:0,noshow:0,isNew:true}];}
    const r=tryBook({pid,br:c.br,th:c.th,day:c.day,s:c.slot,dur:c.dur,loc:c.loc,src:'Web request'});
    if(r.ghost||r.taken){if(r.ghost)self.setState(st=>({appts:[...st.appts,r.ghost],cv:{...st.cv,slot:null}}));else upd('cv',{slot:null});takenFlash();return;}
    set({appts:[...s.appts,r.appt],patients:newPats,inqs:s.inqs.map(i=>i.id===c.id?{...i,st:'booked'}:i),cv:{...c,done:true,apptId:r.appt.id,use:true,matchId:pid}});flash(bookedMsg(pid,r.appt).replace(P(pid).name,newPats.find(p=>p.id===pid).name));};
  const cvSaveOnly=()=>{const c=s.cv,q=s.inqs.find(i=>i.id===c.id);if(c.use&&c.matchId){set({sheet:null,inqs:s.inqs.map(i=>i.id===c.id?{...i,st:'contacted'}:i)});flash('Kept as contacted · '+P(c.matchId).name);return;}
    const pid='p'+Date.now();set({sheet:null,patients:[...s.patients,{id:pid,name:q.name,age:'',g:'',phone:fmtPhone(q.phone),email:q.email,ref:'Other',refNote:'Web request',complaint:q.reason,addr:'',th:c.th,visits:0,noshow:0}],inqs:s.inqs.map(i=>i.id===c.id?{...i,st:'contacted'}:i)});flash('Saved '+q.name+' to patients');};

  // ---------- appt sheet
  let apV={};const ap=s.ap;let apOk=false,apStart=null,apConf=null,apOut=false,apOffC=null;
  if(s.sheet==='appt'&&ap){
    apStart=ap.manual&&/^\d{1,2}:\d{2}$/.test(ap.manual)?tm(ap.manual):ap.slot;
    if(apStart!=null){const e=apStart+ap.dur;apConf=s.appts.find(a=>a.th===ap.th&&a.day===ap.day&&a.st!=='cancelled'&&a.id!==ap.editId&&apStart<a.e&&e>a.s);
      apOffC=s.off.find(o=>o.th===ap.th&&o.day===ap.day&&apStart<o.e&&e>o.s);
      apOut=!apConf&&!apOffC&&!((s.hours[ap.th][ap.day]||[]).some(r=>r.br===ap.br&&apStart>=r.s&&e<=r.e));}
    const qq=ap.q.trim().toLowerCase(),qd=dig(ap.q);
    const res=qq?s.patients.filter(p=>!p.hidden&&(p.name.toLowerCase().includes(qq)||(qd.length>=3&&dig(p.phone).includes(qd)))).slice(0,5):[];
    const pat=ap.pid?P(ap.pid):null;
    const dupNew=ap.newP&&dig(s.fm.npPhone).length===10?matchOf(s,s.fm.npPhone):null;
    apOk=(!!pat||(ap.newP&&(s.fm.npName||'').trim()&&dig(s.fm.npPhone).length===10&&!dupNew))&&apStart!=null&&!apConf&&!apOffC&&(!apOut||ap.override);
    apV={hasPatient:!!pat,pName:pat?pat.name:'',pIni:pat?ini(pat.name):'',pLine:pat?fmtPhone(pat.phone)+' · '+pat.complaint:'',changeP:()=>upd('ap',{pid:null}),
      searching:!pat&&!ap.newP,q:ap.q,onQ:e=>upd('ap',{q:e.target.value}),results:res.map(p=>({name:p.name,ini:ini(p.name),line:fmtPhone(p.phone)+' · last visit '+pLast(p.id),onClick:()=>upd('ap',{pid:p.id,q:'',th:isTh?myTh:p.th,addr:p.addr})})),hasResults:res.length>0,noResults:!!qq&&!res.length,
      startNew:()=>{upd('ap',{newP:true});self.setState(st=>({fm:{...st.fm,npName:/\d/.test(ap.q)?'':ap.q,npPhone:/\d/.test(ap.q)?ap.q:''}}));},isNew:ap.newP,cancelNew:()=>upd('ap',{newP:false}),
      npName:F('npName'),npPhone:F('npPhone'),hasDupNew:!!dupNew,dupNewMsg:dupNew?fmtPhone(dupNew.phone)+' already belongs to '+dupNew.name+'.':'',useDup:()=>dupNew&&upd('ap',{pid:dupNew.id,newP:false,th:dupNew.th}),
      hasConflict:!!(apConf||apOffC),conflictMsg:apConf?TH[ap.th].short+' already has '+P(apConf.pid).name+' at '+rng(apConf.s,apConf.e):apOffC?TH[ap.th].short+' is off '+rng(apOffC.s,apOffC.e)+' ('+apOffC.label+')':'',
      hasOutside:apOut&&!ap.override,outsideMsg:'Outside '+TH[ap.th].short+'\u2019s working hours at '+BR[ap.br].name,bookAnyway:()=>upd('ap',{override:true}),overridden:apOut&&ap.override,
      notes:ap.notes,onNotes:e=>upd('ap',{notes:e.target.value}),isEdit:!!ap.editId};
  }
  const apSave=()=>{if(!apOk)return;let pid=ap.pid,pats=s.patients;
    if(!pid&&ap.newP){pid='p'+Date.now();pats=[...s.patients,{id:pid,name:s.fm.npName.trim(),age:'',g:'',phone:fmtPhone(s.fm.npPhone),email:'',ref:'Other',complaint:'',addr:ap.addr,th:ap.th,visits:0,noshow:0}];}
    const r=tryBook({pid,br:ap.br,th:ap.th,day:ap.day,s:apStart,dur:ap.dur,loc:ap.loc,editId:ap.editId});
    if(r.ghost||r.taken){if(r.ghost)self.setState(st=>({appts:[...st.appts,r.ghost],ap:{...st.ap,slot:null,manual:''}}));takenFlash();return;}
    const appts=ap.editId?s.appts.map(a=>a.id===ap.editId?{...a,...r.appt,src:a.src}:a):[...s.appts,r.appt];
    set({appts,patients:pats,sheet:null});flash((ap.editId?'Moved ':'Booked ')+pats.find(p=>p.id===pid).name+' · '+DAYS[ap.day].lbl+', '+hm(apStart)+' with '+thName(ap.th)+' at '+BR[ap.br].name);};

  // ---------- detail sheet
  let dtV={};const dt=s.dt;
  if(s.sheet==='detail'&&dt){const a=s.appts.find(x=>x.id===dt.id)||s.appts[0],p=P(a.pid);const left=p.pkg?p.pkg.total-p.pkg.used:0;const ab=BR[apBr(s,a)];
    const msg='Hi '+p.name.split(' ')[0]+', a reminder of your physiotherapy session at ATP Rehab '+ab.name+' on '+DAYS[a.day].lbl+', '+hm(a.s)+' with '+thName(a.th)+'. Address: '+ab.addr+'.';
    dtV={name:p.name,ini:ini(p.name),tag:tag(a.st),pending:!!a.pending&&a.st==='confirmed',pendTag:tag('pending'),complaint:p.complaint,
      rows:[['When',DAYS[a.day].lbl+' · '+rng(a.s,a.e)],['Therapist',TH[a.th].full],['Branch',ab.name],['Location',a.loc==='Home'?'Home visit · '+p.addr:'Clinic'],['Source',a.src],['Phone',fmtPhone(p.phone)]].map(r=>({k:r[0],v:r[1]})),
      tel:telOf(p.phone),waHref:wa(p.phone,msg),
      isView:dt.mode==='view',isReason:dt.mode==='cancel'||dt.mode==='noshow',isComplete:dt.mode==='complete',
      isOpen:a.st==='confirmed',isClosed:a.st!=='confirmed',closedMsg:'Marked '+tag(a.st).l.toLowerCase()+'.',
      undo:()=>{set({appts:s.appts.map(x=>x.id===a.id?{...x,st:'confirmed'}:x)});flash('Status reset to confirmed');},
      actions:[['complete','Completed','icon-check','var(--color-accent)'],['noshow','No-show','icon-user-x','#fff'],['cancel','Cancel','icon-x','#fff'],['resched','Reschedule','icon-calendar-clock','#fff']].map(x=>({label:x[1],icon:x[2],bg:x[3],onClick:()=>{if(x[0]==='resched'){set({sheet:'appt',ap:{...blankAp(s),br:apBr(s,a),pid:a.pid,th:a.th,day:Math.max(a.day,TODAY),dur:a.e-a.s,loc:a.loc,addr:p.addr,editId:a.id}});return;}upd('dt',{mode:x[0],reason:x[0]==='complete'?'':dt.reason,pay:x[0]==='complete'?!(p.pkg&&left>0):dt.pay});}})),
      canNotes,openNotes:()=>openPatient(p.id,'notes'),openProfile:()=>openPatient(p.id,'overview'),
      reasonKicker:dt.mode==='cancel'?'Why is it cancelled?':'Reason for no-show',
      reasons:STATUS_R.map(r=>chip(r,dt.reason===r,()=>upd('dt',{reason:r}))),note:dt.note,onNote:e=>upd('dt',{note:e.target.value}),
      hasPkg:!!(p.pkg&&left>0),noPkg:!(p.pkg&&left>0),pkgLabel:p.pkg?'Use package session ('+(left-1)+' of '+p.pkg.total+' left)':'',pkgSub:p.pkg?p.pkg.name+' · sold '+p.pkg.sold:'',
      usePkg:dt.usePkg,pkgBox:dt.usePkg?'var(--color-accent)':'#fff',pkgIcon:dt.usePkg?'icon-check':'',togglePkg:()=>upd('dt',{usePkg:!dt.usePkg}),
      pay:dt.pay,payBox:dt.pay?'var(--color-accent)':'#fff',payIcon:dt.pay?'icon-check':'',togglePay:()=>upd('dt',{pay:!dt.pay}),
      amt:dt.amt,onAmt:e=>upd('dt',{amt:e.target.value.replace(/\D/g,'')}),payModeSeg:seg(['Cash','UPI','Card'],dt.payMode,v=>upd('dt',{payMode:v}))};
  }
  const dtCommit=()=>{const a=s.appts.find(x=>x.id===dt.id),p=P(a.pid);
    if(dt.mode==='complete'){let pats=s.patients,pay=s.pay;if(dtV.hasPkg&&dt.usePkg)pats=pats.map(x=>x.id===p.id?{...x,pkg:{...x.pkg,used:x.pkg.used+1}}:x);pats=pats.map(x=>x.id===p.id?{...x,visits:(x.visits||0)+1}:x);
      if(dt.pay&&+dt.amt)pay={...pay,[p.id]:[...(pay[p.id]||[]),{d:'28 Oct',amt:+dt.amt,mode:dt.payMode,br:apBr(s,a),for:'Session · '+DAYS[a.day].lbl+', '+hm(a.s)}]};
      set({appts:s.appts.map(x=>x.id===a.id?{...x,st:'completed'}:x),patients:pats,pay,sheet:null});flash('Completed · '+p.name+(dt.pay&&+dt.amt?' · '+inr(+dt.amt)+' '+dt.payMode:''));return;}
    if(!dt.reason){flash('Pick a reason','danger');return;}
    const stv=dt.mode==='cancel'?'cancelled':'noshow';set({appts:s.appts.map(x=>x.id===a.id?{...x,st:stv,reason:dt.reason}:x),sheet:null});flash((stv==='cancelled'?'Cancelled · ':'Marked no-show · ')+p.name);};
  const quickStatus=(id,stv)=>{const a=s.appts.find(x=>x.id===id);if(stv==='completed'){set({sheet:'detail',dt:{id,mode:'complete',reason:'',note:'',usePkg:true,pay:!P(a.pid).pkg,amt:'800',payMode:'UPI'}});return;}set({sheet:'detail',dt:{id,mode:'noshow',reason:'No response',note:'',usePkg:true,pay:false,amt:'800',payMode:'UPI'}});};

  // ---------- patient form
  let pfV={};
  if(s.sheet==='patient'){const d=dig(s.fm.phone);const dup=d.length===10?matchOf(s,s.fm.phone):null;
    pfV={name:F('name'),phone:F('phone'),email:F('email'),age:F('age'),addr:F('addr'),complaint:F('complaint'),hasDup:!!dup,dupMsg:dup?fmtPhone(dup.phone)+' already belongs to '+dup.name+'.':'',openDup:()=>dup&&openPatient(dup.id),
      genderSeg:seg(['Female','Male','Other'],s.fm.gender,v=>setFm('gender',v)),refChips:REFS.map(r=>chip(r,s.fm.ref===r,()=>setFm('ref',r))),
      phoneErr:d.length>0&&d.length<10,ok:(s.fm.name||'').trim()&&d.length===10&&!dup};}
  const pfSave=()=>{if(!pfV.ok){flash(pfV.hasDup?'This phone already has a profile':'Add a name and a 10-digit phone','danger');return;}const id='p'+Date.now();
    set({patients:[...s.patients,{id,name:s.fm.name.trim(),age:s.fm.age,g:s.fm.gender,phone:fmtPhone(s.fm.phone),email:s.fm.email,ref:s.fm.ref||'Other',complaint:s.fm.complaint,addr:s.fm.addr,th:'neha',visits:0,noshow:0}],sheet:null,screen:'patient',pSel:id,ptab:'overview'});flash('Added '+s.fm.name.trim());};

  // ---------- inquiries
  const ib=eff('inquiries');
  const inqScope=s.inqs.filter(i=>(ib==='all'||i.br===ib)&&(s.inqF==='All'||(s.inqF==='New'?i.st==='new':i.st==='contacted')));
  const nCont=s.inqs.filter(i=>i.st==='contacted').length;
  const setInqSt=(id,st,extra)=>set({inqs:s.inqs.map(i=>i.id===id?{...i,st,...(extra||{})}:i),inqMenu:null,inqClose:null});
  const closeReasons=CLOSE_R.map(r=>({label:r,onClick:()=>{const q=s.inqs.find(i=>i.id===s.inqClose);setInqSt(s.inqClose,'closed',{closeR:r});flash('Closed · '+q.name+' · '+r);}}));
  const inqRow=q=>{const m=matchOf(s,q.phone);return {...q,brName:BR[q.br].name,phoneF:fmtPhone(q.phone),tel:telOf(q.phone),pref:q.day+' · '+q.part,tag:tag(q.st),isOpen:q.st==='new'||q.st==='contacted',
    sub:q.st==='closed'?'Closed: '+q.closeR:'',book:()=>openConvert(q.id),menu:()=>set({inqMenu:s.inqMenu===q.id?null:q.id,inqClose:null}),menuOpen:s.inqMenu===q.id,closing:s.inqClose===q.id,notClosing:s.inqClose!==q.id,
    contacted:()=>{setInqSt(q.id,'contacted');flash('Marked contacted · '+q.name);},startClose:()=>set({inqClose:q.id}),canContact:q.st==='new',
    select:()=>set({inqSel:s.inqSel===q.id?null:q.id,inqClose:null}),rowBg:s.inqSel===q.id?'var(--color-accent-100)':'transparent',
    known:m?'Patient · '+m.name:'',isKnown:!!m};};
  const inqRows=inqScope.map(inqRow);
  const selQ=s.inqSel?s.inqs.find(i=>i.id===s.inqSel):null;
  let inqD={};if(selQ){const r=inqRow(selQ),m=matchOf(s,selQ.phone),mn=m?pNext(m.id):null;
    inqD={...r,closing:s.inqClose===selQ.id,notClosing:s.inqClose!==selQ.id,email:selQ.email||'—',matchMsg:m?'Existing patient: '+m.name+' · last visit '+pLast(m.id):'No patient with this phone yet. Booking creates one.',matchNext:mn?'Already booked '+whenL(mn)+' with '+thName(mn.th):'',hasMatchNext:!!mn,
      waHref:wa(selQ.phone,'Hi '+selQ.name.split(' ')[0]+', this is Snehal from ATP Rehab about your session request. When is a good time to call you?'),
      startClose:()=>set({inqClose:selQ.id}),close:()=>set({inqSel:null})};}
  const inqWide=!selQ;

  // ---------- calendar
  const PX=0.8,G0=480,GT=8,y=m=>Math.round((Math.max(m,G0)-G0)*PX)+GT;
  const gridHours=[];for(let h=8;h<=20;h++)gridHours.push({lbl:hm(h*60),top:y(h*60)+'px'});
  const gridLines=[];for(let m=480;m<=1200;m+=30)gridLines.push({top:y(m)+'px',bd:m%60?'1px dashed var(--rule)':'1px solid var(--rule)'});
  const cb=eff('calendar');const inB=a=>cb==='all'||apBr(s,a)===cb;
  const lanes=items=>{const so=items.slice().sort((a,b)=>a.s-b.s||b.e-a.e);let cl=[],end=-1;const fl=()=>{const L=[];cl.forEach(it=>{let k=L.findIndex(x=>x<=it.s);if(k<0){k=L.length;L.push(0);}L[k]=it.e;it._l=k;});cl.forEach(it=>it._n=L.length);cl=[];};so.forEach(it=>{if(it.s>=end&&cl.length){fl();end=-1;}cl.push(it);end=Math.max(end,it.e);});if(cl.length)fl();return so;};
  const blk=(o)=>({top:'0',h:'0',left:'2px',w:'calc(100% - 4px)',bg:'transparent',bd:'0',bl:'0',fg:'var(--color-text)',pad:'3px 6px',label:'',sub:'',cur:'default',pe:'auto',z:'2',td:'none',onClick:null,...o});
  const apptBlk=(a,showTh)=>{const c=BLK[a.st],p=P(a.pid),n=a._n||1,l=a._l||0;return blk({top:y(a.s)+'px',h:Math.max(14,y(a.e)-y(a.s)-2)+'px',left:'calc('+(l*100/n)+'% + 2px)',w:'calc('+(100/n)+'% - 4px)',bg:c[0],bl:c[1],fg:c[2],label:(a.st==='completed'?'✓ ':'')+p.name,sub:rng(a.s,a.e)+(a.loc==='Home'?' · Home':'')+(showTh?' · '+TH[a.th].ini:'')+(cb==='all'?' · '+BR[apBr(s,a)].code:''),cur:'pointer',td:a.st==='cancelled'?'line-through':'none',onClick:()=>openDetail(a.id)});};
  const offBlk=o=>blk({top:y(o.s)+'px',h:(y(Math.min(o.e,1200))-y(o.s)-2)+'px',bg:HATCH,bd:'1px solid var(--color-neutral-400)',fg:'var(--color-neutral-800)',label:o.label,sub:TH[o.th].short+(o.e-o.s<600?' · '+rng(o.s,o.e):''),z:'2'});
  const shadeBlks=(th,day)=>{const r=(s.hours[th][day]||[]).slice().sort((a,b)=>a.s-b.s);const out=[];let c=480;r.forEach(x=>{if(x.s>c)out.push([c,x.s,'']);if(cb!=='all'&&x.br!==cb)out.push([x.s,x.e,'At '+BR[x.br].name]);c=Math.max(c,x.e);});if(c<1200)out.push([c,1200,'']);return out.map(x=>blk({top:y(x[0])+'px',h:(y(x[1])-y(x[0]))+'px',left:'0',w:'100%',bg:'var(--color-neutral-100)',fg:'var(--color-neutral-600)',pad:'4px 8px',label:x[2],pe:'none',z:'0'}));};
  const nowBlk=()=>blk({top:y(NOW)+'px',h:'2px',left:'0',w:'100%',bg:'var(--color-text)',pe:'none',z:'3',pad:'0'});
  const cellsFor=(day,th)=>{const out=[];if(day<TODAY)return out;for(let m=480;m<1200;m+=15){out.push({top:y(m)+'px',title:'New appointment '+hm(m),onClick:()=>{const t=th||thScope.find(k=>(s.hours[k][day]||[]).some(r=>m>=r.s&&m<r.e&&(cb==='all'||r.br===cb)))||thScope[0];openAppt({th:t,day,manual:hm(m),br:cb!=='all'?cb:brAt(s,t,day,m)});}});}return out;};
  const weekTh=isTh?myTh:(s.calF==='All'?null:s.calF);
  let cols=[];
  if(desktop&&s.screen==='calendar'){
    if(s.calView==='day'){cols=thScope.map(t=>{const items=lanes(s.appts.filter(a=>a.th===t&&a.day===s.day&&a.st!=='cancelled'&&inB(a)));const r=s.hours[t][s.day]||[];const lv=s.off.find(o=>o.th===t&&o.day===s.day&&o.e-o.s>=600);
      return {head:TH[t].full,sub:lv?'On leave':r.length?r.map(x=>rng(x.s,x.e)+' '+(x.loc!=='Clinic'?'Home·':'')+BR[x.br].name).join(' · '):'Not working',headBg:'transparent',isToday:false,
        cells:cellsFor(s.day,t),blocks:[...shadeBlks(t,s.day),...s.off.filter(o=>o.th===t&&o.day===s.day).map(offBlk),...items.map(a=>apptBlk(a,false)),...(s.day===TODAY?[nowBlk()]:[])]};});}
    else{cols=[0,1,2,3,4,5].map(d=>{const items=lanes(s.appts.filter(a=>a.day===d&&a.st!=='cancelled'&&inB(a)&&(!weekTh||a.th===weekTh)));
      return {head:DAYS[d].lbl,sub:d===TODAY?'Today':items.length+' sessions',headBg:d===TODAY?'var(--color-accent-100)':'transparent',isToday:d===TODAY,
        cells:cellsFor(d,weekTh),blocks:[...(weekTh?shadeBlks(weekTh,d):[]),...s.off.filter(o=>o.day===d&&(!weekTh||o.th===weekTh)).map(offBlk),...items.map(a=>apptBlk(a,!weekTh)),...(d===TODAY?[nowBlk()]:[])]};});}
  }
  // mobile agenda
  const agTh=isTh?myTh:(s.calF==='All'?null:s.calF);
  const dayAppts=s.appts.filter(a=>a.day===s.day&&a.st!=='cancelled'&&a.pid!=='walkin'&&inB(a)&&(!agTh||a.th===agTh)).sort((a,b)=>a.s-b.s||a.th.localeCompare(b.th));
  const dayOffs=s.off.filter(o=>o.day===s.day&&(!agTh||o.th===agTh)&&(cb==='all'||(s.hours[o.th][o.day]||[]).some(r=>r.br===cb&&r.s<o.e&&r.e>o.s)));
  const W=agTh?(s.hours[agTh][s.day]||[]).filter(r=>cb==='all'||r.br===cb):[{s:540,e:1200}];
  const frees=[];W.forEach(r=>{const busy=[...dayAppts,...dayOffs].map(x=>[x.s,x.e]).filter(b=>b[1]>r.s&&b[0]<r.e).sort((a,b)=>a[0]-b[0]);let c=r.s;busy.forEach(b=>{if(b[0]-c>=15)frees.push([c,b[0]]);c=Math.max(c,b[1]);});if(r.e-c>=15)frees.push([c,r.e]);});
  const visFree=frees.filter(f=>s.day>TODAY||(s.day===TODAY&&f[1]>NOW)).map(f=>[s.day===TODAY?Math.max(f[0],Math.ceil(NOW/15)*15):f[0],f[1]]).filter(f=>f[1]-f[0]>=15);
  const agRowAppt=a=>{const p=P(a.pid),t=tag(a.st);const cur=s.day===TODAY&&a.s<=NOW&&a.e>NOW;return {brName:BR[apBr(s,a)].name,showBr:cb==='all',kind:'a',s:a.s,isAppt:true,sL:hm(a.s),eL:hm(a.e),name:p.name,th:TH[a.th].short,loc:loc(a.loc),tag:t,bar:BLK[a.st][1].replace('4px solid ',''),
    td:a.st==='cancelled'?'line-through':'none',pending:!!a.pending&&a.st==='confirmed',pendTag:tag('pending'),open:()=>openDetail(a.id),rowBg:cur?'#fff':'transparent',isCur:cur,
    canAct:isTh&&a.st==='confirmed'&&a.day<=TODAY,done:()=>quickStatus(a.id,'completed'),noshow:()=>quickStatus(a.id,'noshow'),notes:()=>openPatient(a.pid,'notes'),showTh:!agTh};};
  let ag=[...dayAppts.map(agRowAppt),...dayOffs.map(o=>({kind:'o',s:o.s,isOff:true,label:o.label+' · '+TH[o.th].short,range:o.e-o.s>=600?'All day':rng(o.s,o.e)})),...visFree.map(f=>({kind:'f',s:f[0],isFree:true,range:rng(f[0],f[1]),open:()=>{const t=agTh||thScope.find(k=>(s.hours[k][s.day]||[]).some(r=>f[0]>=r.s&&f[0]<r.e&&(cb==='all'||r.br===cb)))||'neha';openAppt({th:t,day:s.day,manual:hm(f[0]),br:cb!=='all'?cb:brAt(s,t,s.day,f[0])});}}))].sort((a,b)=>a.s-b.s||(a.kind==='f'?1:-1));
  if(s.day===TODAY){const k=ag.findIndex(r=>r.s>NOW);ag.splice(k<0?ag.length:k,0,{kind:'n',s:NOW,isNow:true,label:'Now '+hm(NOW)});}
  ag=ag.map(r=>({isAppt:false,isOff:false,isFree:false,isNow:false,...r}));
  const nextA=isTh&&s.day===TODAY?dayAppts.find(a=>a.st==='confirmed'&&a.e>NOW):null;
  const nextV=nextA?{kicker:nextA.s<=NOW?'Now':'Next',range:rng(nextA.s,nextA.e),name:P(nextA.pid).name,complaint:P(nextA.pid).complaint,meta:(nextA.loc==='Home'?'Home visit · '+P(nextA.pid).addr:BR[apBr(s,nextA)].name+' branch')+' · visit '+((P(nextA.pid).visits||0)+1),
    notes:()=>openPatient(nextA.pid,'notes'),done:()=>quickStatus(nextA.id,'completed'),noshow:()=>quickStatus(nextA.id,'noshow')}:{};
  const myCount=dayAppts.length,myDone=dayAppts.filter(a=>a.st==='completed').length;

  // ---------- patients
  const pb=eff('patients');
  const pScope=s.patients.filter(p=>!p.hidden&&(!isTh||p.th===myTh||s.appts.some(a=>a.pid===p.id&&a.th===myTh))&&(pb==='all'||p.br===pb||s.appts.some(a=>a.pid===p.id&&apBr(s,a)===pb)));
  const pq=s.pSearch.trim().toLowerCase(),pqd=dig(s.pSearch);
  const pFilt=pScope.filter(p=>!pq||p.name.toLowerCase().includes(pq)||(pqd.length>=3&&dig(p.phone).includes(pqd)));
  const pRow=p=>{const n=pNext(p.id);const left=p.pkg?p.pkg.total-p.pkg.used:0;return {brName:BR[p.br||'kvn'].name,name:p.name,ini:ini(p.name),phone:fmtPhone(p.phone),meta:(p.age?p.age+' · ':'')+(p.g||'')+' · '+BR[p.br||'kvn'].name,last:pLast(p.id),next:n?whenL(n):'—',nextTh:n?thName(n.th):'',hasPkg:left>0,pkg:left+' left',isNew:!!p.isNew||p.visits===0,
    open:()=>desktop&&s.screen==='patients'?set({pSel:p.id}):openPatient(p.id),rowBg:desktop&&s.pSel===p.id?'var(--color-accent-100)':'transparent',avBg:p.visits===0?'#fff':'var(--color-accent-100)',lastNext:'Last '+pLast(p.id)+' · Next '+(n?whenL(n):'—')};};
  const pRows=pFilt.map(pRow);
  const cp=P(s.pSel);const cpNext=pNext(cp.id);const cpLeft=cp.pkg?cp.pkg.total-cp.pkg.used:0;const cpPay=s.pay[cp.id]||[];
  const cpVisits=[...(HIST[cp.id]||[]).map(h=>({when:h[0]+', '+h[1],th:TH[h[2]].short,tag:tag(h[3]),up:false,k:-1})),...s.appts.filter(a=>a.pid===cp.id).map(a=>({when:(a.day===TODAY?'Today':DAYS[a.day].lbl)+', '+hm(a.s),th:TH[a.th].short+(a.loc==='Home'?' · Home visit':''),tag:tag(a.st),up:a.st==='confirmed'&&(a.day>TODAY||(a.day===TODAY&&a.e>NOW)),k:a.day*2000+a.s,open:()=>openDetail(a.id)}))];
  const upV=cpVisits.filter(v=>v.up),pastV=cpVisits.filter(v=>!v.up).reverse();
  const cpNotes=s.notes.filter(n=>n.pid===cp.id).map(n=>({...n,tag:tag(n.kind),author:TH[n.by].short,hasSess:!!n.sess,sessL:'Linked to session · '+n.sess}));
  const waPat=wa(cp.phone,'Hi '+cp.name.split(' ')[0]+', this is ATP Rehab. ');
  const cpV={name:cp.name,ini:ini(cp.name),meta:[cp.age?cp.age+' yrs':'',cp.g,BR[cp.br||'kvn'].name+' branch','Referred: '+(cp.ref||'—')+(cp.refNote?' ('+cp.refNote+')':'')].filter(Boolean).join(' · '),phone:fmtPhone(cp.phone),tel:telOf(cp.phone),wa:waPat,
    complaint:cp.complaint||'—',addr:cp.addr||'—',email:cp.email||'—',hasNext:!!cpNext,noNext:!cpNext,nextWhen:cpNext?DAYS[cpNext.day].lbl+' · '+rng(cpNext.s,cpNext.e):'',nextWho:cpNext?TH[cpNext.th].full+' · '+(cpNext.loc==='Home'?'Home visit':BR[apBr(s,cpNext)].name):'',nextPending:!!(cpNext&&cpNext.pending),pendTag:tag('pending'),openNext:()=>cpNext&&openDetail(cpNext.id),
    hasPkg:!!cp.pkg,noPkg:!cp.pkg,pkgName:cp.pkg?cp.pkg.name+' package':'',pkgUsed:cp.pkg?cp.pkg.used+' of '+cp.pkg.total+' used':'',pkgLeft:cp.pkg?cpLeft+' left':'',pkgW:cp.pkg?(cp.pkg.used/cp.pkg.total*100)+'%':'0%',pkgSold:cp.pkg?'Sold '+cp.pkg.sold+' · '+inr(cp.pkg.price):'',
    stats:[{l:'Visits',v:String(cp.visits||0)},{l:'No-shows',v:String(cp.noshow||0),c:cp.noshow?'#9A1A00':'var(--color-text)'},{l:'Total paid',v:inr(cpPay.reduce((a,x)=>a+x.amt,0))}].map(x=>({c:'var(--color-text)',...x})),
    upcoming:upV,past:pastV,hasUp:upV.length>0,noUp:!upV.length,hasPast:pastV.length>0,visitStats:[{l:'Visits',v:String(cp.visits||0)},{l:'Upcoming',v:String(upV.length)},{l:'No-shows',v:String(cp.noshow||0)}],
    pays:cpPay.slice().reverse().map(x=>({...x,amtL:inr(x.amt),brName:BR[x.br||cp.br||'kvn'].name})),hasPays:cpPay.length>0,noPays:!cpPay.length,
    notes:cpNotes,hasNotes:cpNotes.length>0,noNotes:!cpNotes.length,
    bookAgain:()=>openAppt({pid:cp.id,th:isTh?myTh:cp.th,addr:cp.addr,loc:cp.loc||'Clinic'}),back:()=>go('patients')};
  const tabSeg=seg([['overview','Overview'],['notes','Notes'],['visits','Visits'],['payments','Payments']],s.ptab,v=>set({ptab:v}));
  const pt={overview:s.ptab==='overview',notes:s.ptab==='notes'&&canNotes,locked:s.ptab==='notes'&&!canNotes,visits:s.ptab==='visits',payments:s.ptab==='payments'};
  const noteSave=()=>{if(!s.noteT.trim())return;set({notes:[{id:'n'+Date.now(),pid:cp.id,kind:s.noteK,by:myTh||'sameer',date:'Today, '+hm(NOW),sess:'Tue 28 Oct, 09:00',text:s.noteT.trim()},...s.notes],noteT:''});flash('Note saved · '+cp.name);};

  // ---------- availability
  const availCards=thScope.map(t=>({name:TH[t].full,ini:TH[t].ini,isMe:t===myTh,
    rows:DOWF.map((dn,d)=>{const rr=s.hours[t][d]||[];return {dow:dn.slice(0,3),ranges:rr.map(r=>({rng:rng(r.s,r.e),loc:(r.loc==='Clinic'?'':'Home visits · ')+BR[r.br].name,bg:r.loc==='Clinic'?'#fff':'var(--color-accent-100)',op:s.br!=='all'&&r.br!==s.br?'.35':'1'})),closed:!rr.length,
      add:()=>self.setState(st=>{const h=JSON.parse(JSON.stringify(st.hours));const a=h[t][d];const last=a.length?a[a.length-1].e:540;const s0=Math.min(last+60,1140);a.push({s:s0,e:Math.min(s0+120,1200),loc:'Clinic',br:s.br!=='all'?s.br:'kvn'});return {hours:h};})};}),
    copyMon:()=>{self.setState(st=>{const h=JSON.parse(JSON.stringify(st.hours));for(let d=1;d<5;d++)h[t][d]=JSON.parse(JSON.stringify(h[t][0]));return {hours:h};});flash('Copied Monday to Tue–Fri · '+TH[t].short);}}));
  const offRows=s.off.filter(o=>thScope.includes(o.th)).map(o=>({name:TH[o.th].full,ini:TH[o.th].ini,when:o.when,note:o.note||(o.label!==o.reason?o.label:''),reason:o.reason,hasNote:!!(o.note||o.label!==o.reason),remove:()=>{set({off:s.off.filter(x=>x.id!==o.id)});flash('Removed time off · '+TH[o.th].short);}}));
  const toSave=()=>{const f=s.fm;const lbl=(f.from||'Sat 8 Nov')+' '+f.fromT+' – '+(f.to&&f.to!==f.from?f.to+' ':'')+f.toT;set({off:[...s.off,{id:'o'+Date.now(),th:f.th,day:99,s:tm(f.fromT||'09:00'),e:tm(f.toT||'13:00'),reason:f.reason,label:f.reason,when:lbl.replace(/2026-11-0?(\d+)/g,'$1 Nov'),note:f.note}],sheet:null});flash('Time off added · '+TH[f.th].short);};

  // ---------- public booking
  const b=s.book;const setB=(k,v)=>self.setState(st=>({book:{...st.book,[k]:v,errs:{...st.book.errs,[k]:''}}}));
  const BF=k=>({v:b[k],on:e=>setB(k,k==='phone'?e.target.value.replace(/[^\d ]/g,''):e.target.value)});
  const bookSubmit=()=>{const errs={};if(!b.br)errs.br='Choose a branch.';if(!b.name.trim())errs.name='Enter your full name.';const d=dig(b.phone);if(d.length!==10||!/^[6-9]/.test(d))errs.phone='Enter a 10-digit mobile number.';
    if(Object.keys(errs).length){set({book:{...b,errs}});return;}set({book:{...b,step:'sent',errs:{}}});};
  const bb=BR[b.br]||BR.kvn;
  const bookV={brOpts:BRK.filter(k=>BR[k].public!==false).map(k=>({name:BR[k].name,addr:BR[k].addr,bg:b.br===k?'var(--color-accent-100)':'#fff',dot:b.br===k?'var(--color-accent)':'#fff',dotI:b.br===k?'icon-check':'',onClick:()=>setB('br',k)})),brErr:b.errs.br||'',hasBrErr:!!b.errs.br,brBd:b.errs.br?'#E5391B':'var(--color-text)',brName:bb.name,brAddr:bb.addr,brPhone:bb.phone,brTel:telOf(bb.phone),brMap:'https://maps.google.com/?q='+encodeURIComponent('ATP Rehab '+bb.addr),form:b.step==='form',sent:b.step==='sent',name:BF('name'),phone:BF('phone'),email:BF('email'),reason:BF('reason'),date:BF('date'),
    dayChips:[['Today','Today'],['Tomorrow','Tomorrow'],['Date','Pick a date']].map(x=>({...chip(x[1],b.day===x[0],()=>setB('day',x[0])),icon:x[0]==='Date'?'icon-calendar':''})),pickDate:b.day==='Date',
    timeSeg:seg(['Morning','Afternoon','Evening','Any'],b.time,v=>setB('time',v)),
    nameErr:b.errs.name||'',phoneErr:b.errs.phone||'',hasNameErr:!!b.errs.name,hasPhoneErr:!!b.errs.phone,nameBd:b.errs.name?'#E5391B':'var(--color-text)',phoneBd:b.errs.phone?'#E5391B':'var(--color-text)',
    limited:b.limited,submit:b.limited?()=>{}:bookSubmit,btnBg:b.limited?'var(--color-neutral-200)':'var(--color-accent)',
    masked:mask(b.phone||'9823011821'),prefL:(b.day==='Date'?(b.date||'Chosen date'):b.day)+' · '+b.time,reasonL:b.reason||'—',again:()=>set({book:blankBook()})};

  // ---------- shell
  const isOwner=role==='owner';
  const navSet=isOwner?[['branches','Branches','icon-map-pinned']].map(n=>{const a=s.screen===n[0];return {label:n[1],icon:n[2],bg:a?'var(--color-accent-100)':'transparent',fg:a?'var(--color-accent-900)':'var(--color-text)',bar:a?'var(--color-accent)':'transparent',w:a?'800':'500',onClick:()=>go(n[0])};}):[];
  const openBranch=b=>set({sheet:'branch',fm:b?{bName:b.name,bCode:b.code,bAddr:b.addr,bPhone:b.phone,bPublic:b.public!==false,editId:b.id}:{bName:'',bCode:'',bAddr:'',bPhone:'',bPublic:true,editId:null}});
  const slug=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const branchRows=s.branches.map(b=>{const ths=THK.filter(t=>(s.hours[t]||[]).some(d=>(d||[]).some(r=>r.br===b.id)));const n=s.appts.filter(a=>apBr(s,a)===b.id&&a.st!=='cancelled').length;
    return {name:b.name,code:b.code,addr:b.addr,phone:b.phone,tel:telOf(b.phone),link:'patient.atprehab.si/book?branch='+slug(b.name),ths:ths.length?ths.map(t=>TH[t].short).join(', '):'',hasThs:ths.length>0,noThs:!ths.length,week:n+' sessions this week',
      pubBg:b.public!==false?'var(--color-accent)':'#fff',pubKnob:b.public!==false?'22px':'2px',pubL:b.public!==false?'Shown on booking page':'Hidden from booking page',
      togglePub:()=>set({branches:s.branches.map(x=>x.id===b.id?{...x,public:x.public===false}:x)}),edit:()=>openBranch(b),setHours:()=>go('availability',{availTab:'hours',br:b.id,lb:{}}),copy:()=>flash('Copied booking link for '+b.name)};});
  const brSave=()=>{const f=s.fm;const name=(f.bName||'').trim();if(!name||!(f.bAddr||'').trim()){flash('Add a name and an address','danger');return;}
    const code=((f.bCode||'').trim()||name.slice(0,3)).toUpperCase().slice(0,3);const rec={name,code,addr:f.bAddr.trim(),phone:f.bPhone?fmtPhone(f.bPhone):'',public:!!f.bPublic};
    if(f.editId){set({branches:s.branches.map(x=>x.id===f.editId?{...x,...rec}:x),sheet:null});flash('Saved '+name);return;}
    set({branches:[...s.branches,{id:'b'+Date.now(),...rec}],sheet:null});flash('Added branch · '+name+'. Set therapists’ hours next.');};
  const NAV=[['calendar','Calendar','icon-calendar-days'],['inquiries','Inquiries','icon-inbox'],['patients','Patients','icon-users'],['availability','Availability','icon-clock']].filter(n=>n[0]!=='inquiries'||canInq);
  const navMain=NAV.map(n=>{const a=s.screen===n[0]||(n[0]==='patients'&&['patient','noperm'].includes(s.screen));return {label:n[1],icon:n[2],bg:a?'var(--color-accent-100)':'transparent',fg:a?'var(--color-accent-900)':'var(--color-text)',bar:a?'var(--color-accent)':'transparent',w:a?'800':'500',hasBadge:n[0]==='inquiries'&&nNew>0,badge:String(nNew),onClick:()=>go(n[0])};});
  const tabDefs=isTh?[['calendar','Today','icon-calendar-days'],['ADD'],['patients','Patients','icon-users'],['more','More','icon-ellipsis']]:[['calendar','Today','icon-calendar-days'],['inquiries','Inquiries','icon-inbox'],['ADD'],['patients','Patients','icon-users'],['more','More','icon-ellipsis']];
  const tabs=tabDefs.map(t=>{if(t[0]==='ADD')return {isAdd:true,notAdd:false};const a=s.screen===t[0]||(t[0]==='patients'&&['patient','noperm'].includes(s.screen))||(t[0]==='more'&&['availability','branches'].includes(s.screen));return {isAdd:false,notAdd:true,label:t[1],icon:t[2],fg:a?'var(--color-text)':'var(--color-neutral-600)',bar:a?'var(--color-accent)':'transparent',w:a?'800':'500',hasBadge:t[0]==='inquiries'&&nNew>0,badge:String(nNew),onClick:()=>go(t[0])};});
  const titles={calendar:mobile?(isTh?'My day':'Today'):'Calendar',inquiries:'Inquiries',patients:'Patients',patient:mobile?cp.name:'Patient',availability:'Availability',branches:'Branches',more:'More',noperm:'Patients'};
  const dayLbl=DAYS[s.day].lbl;
  const subs={calendar:mobile?dayLbl+' 2026':(s.calView==='day'?DAYS[s.day].dow+DOWF[s.day].slice(3)+', '+DAYS[s.day].dm+' 2026':'27 Oct – 1 Nov 2026'),inquiries:nNew+' new · '+nCont+' contacted',patients:pScope.length+' patients',patient:mobile?'Patient':'Patients / '+cp.name,availability:'Working hours and time off',branches:s.branches.length+' branches · Owner only',more:'ATP Patients',noperm:'ATP Patients'};
  const topAct={calendar:['New appointment','icon-plus',()=>openAppt({day:Math.max(s.day,TODAY)})],inquiries:['New appointment','icon-plus',()=>openAppt()],patients:['New patient','icon-user-plus',()=>openPatientForm()],patient:['Book appointment','icon-calendar-plus',cpV.bookAgain],availability:['Add time off','icon-plus',()=>set({sheet:'timeoff',availTab:'off',fm:{th:myTh||'neha',from:'',fromT:'09:00',to:'',toT:'13:00',reason:'Leave',note:''}})],branches:['Add branch','icon-plus',()=>openBranch()],noperm:null,more:null}[s.screen];

  // ---------- sheet meta + footer
  const SH={convert:[s.cv&&s.cv.done?'Booked':'Book from request',cvV.q?cvV.q.name+' · '+cvV.q.dayPart:''],appt:[ap&&ap.editId?'Reschedule':'New appointment','Booked by '+me.short+' · '+DAYS[TODAY].lbl],detail:['Appointment',dtV.name?dtV.rows[0].v:''],patient:['New patient','Phone is unique per patient'],branch:[s.fm.editId?'Edit branch':'Add branch','Owners only'],sellpkg:['Sell package',cp.name],payment:['Record payment',cp.name],timeoff:['Add time off','Blocks booking on the calendar']}[s.sheet]||['',''];
  const B=(label,onClick,o)=>({label,onClick,bg:'#fff',icon:'',flex:'1',fw:'600',fg:'var(--color-text)',bd:'var(--color-text)',...(o||{})});
  const PRI={bg:'var(--color-accent)',fw:'800',flex:'2'};const OFFP={bg:'var(--color-neutral-200)',fg:'var(--color-neutral-600)',bd:'var(--color-neutral-400)',fw:'800',flex:'2'};
  let foot=[];
  if(s.sheet==='convert'&&s.cv){if(s.cv.done)foot=[B('Done',closeSheet,PRI)];else{const ok=s.cv.slot!=null;foot=[B('Save patient only',cvSaveOnly),B(ok?'Confirm · '+DAYS[s.cv.day].dow+' '+hm(s.cv.slot):'Confirm booking',cvConfirm,{...(ok?PRI:OFFP),icon:'icon-check'})];}}
  if(s.sheet==='appt')foot=[B(ap.editId?'Save new time':'Save'+(apStart!=null&&apOk?' · '+DAYS[ap.day].dow+' '+hm(apStart):''),apSave,{...(apOk?PRI:OFFP),icon:'icon-check'})];
  if(s.sheet==='detail'&&dt){if(dt.mode==='view')foot=[B('Close',closeSheet)];else if(dt.mode==='complete')foot=[B('Back',()=>upd('dt',{mode:'view'})),B('Mark completed',dtCommit,{...PRI,icon:'icon-check'})];else foot=[B('Back',()=>upd('dt',{mode:'view'})),B(dt.mode==='cancel'?'Cancel appointment':'Mark no-show',dtCommit,{bg:'#FFE4DE',fg:'#9A1A00',bd:'#9A1A00',fw:'800',flex:'2'})];}
  if(s.sheet==='patient')foot=[B('Save patient',pfSave,{...(pfV.ok?PRI:OFFP),icon:'icon-check'})];
  if(s.sheet==='sellpkg')foot=[B('Sell package · '+inr(+(s.fm.pkPrice||0)),()=>{const n=+(s.fm.pkN||10);set({patients:s.patients.map(x=>x.id===cp.id?{...x,pkg:{name:s.fm.pkName||n+' sessions',total:n,used:0,sold:'28 Oct',price:+(s.fm.pkPrice||0)}}:x),pay:{...s.pay,[cp.id]:[...(s.pay[cp.id]||[]),{d:'28 Oct',amt:+(s.fm.pkPrice||0),mode:s.fm.mode||'UPI',br:s.fm.br||'kvn',for:'Package · '+(s.fm.pkName||n+' sessions')}]},sheet:null});flash('Package sold · '+cp.name);},{...PRI,icon:'icon-check'})];
  if(s.sheet==='payment')foot=[B('Record '+inr(+(s.fm.amt||0)),()=>{set({pay:{...s.pay,[cp.id]:[...(s.pay[cp.id]||[]),{d:'28 Oct',amt:+(s.fm.amt||0),mode:s.fm.mode||'UPI',br:s.fm.br||'kvn',for:s.fm.for||'Session'}]},sheet:null});flash('Payment recorded · '+inr(+(s.fm.amt||0))+' · '+cp.name);},{...PRI,icon:'icon-check'})];
  if(s.sheet==='branch')foot=[B(s.fm.editId?'Save branch':'Add branch',brSave,{...((s.fm.bName||'').trim()&&(s.fm.bAddr||'').trim()?PRI:OFFP),icon:'icon-check'})];
  if(s.sheet==='timeoff')foot=[B('Add time off',toSave,{...PRI,icon:'icon-check'})];

  const Wd=mobile?390:1280,Hd=mobile?844:800;
  const toasts=s.toasts.map(t=>t.tone==='danger'?{msg:t.msg,bg:'#FFE4DE',fg:'#9A1A00',bd:'2px solid #9A1A00',icon:'icon-circle-alert',ic:'#9A1A00'}:{msg:t.msg,bg:'var(--color-text)',fg:'#fff',bd:'2px solid var(--color-text)',icon:'icon-circle-check',ic:'var(--color-accent)'});
  const calDesk=desktop&&s.screen==='calendar';
  return {
    showChrome:!embedded,stagePad:embedded?'0':'32px 16px',
    fw:Wd+(mobile?20:2)+'px',fh:Hd+(mobile?20:2)+'px',fBorder:mobile?'10px solid #201e1d':'1px solid #c9c9d6',fRadius:mobile?'48px':'10px',
    isMobile:mobile,isDesktop:desktop,url:isPublic?'patient.atprehab.si/book':'patient.atprehab.si/'+(s.screen==='calendar'?'':s.screen),
    devSeg:seg(['Mobile','Desktop'],mobile?'Mobile':'Desktop',v=>set({device:v.toLowerCase()})),
    roleSeg:seg(['Owner','Therapist','Front desk'],ROLELABEL[role],v=>{const r=ROLEKEY[v];set({role:r,screen:r==='therapist'&&s.screen==='inquiries'?'calendar':s.screen,sheet:null,calF:'All'});}),
    screen:s.screen,screenOpts:SCREENS.map(o=>({v:o[0],l:o[1]})),onScreenSel:e=>{const v=e.target.value;set({screen:v,sheet:null,role:v==='inquiries'&&isTh?'frontdesk':role});},
    showSidebar:desktop&&authed,showTopbar:desktop&&authed,showMobileHeader:mobile&&authed,showTabs:mobile&&authed,
    navMain,tabs,meIni:me.ini,meName:me.name,roleLabel:ROLELABEL[role],signOut:()=>go('login'),signIn:()=>go('calendar'),
    title:titles[s.screen]||'',subtitle:subs[s.screen]||'',hasTopAct:!!topAct&&desktop&&authed,topActL:topAct?topAct[0]:'',topActI:topAct?topAct[1]:'',topAct:topAct?topAct[2]:null,
    sbw:mobile?'none':'thin',cPad:isPublic?(mobile?'20px 18px 32px':'48px 24px'):calDesk?'20px 32px 24px':(mobile?'16px 16px 24px':'24px 32px 40px'),gapLg:mobile?'18px':'24px',contentBg:isPublic&&desktop?'var(--color-bg)':'transparent',
    authMargin:mobile?'0':'-24px -32px -40px',authPad:mobile?'24px 8px':'48px 56px',
    showOffline:s.offline&&authed,on,curBr:s.br,onBr:e=>set({br:e.target.value,lb:{}}),brOpts:[{v:'all',l:'All branches'},...BRK.map(k=>({v:k,l:BR[k].name}))],brChipsInq:brChips('inquiries'),brChipsCal:brChips('calendar'),brChipsPat:brChips('patients'),
    fmBrSeg:seg(BRK.map(b=>[b,BR[b].name]),s.fm.br,v=>setFm('br',v)),openAdd,closeSheet,addLabel:s.screen==='patients'?'New patient':'New appointment',
    // public
    pubMax:mobile?'none':'480px',pubBg:mobile?'transparent':'#fff',pubBd:mobile?'0':'2px solid var(--color-text)',pubPad:mobile?'0':'32px',pubShadow:mobile?'none':'var(--shadow-md)',
    bk:bookV,clinic:CLINIC,
    // loading
    showSkelList:s.loading&&authed&&!(desktop&&s.screen==='calendar'),showSkelGrid:s.loading&&desktop&&s.screen==='calendar',skel:[1,2,3,4,5,6],skelCols:[1,2,3],
    // calendar
    showAgenda:on.calendar&&mobile,showGrid:on.calendar&&desktop,isTh,notTh:!isTh,
    dayLabel:dayLbl,isTodaySel:s.day===TODAY,notTodaySel:s.day!==TODAY,dayPrev:()=>set({day:Math.max(0,s.day-1)}),dayNext:()=>set({day:Math.min(5,s.day+1)}),goToday:()=>set({day:TODAY}),
    weekLabel:'27 Oct – 1 Nov',isDayView:s.calView==='day',isWeekView:s.calView==='week',
    viewSeg:seg([['day','Day'],['week','Week']],s.calView,v=>set({calView:v})),
    thChips:isTh?[]:[['All','All'],...THK.map(t=>[t,TH[t].short])].map(x=>chip(x[1],s.calF===x[0],()=>set({calF:x[0]}))),showThChips:!isTh,showWeekFilter:!isTh&&s.calView==='week',
    agenda:ag,hasNext:!!nextA,next:nextV,dayCount:myCount+' sessions · '+myDone+' completed',
    cols,gridHours,gridLines,
    // inquiries
    inqSeg:seg([['New','New ('+nNew+')'],['Contacted','Contacted ('+nCont+')'],['All','All']],s.inqF,v=>set({inqF:v,inqMenu:null})),
    inqRows,inqHasRows:inqRows.length>0,inqEmpty:inqRows.length===0,inqEmptyNew:inqRows.length===0&&s.inqF==='New',inqEmptyOther:inqRows.length===0&&s.inqF!=='New',closeReasons,
    showInqList:on.inquiries&&mobile,showInqTable:on.inquiries&&desktop,inqWide,inqNarrow:!inqWide,inqCols:inqWide?'92px minmax(0,1.1fr) 132px minmax(0,1fr) minmax(0,1.3fr) 100px 132px':'92px minmax(0,1fr) minmax(0,1fr) 100px',
    hasInqSel:!!selQ,inqD,
    copyLink:()=>flash('Copied patient.atprehab.si/book'),shareWa:wa('','Book a physiotherapy session at ATP Rehab, Karvenagar: https://patient.atprehab.si/book').replace('wa.me/91?','wa.me/?'),
    // patients
    pSearch:s.pSearch,onPSearch:e=>set({pSearch:e.target.value}),pRows,pEmpty:!pRows.length,pCount:pRows.length+(pRows.length===1?' patient':' patients'),
    showPList:on.patients&&mobile,showPTable:on.patients&&desktop,cp:cpV,openCp:()=>openPatient(cp.id),tabSeg,pt,
    noteKinds:['Diagnosis','Treatment plan','Session','General'].map(k=>chip(k,s.noteK===k,()=>set({noteK:k}))),noteT:s.noteT,onNoteT:e=>set({noteT:e.target.value}),noteSave,noteBg:s.noteT.trim()?'var(--color-accent)':'var(--color-neutral-200)',
    openSell:()=>set({sheet:'sellpkg',fm:{pkName:'10 sessions',pkN:'10',pkPrice:'6000',mode:'UPI',br:cp.br||'kvn'}}),openPay:()=>set({sheet:'payment',fm:{amt:'800',mode:'UPI',for:'Session · Tue 28 Oct, 09:00',br:cp.br||'kvn'}}),
    // availability
    availSeg:seg([['hours','Working hours'],['off','Time off']],s.availTab,v=>set({availTab:v})),availHours:s.availTab==='hours',availOff:s.availTab==='off',availCards,offRows,
    openTimeoff:()=>set({sheet:'timeoff',fm:{th:myTh||'neha',from:'',fromT:'09:00',to:'',toT:'13:00',reason:'Leave',note:''}}),
    moreItems:[['Availability','icon-clock',()=>go('availability')],['Patients','icon-users',()=>go('patients')],...(isOwner?[['Branches','icon-map-pinned',()=>go('branches')]]:[])].map(x=>({label:x[0],icon:x[1],onClick:x[2]})),
    navSet,hasNavSet:navSet.length>0,branchRows,openBranchNew:()=>openBranch(),isBranch:s.sheet==='branch',canBranches:isOwner,noBranches:!isOwner,
    bf:{name:F('bName'),code:F('bCode'),addr:F('bAddr'),phone:F('bPhone'),pubBg:s.fm.bPublic?'var(--color-accent)':'#fff',pubKnob:s.fm.bPublic?'22px':'2px',togglePub:()=>setFm('bPublic',!s.fm.bPublic),link:'patient.atprehab.si/book?branch='+(slug(s.fm.bName||'')||'…')},
    backToday:()=>go('calendar'),
    // sheets
    sheet:!!s.sheet,sheetTitle:SH[0],sheetSub:SH[1],sp:mobile?{left:'0',top:'64px',bt:'2px solid var(--color-text)',bl:'0'}:{left:'calc(100% - 460px)',top:'0',bt:'0',bl:'2px solid var(--color-text)'},
    isConvert:s.sheet==='convert',isAppt:s.sheet==='appt',isDetail:s.sheet==='detail',isPatientForm:s.sheet==='patient',isSell:s.sheet==='sellpkg',isPayment:s.sheet==='payment',isTimeoff:s.sheet==='timeoff',
    showPicker:(s.sheet==='convert'&&s.cv&&!s.cv.done)||s.sheet==='appt',pk:picker,cv:cvV,ap:apV,dt:dtV,pf:pfV,foot,
    fm:{pkName:F('pkName'),pkN:F('pkN'),pkPrice:F('pkPrice'),amt:F('amt'),for:F('for'),from:F('from'),fromT:F('fromT'),to:F('to'),toT:F('toT'),note:F('note')},
    fmModeSeg:seg(['Cash','UPI','Card'],s.fm.mode,v=>setFm('mode',v)),toReasonSeg:seg(['Leave','Training','Personal'],s.fm.reason,v=>setFm('reason',v)),
    toThChips:thScope.map(t=>chip(TH[t].short,s.fm.th===t,()=>setFm('th',t))),forOpts:['Session · Tue 28 Oct, 09:00','Session · Fri 31 Oct, 09:00','Assessment','Other'].map(x=>({v:x,l:x})),
    hasToasts:toasts.length>0,toasts,toastBottom:mobile&&authed?'100px':'24px'
  };
}
window.ATPPatients={initState,propsChanged,compute};
})();

