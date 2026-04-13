import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs } from "firebase/firestore";

const C = { bg:"#0d0d0d",surface:"#161616",card:"#1e1e1e",border:"#2a2a2a",accent:"#f59e0b",green:"#22c55e",red:"#ef4444",blue:"#60a5fa",purple:"#a78bfa",gray:"#6b7280",text:"#f3f3f3",dim:"#9ca3af" };
const iS = { width:"100%",boxSizing:"border-box",background:"#111",border:"1px solid #2a2a2a",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#f3f3f3",outline:"none",fontFamily:"'Noto Sans KR',sans-serif" };
const won = n => (n||0).toLocaleString("ko-KR")+"원";
const TODAY = new Date().toISOString().slice(0,10);
const diffDays = (a,b) => Math.max(1,Math.round((new Date(b)-new Date(a))/86400000)+1);
const statusColor = s => s==="대여중"?"#f59e0b":s==="예약"?"#60a5fa":s==="반납완료"?"#22c55e":"#6b7280";
const CAT_ICON = {믹서:"🎚️",스피커:"🔊",마이크:"🎤",앰프:"⚡",프로세서:"🖥️",기타:"🔧"};

const EQ_INIT = [
  {id:"e1",name:"야마하 CL5 믹서",cat:"믹서",qty:2,rate:150000},
  {id:"e2",name:"QSC K12.2 스피커",cat:"스피커",qty:4,rate:80000},
  {id:"e3",name:"슈어 SM58 마이크",cat:"마이크",qty:10,rate:15000},
  {id:"e4",name:"슈어 ULXD 무선마이크",cat:"마이크",qty:6,rate:50000},
  {id:"e5",name:"Crown XTi 앰프",cat:"앰프",qty:3,rate:60000},
  {id:"e6",name:"DBX DriveRack PA2",cat:"프로세서",qty:2,rate:40000},
  {id:"e7",name:"JBL PRX815 서브우퍼",cat:"스피커",qty:4,rate:60000},
  {id:"e8",name:"Radial J48 DI박스",cat:"기타",qty:8,rate:10000},
];

/* ── 공통 컴포넌트 ── */
const Btn = ({children,onClick,outline,style={}}) => (
  <button onClick={onClick} style={{flex:1,border:outline?`1px solid #2a2a2a`:"none",borderRadius:10,padding:"11px 0",fontSize:13,fontWeight:700,cursor:"pointer",background:outline?"#161616":"#f59e0b",color:outline?"#f3f3f3":"#000",...style}}>{children}</button>
);
const Label = ({children}) => <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>{children}</div>;
const Input = ({placeholder,value,onChange,type="text"}) => (
  <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} style={iS}/>
);
const Section = ({title,children}) => (
  <div>
    <div style={{fontSize:12,fontWeight:700,color:"#9ca3af",marginBottom:8}}>{title}</div>
    <div style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #2a2a2a",padding:"4px 14px"}}>{children}</div>
  </div>
);
const StatCard = ({label,value,color,onClick}) => (
  <div onClick={onClick} style={{background:"#1e1e1e",borderRadius:12,padding:"14px 16px",border:"1px solid #2a2a2a",cursor:onClick?"pointer":"default",flex:1}}>
    <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>{label}</div>
    <div style={{fontSize:22,fontWeight:900,color:color||"#f3f3f3"}}>{value}</div>
  </div>
);
const StatusBadge = ({s}) => (
  <div style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:10,background:statusColor(s)+"22",color:statusColor(s)}}>{s}</div>
);
const Empty = ({children,icon}) => (
  <div style={{textAlign:"center",color:"#6b7280",padding:50}}>
    {icon&&<div style={{fontSize:36,marginBottom:12}}>{icon}</div>}
    <div style={{fontSize:14,lineHeight:1.8}}>{children}</div>
  </div>
);
const CatBtn = ({children,active,onClick}) => (
  <button onClick={onClick} style={{border:"none",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",background:active?"#f59e0b":"#1e1e1e",color:active?"#000":"#9ca3af"}}>{children}</button>
);

export default function AdminApp() {
  const [eq,setEq] = useState([]);
  const [rentals,setRentals] = useState([]);
  const [requests,setRequests] = useState([]);
  const [tab,setTab] = useState("dash");
  const [loading,setLoading] = useState(true);
  const [toast,setToast] = useState(null);

  const showToast = (msg,type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  useEffect(()=>{
    const init = async () => {
      const snap = await getDocs(collection(db,"equipment"));
      if(snap.empty) { for(const e of EQ_INIT) await setDoc(doc(db,"equipment",e.id),e); }
    };
    init();
    const u1 = onSnapshot(collection(db,"equipment"),snap=>setEq(snap.docs.map(d=>({...d.data(),_id:d.id}))));
    const u2 = onSnapshot(collection(db,"rentals"),snap=>setRentals(snap.docs.map(d=>({...d.data(),_id:d.id}))));
    const u3 = onSnapshot(collection(db,"requests"),snap=>{ setRequests(snap.docs.map(d=>({...d.data(),_id:d.id}))); setLoading(false); });
    return ()=>{ u1();u2();u3(); };
  },[]);

  const active = rentals.filter(r=>r.status==="대여중");
  const reserved = rentals.filter(r=>r.status==="예약");
  const todayReturn = active.filter(r=>r.end===TODAY);
  const newReqs = requests.filter(r=>r.status==="신청");
  const unpaidTotal = rentals.filter(r=>!r.paid&&r.status!=="반납완료").reduce((s,r)=>s+(r.total||0),0);

  const avail = (eid) => {
    const e=eq.find(x=>x.id===eid||x._id===eid); if(!e) return 0;
    const out=active.reduce((s,r)=>{ const i=(r.items||[]).find(x=>x.id===eid); return s+(i?i.qty:0); },0);
    return (e.qty||0)-out;
  };

  const addRental = async (data) => { await addDoc(collection(db,"rentals"),{...data,createdAt:new Date().toISOString()}); showToast("대여 등록!"); };
  const updRental = async (_id,data) => { await updateDoc(doc(db,"rentals",_id),data); };
  const delRental = async (_id) => { await deleteDoc(doc(db,"rentals",_id)); showToast("삭제됨"); };
  const returnRental = async (_id) => { await updRental(_id,{status:"반납완료"}); showToast("반납 처리!"); };
  const setPaid = async (_id) => { await updRental(_id,{paid:true}); showToast("결제 완료!"); };
  const startRental = async (_id) => { await updRental(_id,{status:"대여중"}); showToast("대여 시작!"); };

  const confirmReq = async (req) => {
    const total=(req.items||[]).reduce((s,i)=>{ const e=eq.find(x=>x.id===i.id); return s+(e?e.rate*i.qty*diffDays(req.start,req.end):0); },0);
    await addDoc(collection(db,"rentals"),{ custName:req.name,phone:req.phone,items:req.items,start:req.start,end:req.end,venue:req.venue||"",memo:req.memo||"",status:"예약",total,paid:false,createdAt:new Date().toISOString() });
    await updateDoc(doc(db,"requests",req._id),{status:"확정"});
    showToast("예약 확정!");
  };
  const rejectReq = async (_id) => { await updateDoc(doc(db,"requests",_id),{status:"거절"}); showToast("거절 처리","err"); };
  const addEq = async (data) => { await addDoc(collection(db,"equipment"),data); showToast("장비 추가!"); };
  const delEq = async (_id) => { await deleteDoc(doc(db,"equipment",_id)); showToast("삭제됨"); };

  if(loading) return <div style={{background:"#0d0d0d",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#f59e0b",fontFamily:"'Noto Sans KR',sans-serif",fontSize:16}}>⏳ 로딩 중...</div>;

  const TABS = [{id:"dash",icon:"◈",label:"대시보드"},{id:"eq",icon:"⚡",label:"장비"},{id:"rent",icon:"📋",label:"대여"},{id:"req",icon:"🔔",label:"신청",badge:newReqs.length},{id:"est",icon:"💰",label:"견적"}];

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Noto Sans KR',sans-serif",color:C.text,maxWidth:480,margin:"0 auto"}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 18px 10px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:C.accent,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎛️</div>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>음향렌탈 관리자</div>
            <div style={{fontSize:11,color:C.dim}}>{TODAY} · 대여중 {active.length} · 예약 {reserved.length}</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            {todayReturn.length>0&&<div style={{background:C.red,borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700}}>오늘반납 {todayReturn.length}</div>}
            {newReqs.length>0&&<div style={{background:C.purple,borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700}}>신청 {newReqs.length}</div>}
          </div>
        </div>
      </div>

      <div style={{padding:"14px 14px 80px"}}>
        {tab==="dash"&&<Dashboard active={active} reserved={reserved} todayReturn={todayReturn} unpaidTotal={unpaidTotal} eq={eq} avail={avail} newReqs={newReqs} setTab={setTab}/>}
        {tab==="eq"&&<Equipment eq={eq} avail={avail} addEq={addEq} delEq={delEq}/>}
        {tab==="rent"&&<Rentals rentals={rentals} eq={eq} avail={avail} addRental={addRental} returnRental={returnRental} setPaid={setPaid} startRental={startRental} delRental={delRental}/>}
        {tab==="req"&&<Requests requests={requests} eq={eq} confirmReq={confirmReq} rejectReq={rejectReq}/>}
        {tab==="est"&&<Estimate eq={eq}/>}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,border:"none",background:"none",padding:"10px 0 12px",cursor:"pointer",position:"relative"}}>
            <div style={{fontSize:18,marginBottom:2}}>{t.icon}</div>
            <div style={{fontSize:10,color:tab===t.id?C.accent:C.gray,fontWeight:tab===t.id?700:400}}>{t.label}</div>
            {(t.badge||0)>0&&<div style={{position:"absolute",top:6,right:"50%",transform:"translateX(8px)",background:C.purple,borderRadius:10,minWidth:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>{t.badge}</div>}
            {tab===t.id&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,background:C.accent,borderRadius:2}}/>}
          </button>
        ))}
      </div>

      {toast&&<div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:toast.type==="err"?C.red:C.green,color:"#fff",borderRadius:30,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}

function Dashboard({active,reserved,todayReturn,unpaidTotal,eq,avail,newReqs,setTab}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10}}>
        <StatCard label="대여중" value={active.length+"건"} color="#f59e0b" onClick={()=>setTab("rent")}/>
        <StatCard label="예약" value={reserved.length+"건"} color="#60a5fa" onClick={()=>setTab("rent")}/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <StatCard label="오늘 반납" value={todayReturn.length+"건"} color={todayReturn.length>0?"#ef4444":"#22c55e"}/>
        <StatCard label="미수금" value={unpaidTotal>0?(unpaidTotal/10000).toFixed(0)+"만원":"없음"} color={unpaidTotal>0?"#ef4444":"#22c55e"}/>
      </div>
      {newReqs.length>0&&(
        <div onClick={()=>setTab("req")} style={{background:"#a78bfa15",border:"1px solid #a78bfa",borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22}}>🔔</div>
          <div><div style={{fontSize:13,fontWeight:700,color:"#a78bfa"}}>새 예약 신청 {newReqs.length}건</div><div style={{fontSize:11,color:"#9ca3af"}}>고객 예약 페이지 접수</div></div>
          <div style={{marginLeft:"auto",color:"#9ca3af",fontSize:18}}>›</div>
        </div>
      )}
      {todayReturn.length>0&&(
        <Section title="⚠️ 오늘 반납 예정">
          {todayReturn.map(r=>(
            <div key={r._id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #2a2a2a"}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{r.custName}</div><div style={{fontSize:11,color:"#9ca3af"}}>{r.venue||"장소 미정"}</div></div>
              <div style={{fontSize:13,color:"#f59e0b",fontWeight:700}}>{won(r.total)}</div>
            </div>
          ))}
        </Section>
      )}
      <Section title="장비 현황">
        {eq.map(e=>{
          const eid=e.id||e._id; const a=avail(eid); const out=(e.qty||0)-a;
          return (
            <div key={e._id} style={{display:"flex",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #2a2a2a"}}>
              <div style={{fontSize:18,marginRight:10}}>{CAT_ICON[e.cat]||"🔧"}</div>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{e.name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{e.cat}</div></div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:out>0?"#f59e0b":"#22c55e"}}>출고 {out}/{e.qty}</div>
                <div style={{fontSize:11,color:a===0?"#ef4444":"#9ca3af"}}>재고 {a}{a===0?" ⚠️":""}</div>
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Equipment({eq,avail,addEq,delEq}) {
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({name:"",cat:"믹서",qty:"",rate:""});
  const [catF,setCatF] = useState("전체");
  const CATS=["전체","믹서","스피커","마이크","앰프","프로세서","기타"];
  const filtered=catF==="전체"?eq:eq.filter(e=>e.cat===catF);
  const add=()=>{ if(!form.name||!form.qty||!form.rate) return; addEq({id:"e"+Date.now(),name:form.name,cat:form.cat,qty:+form.qty,rate:+form.rate}); setForm({name:"",cat:"믹서",qty:"",rate:""}); setShowForm(false); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,overflowX:"auto"}}>{CATS.map(c=><CatBtn key={c} active={catF===c} onClick={()=>setCatF(c)}>{c}</CatBtn>)}</div>
      <div style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #2a2a2a",overflow:"hidden"}}>
        {filtered.map((e,i)=>{ const a=avail(e.id||e._id); return (
          <div key={e._id} style={{padding:"12px 14px",borderBottom:i<filtered.length-1?"1px solid #2a2a2a":"none",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,background:"#161616",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{CAT_ICON[e.cat]||"🔧"}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{e.name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{e.cat} · {(e.rate||0).toLocaleString()}원/일</div></div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:700,color:a===0?"#ef4444":a<e.qty?"#f59e0b":"#22c55e"}}>재고 {a}/{e.qty}</div>
              <button onClick={()=>delEq(e._id)} style={{border:"none",background:"none",color:"#6b7280",fontSize:11,cursor:"pointer"}}>삭제</button>
            </div>
          </div>
        );})}
      </div>
      {showForm?(
        <div style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #f59e0b",padding:16,display:"flex",flexDirection:"column",gap:10}}>
          <Input placeholder="장비명 *" value={form.name} onChange={v=>setForm({...form,name:v})}/>
          <select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} style={iS}>{["믹서","스피커","마이크","앰프","프로세서","기타"].map(c=><option key={c}>{c}</option>)}</select>
          <div style={{display:"flex",gap:8}}>
            <Input placeholder="수량" type="number" value={form.qty} onChange={v=>setForm({...form,qty:v})}/>
            <Input placeholder="일 단가(원)" type="number" value={form.rate} onChange={v=>setForm({...form,rate:v})}/>
          </div>
          <div style={{display:"flex",gap:8}}><Btn outline onClick={()=>setShowForm(false)}>취소</Btn><Btn onClick={add}>추가</Btn></div>
        </div>
      ):<Btn onClick={()=>setShowForm(true)}>+ 장비 추가</Btn>}
    </div>
  );
}

function Rentals({rentals,eq,avail,addRental,returnRental,setPaid,startRental,delRental}) {
  const [filter,setFilter]=useState("전체");
  const [showForm,setShowForm]=useState(false);
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({custName:"",phone:"",venue:"",start:TODAY,end:TODAY,items:[],memo:"",paid:false});
  const [addEqId,setAddEqId]=useState("");
  const [addEqQty,setAddEqQty]=useState(1);
  const FILTERS=["전체","대여중","예약","반납완료"];
  const filtered=filter==="전체"?rentals:rentals.filter(r=>r.status===filter);
  const calcTotal=(items,s,e)=>items.reduce((t,i)=>{ const eq2=eq.find(x=>x.id===i.id); return t+(eq2?eq2.rate*i.qty*diffDays(s,e):0); },0);
  const addItem=()=>{ if(!addEqId) return; if(form.items.find(i=>i.id===addEqId)) setForm({...form,items:form.items.map(i=>i.id===addEqId?{...i,qty:i.qty+addEqQty}:i)}); else setForm({...form,items:[...form.items,{id:addEqId,qty:addEqQty}]}); };
  const submit=()=>{ if(!form.custName||!form.phone||form.items.length===0) return; addRental({...form,total:calcTotal(form.items,form.start,form.end),status:"예약"}); setShowForm(false); setForm({custName:"",phone:"",venue:"",start:TODAY,end:TODAY,items:[],memo:"",paid:false}); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6}}>{FILTERS.map(f=><CatBtn key={f} active={filter===f} onClick={()=>setFilter(f)}>{f}</CatBtn>)}</div>
      {filtered.length===0&&<Empty>해당 내역 없음</Empty>}
      {[...filtered].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).map(r=>(
        <div key={r._id} style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #2a2a2a",padding:14,cursor:"pointer"}} onClick={()=>setSel(sel?._id===r._id?null:r)}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <StatusBadge s={r.status}/>
            {!r.paid&&r.status!=="반납완료"&&<div style={{fontSize:12,color:"#ef4444",fontWeight:600}}>미결제</div>}
            <div style={{marginLeft:"auto",fontSize:13,fontWeight:700,color:"#f59e0b"}}>{won(r.total)}</div>
          </div>
          <div style={{fontSize:15,fontWeight:700}}>{r.custName}</div>
          <div style={{fontSize:12,color:"#9ca3af"}}>{r.venue||"장소 미정"} · {r.start}~{r.end}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>{(r.items||[]).map(i=>eq.find(e=>e.id===i.id)?.name).filter(Boolean).join(", ")}</div>
          {sel?._id===r._id&&(
            <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #2a2a2a"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:12,marginBottom:6}}>📞 {r.phone}</div>
              {r.memo&&<div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>📝 {r.memo}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {r.status==="대여중"&&<Btn onClick={()=>{returnRental(r._id);setSel(null);}}>반납처리</Btn>}
                {r.status==="예약"&&<Btn onClick={()=>{startRental(r._id);setSel(null);}}>대여시작</Btn>}
                {!r.paid&&<Btn outline onClick={()=>{setPaid(r._id);setSel(null);}}>결제완료</Btn>}
                <Btn outline onClick={()=>{delRental(r._id);setSel(null);}}>삭제</Btn>
              </div>
            </div>
          )}
        </div>
      ))}
      {showForm?(
        <div style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #f59e0b",padding:16,display:"flex",flexDirection:"column",gap:10}}>
          <Input placeholder="고객명 *" value={form.custName} onChange={v=>setForm({...form,custName:v})}/>
          <Input placeholder="연락처 *" value={form.phone} onChange={v=>setForm({...form,phone:v})}/>
          <Input placeholder="행사장소" value={form.venue} onChange={v=>setForm({...form,venue:v})}/>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><Label>시작일</Label><Input type="date" value={form.start} onChange={v=>setForm({...form,start:v})}/></div>
            <div style={{flex:1}}><Label>반납일</Label><Input type="date" value={form.end} onChange={v=>setForm({...form,end:v})}/></div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <select value={addEqId} onChange={e=>setAddEqId(e.target.value)} style={{...iS,flex:2}}>
              <option value="">장비 선택</option>
              {eq.map(e=><option key={e.id||e._id} value={e.id||e._id}>{e.name} (재고:{avail(e.id||e._id)})</option>)}
            </select>
            <input type="number" min="1" value={addEqQty} onChange={e=>setAddEqQty(+e.target.value)} style={{...iS,flex:1}}/>
            <button onClick={addItem} style={{border:"none",background:"#f59e0b",color:"#000",borderRadius:8,padding:"0 12px",fontWeight:700,cursor:"pointer"}}>+</button>
          </div>
          {form.items.length>0&&(
            <div style={{background:"#111",borderRadius:8,padding:10}}>
              {form.items.map(i=>{ const e=eq.find(x=>x.id===i.id); return e?(<div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0"}}><span>{e.name}×{i.qty}</span><span style={{color:"#f59e0b"}}>{won(e.rate*i.qty*diffDays(form.start,form.end))}</span></div>):null; })}
              <div style={{borderTop:"1px solid #2a2a2a",marginTop:6,paddingTop:6,fontSize:13,fontWeight:700,textAlign:"right",color:"#f59e0b"}}>합계: {won(calcTotal(form.items,form.start,form.end))}</div>
            </div>
          )}
          <Input placeholder="메모" value={form.memo} onChange={v=>setForm({...form,memo:v})}/>
          <div style={{display:"flex",gap:8}}><Btn outline onClick={()=>setShowForm(false)}>취소</Btn><Btn onClick={submit}>등록</Btn></div>
        </div>
      ):<Btn onClick={()=>setShowForm(true)}>+ 대여 등록</Btn>}
    </div>
  );
}

function Requests({requests,eq,confirmReq,rejectReq}) {
  const pending=requests.filter(r=>r.status==="신청");
  const done=requests.filter(r=>r.status!=="신청");
  const Card=({r})=>(
    <div style={{background:"#1e1e1e",borderRadius:12,border:`1px solid ${r.status==="신청"?"#a78bfa":"#2a2a2a"}`,padding:14,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <div style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:10,background:r.status==="신청"?"#a78bfa20":r.status==="확정"?"#22c55e20":"#ef444420",color:r.status==="신청"?"#a78bfa":r.status==="확정"?"#22c55e":"#ef4444"}}>{r.status}</div>
        <div style={{marginLeft:"auto",fontSize:11,color:"#9ca3af"}}>{(r.createdAt||"").slice(0,10)}</div>
      </div>
      <div style={{fontSize:15,fontWeight:700}}>{r.name}</div>
      <div style={{fontSize:12,color:"#9ca3af"}}>📞 {r.phone}</div>
      <div style={{fontSize:12,color:"#9ca3af"}}>📍 {r.venue||"미정"} · {r.start}~{r.end}</div>
      <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>{(r.items||[]).map(i=>{ const e=eq.find(x=>x.id===i.id); return e?`${e.name}×${i.qty}`:"?"; }).join(", ")}</div>
      {r.memo&&<div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>💬 {r.memo}</div>}
      {r.status==="신청"&&<div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>confirmReq(r)}>확정</Btn><Btn outline onClick={()=>rejectReq(r._id)}>거절</Btn></div>}
    </div>
  );
  return (
    <div>
      {pending.length===0&&done.length===0&&<Empty icon="🔔">고객 예약 페이지에서<br/>신청이 들어오면 여기 표시됩니다</Empty>}
      {pending.length>0&&<><div style={{fontSize:13,fontWeight:700,color:"#a78bfa",marginBottom:10}}>새 신청 {pending.length}건</div>{pending.map(r=><Card key={r._id} r={r}/>)}</>}
      {done.length>0&&<><div style={{fontSize:13,fontWeight:700,color:"#9ca3af",margin:"16px 0 10px"}}>처리 완료</div>{done.map(r=><Card key={r._id} r={r}/>)}</>}
    </div>
  );
}

function Estimate({eq}) {
  const [items,setItems]=useState([]);
  const [start,setStart]=useState(TODAY);
  const [end,setEnd]=useState(TODAY);
  const [selEq,setSelEq]=useState("");
  const [selQty,setSelQty]=useState(1);
  const [custName,setCustName]=useState("");
  const days=diffDays(start,end);
  const total=items.reduce((s,i)=>{ const e=eq.find(x=>x.id===i.id); return s+(e?e.rate*i.qty*days:0); },0);
  const addItem=()=>{ if(!selEq) return; if(items.find(i=>i.id===selEq)) setItems(items.map(i=>i.id===selEq?{...i,qty:i.qty+selQty}:i)); else setItems([...items,{id:selEq,qty:selQty}]); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #2a2a2a",padding:14}}>
        <Input placeholder="고객명" value={custName} onChange={setCustName}/>
        <div style={{height:8}}/>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}><Label>시작일</Label><Input type="date" value={start} onChange={setStart}/></div>
          <div style={{flex:1}}><Label>반납일</Label><Input type="date" value={end} onChange={setEnd}/></div>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",margin:"8px 0"}}>기간: {days}일</div>
        <div style={{display:"flex",gap:6}}>
          <select value={selEq} onChange={e=>setSelEq(e.target.value)} style={{...iS,flex:2}}>
            <option value="">장비 선택</option>
            {eq.map(e=><option key={e.id||e._id} value={e.id||e._id}>{e.name}</option>)}
          </select>
          <input type="number" min="1" value={selQty} onChange={e=>setSelQty(+e.target.value)} style={{...iS,flex:1}}/>
          <button onClick={addItem} style={{border:"none",background:"#f59e0b",color:"#000",borderRadius:8,padding:"0 12px",fontWeight:700,cursor:"pointer"}}>+</button>
        </div>
      </div>
      {items.length>0&&(
        <div style={{background:"#1e1e1e",borderRadius:12,border:"1px solid #2a2a2a",padding:14}}>
          {custName&&<div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📄 {custName} 견적서</div>}
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>{start} ~ {end} ({days}일)</div>
          {items.map((i,idx)=>{ const e=eq.find(x=>x.id===i.id); return e?(<div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #2a2a2a"}}><div><div style={{fontSize:13}}>{e.name} × {i.qty}</div><div style={{fontSize:11,color:"#9ca3af"}}>{won(e.rate)} × {i.qty} × {days}일</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:13,fontWeight:600,color:"#f59e0b"}}>{won(e.rate*i.qty*days)}</div><button onClick={()=>setItems(items.filter((_,j)=>j!==idx))} style={{border:"none",background:"none",color:"#6b7280",cursor:"pointer"}}>✕</button></div></div>):null; })}
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0 4px",fontSize:16,fontWeight:900}}><span>합계</span><span style={{color:"#f59e0b"}}>{won(total)}</span></div>
          <div style={{fontSize:11,color:"#9ca3af"}}>부가세 포함: {won(Math.round(total*1.1))}</div>
        </div>
      )}
      {items.length>0&&<Btn onClick={()=>setItems([])}>초기화</Btn>}
    </div>
  );
}
