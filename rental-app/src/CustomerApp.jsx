import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, getDocs } from "firebase/firestore";

const iS = { width:"100%",boxSizing:"border-box",background:"#f9f9f7",border:"1px solid #e5e3dd",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#1a1a1a",outline:"none",fontFamily:"'Noto Sans KR',sans-serif" };
const TODAY = new Date().toISOString().slice(0,10);
const won = n => (n||0).toLocaleString("ko-KR")+"원";
const diffDays = (a,b) => Math.max(1,Math.round((new Date(b)-new Date(a))/86400000)+1);
const CAT_ICON = {믹서:"🎚️",스피커:"🔊",마이크:"🎤",앰프:"⚡",프로세서:"🖥️",기타:"🔧"};

const EQ_FALLBACK = [
  {id:"e1",name:"야마하 CL5 믹서",cat:"믹서",qty:2,rate:150000},
  {id:"e2",name:"QSC K12.2 스피커",cat:"스피커",qty:4,rate:80000},
  {id:"e3",name:"슈어 SM58 마이크",cat:"마이크",qty:10,rate:15000},
  {id:"e4",name:"슈어 ULXD 무선마이크",cat:"마이크",qty:6,rate:50000},
  {id:"e5",name:"Crown XTi 앰프",cat:"앰프",qty:3,rate:60000},
  {id:"e6",name:"DBX DriveRack PA2",cat:"프로세서",qty:2,rate:40000},
  {id:"e7",name:"JBL PRX815 서브우퍼",cat:"스피커",qty:4,rate:60000},
  {id:"e8",name:"Radial J48 DI박스",cat:"기타",qty:8,rate:10000},
];

export default function CustomerApp() {
  const [eq,setEq] = useState(EQ_FALLBACK);
  const [step,setStep] = useState(1);
  const [items,setItems] = useState([]);
  const [start,setStart] = useState(TODAY);
  const [end,setEnd] = useState(TODAY);
  const [form,setForm] = useState({name:"",phone:"",venue:"",memo:""});
  const [catFilter,setCatFilter] = useState("전체");
  const [error,setError] = useState("");
  const [submitting,setSubmitting] = useState(false);

  useEffect(()=>{
    const unsub = onSnapshot(collection(db,"equipment"),snap=>{
      if(!snap.empty) setEq(snap.docs.map(d=>({...d.data(),_id:d.id})));
    });
    return ()=>unsub();
  },[]);

  const days = diffDays(start,end);
  const total = items.reduce((s,i)=>{ const e=eq.find(x=>x.id===i.id||x._id===i.id); return s+(e?e.rate*i.qty*days:0); },0);
  const CATS = ["전체",...new Set(eq.map(e=>e.cat))];
  const filtered = catFilter==="전체"?eq:eq.filter(e=>e.cat===catFilter);

  const toggleItem = (eid) => { if(items.find(i=>i.id===eid)) setItems(items.filter(i=>i.id!==eid)); else setItems([...items,{id:eid,qty:1}]); };
  const setQty = (eid,q) => setItems(items.map(i=>i.id===eid?{...i,qty:Math.max(1,q)}:i));

  const goStep2 = () => {
    if(items.length===0){setError("장비를 1개 이상 선택해주세요");return;}
    if(new Date(end)<new Date(start)){setError("반납일이 시작일보다 빠릅니다");return;}
    setError(""); setStep(2);
  };

  const submit = async () => {
    if(!form.name||!form.phone){setError("이름과 연락처는 필수입니다");return;}
    setSubmitting(true);
    await addDoc(collection(db,"requests"),{
      ...form, items, start, end, status:"신청",
      createdAt: new Date().toISOString(),
    });
    setSubmitting(false); setStep(3);
  };

  if(step===3) return (
    <div style={{background:"#fafaf8",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{background:"#fff",borderRadius:24,padding:40,textAlign:"center",maxWidth:360,width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,.08)"}}>
        <div style={{width:72,height:72,background:"#f59e0b22",borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"}}>✅</div>
        <div style={{fontSize:22,fontWeight:900,marginBottom:8}}>신청 완료!</div>
        <div style={{fontSize:14,color:"#6b7280",lineHeight:1.8,marginBottom:24}}>예약 신청이 접수되었습니다.<br/>담당자 확인 후 연락드리겠습니다.</div>
        <div style={{background:"#f5f4f0",borderRadius:12,padding:16,textAlign:"left",marginBottom:24}}>
          {[["고객명",form.name],["연락처",form.phone],["기간",`${start}~${end}(${days}일)`],["장소",form.venue||"-"],["예상금액",won(total)]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}><span style={{color:"#6b7280"}}>{l}</span><span style={{fontWeight:600}}>{v}</span></div>
          ))}
        </div>
        <button onClick={()=>{setStep(1);setItems([]);setForm({name:"",phone:"",venue:"",memo:""}); }} style={{width:"100%",border:"none",background:"#f59e0b",borderRadius:12,padding:"14px 0",fontSize:14,fontWeight:700,cursor:"pointer"}}>새 예약 신청</button>
      </div>
    </div>
  );

  return (
    <div style={{background:"#fafaf8",minHeight:"100vh",fontFamily:"'Noto Sans KR',sans-serif",color:"#1a1a1a",maxWidth:480,margin:"0 auto"}}>
      {/* 헤더 */}
      <div style={{background:"#111",padding:"20px 20px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{fontSize:28}}>🎛️</div>
          <div><div style={{fontSize:16,fontWeight:900,color:"#fff"}}>음향장비 렌탈</div><div style={{fontSize:11,color:"#888"}}>온라인 예약 신청</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {[{n:1,label:"장비선택"},{n:2,label:"정보입력"},{n:3,label:"완료"}].map((s,i)=>(
            <div key={s.n} style={{display:"flex",alignItems:"center",gap:4,flex:i<2?1:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:22,height:22,borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:step>=s.n?"#f59e0b":"#333",color:step>=s.n?"#000":"#666"}}>{s.n}</div>
                <div style={{fontSize:11,color:step===s.n?"#fff":"#666",fontWeight:step===s.n?700:400}}>{s.label}</div>
              </div>
              {i<2&&<div style={{flex:1,height:1,background:step>s.n?"#f59e0b":"#333",margin:"0 4px"}}/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:16}}>
        {step===1&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff",borderRadius:14,border:"1px solid #e5e3dd",padding:16}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📅 대여 기간</div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>시작일</div><input type="date" value={start} min={TODAY} onChange={e=>setStart(e.target.value)} style={iS}/></div>
                <div style={{flex:1}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>반납일</div><input type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)} style={iS}/></div>
              </div>
              {start&&end&&<div style={{fontSize:12,color:"#f59e0b",marginTop:8,fontWeight:600}}>총 {days}일</div>}
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto"}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{border:"none",borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",background:catFilter===c?"#f59e0b":"#fff",color:catFilter===c?"#000":"#6b7280",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>{c}</button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filtered.map(e=>{
                const eid=e.id||e._id; const sel=items.find(i=>i.id===eid);
                return (
                  <div key={e._id||e.id} onClick={()=>toggleItem(eid)} style={{background:"#fff",borderRadius:14,border:`2px solid ${sel?"#f59e0b":"#e5e3dd"}`,padding:"12px 14px",cursor:"pointer",transition:"border-color .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,background:sel?"#fef3c720":"#f5f4f0",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{CAT_ICON[e.cat]||"🔧"}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600}}>{e.name}</div>
                        <div style={{fontSize:11,color:"#6b7280"}}>{e.cat} · {won(e.rate)}/일</div>
                      </div>
                      {sel?(
                        <div onClick={ev=>ev.stopPropagation()} style={{display:"flex",alignItems:"center",gap:6}}>
                          <button onClick={()=>setQty(eid,sel.qty-1)} style={{width:28,height:28,border:"1px solid #e5e3dd",borderRadius:8,background:"#f5f4f0",cursor:"pointer",fontSize:16}}>−</button>
                          <span style={{fontSize:14,fontWeight:700,minWidth:20,textAlign:"center"}}>{sel.qty}</span>
                          <button onClick={()=>setQty(eid,sel.qty+1)} style={{width:28,height:28,border:"1px solid #f59e0b",borderRadius:8,background:"#fef3c7",cursor:"pointer",fontSize:16}}>+</button>
                        </div>
                      ):(
                        <div style={{width:24,height:24,borderRadius:50,border:"2px solid #e5e3dd"}}/>
                      )}
                    </div>
                    {sel&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #e5e3dd",fontSize:12,color:"#f59e0b",fontWeight:600,textAlign:"right"}}>{won(e.rate*sel.qty*days)}</div>}
                  </div>
                );
              })}
            </div>
            {error&&<div style={{fontSize:12,color:"#dc2626",textAlign:"center"}}>{error}</div>}
            {items.length>0?(
              <div style={{background:"#111",borderRadius:14,padding:"14px 16px",position:"sticky",bottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:13,color:"#aaa"}}>선택 {items.length}종 · {days}일</div>
                  <div style={{fontSize:15,fontWeight:900,color:"#f59e0b"}}>{won(total)}</div>
                </div>
                <button onClick={goStep2} style={{width:"100%",border:"none",background:"#f59e0b",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:700,cursor:"pointer"}}>다음 단계 →</button>
              </div>
            ):(
              <button onClick={goStep2} style={{border:"none",background:"#f59e0b",borderRadius:12,padding:"14px 0",fontSize:14,fontWeight:700,cursor:"pointer",width:"100%"}}>다음 단계 →</button>
            )}
          </div>
        )}

        {step===2&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fff",borderRadius:14,border:"1px solid #e5e3dd",padding:14}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📋 선택 내역</div>
              <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>{start} ~ {end} ({days}일)</div>
              {items.map(i=>{ const e=eq.find(x=>x.id===i.id||x._id===i.id); return e?(<div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:"1px solid #e5e3dd"}}><span>{e.name} × {i.qty}</span><span style={{color:"#f59e0b",fontWeight:600}}>{won(e.rate*i.qty*days)}</span></div>):null; })}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:900,padding:"10px 0 0"}}><span>예상 합계</span><span style={{color:"#f59e0b"}}>{won(total)}</span></div>
              <div style={{fontSize:11,color:"#6b7280"}}>* 실제 금액은 담당자 확인 후 안내드립니다</div>
            </div>
            <div style={{background:"#fff",borderRadius:14,border:"1px solid #e5e3dd",padding:14,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:13,fontWeight:700}}>👤 신청자 정보</div>
              {[["이름 *","홍길동","name","text"],["연락처 *","010-0000-0000","phone","tel"],["행사장소","장소명 (선택)","venue","text"]].map(([l,p,k,t])=>(
                <div key={k}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>{l}</div><input type={t} placeholder={p} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={iS}/></div>
              ))}
              <div><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>요청사항</div><textarea placeholder="추가 요청사항 (선택)" value={form.memo} onChange={e=>setForm({...form,memo:e.target.value})} rows={3} style={{...iS,resize:"none"}}/></div>
            </div>
            {error&&<div style={{fontSize:12,color:"#dc2626",textAlign:"center"}}>{error}</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setStep(1)} style={{flex:1,border:"1px solid #e5e3dd",background:"#fff",borderRadius:12,padding:"13px 0",fontSize:14,fontWeight:600,cursor:"pointer",color:"#6b7280"}}>← 이전</button>
              <button onClick={submit} disabled={submitting} style={{flex:2,border:"none",background:submitting?"#ccc":"#f59e0b",borderRadius:12,padding:"13px 0",fontSize:14,fontWeight:700,cursor:submitting?"not-allowed":"pointer"}}>{submitting?"신청 중...":"신청하기"}</button>
            </div>
            <div style={{fontSize:11,color:"#6b7280",textAlign:"center",lineHeight:1.8}}>신청 후 담당자 확인을 거쳐 예약이 확정됩니다.<br/>문의: 📞 031-000-0000</div>
          </div>
        )}
      </div>
    </div>
  );
}
