import React, {
  useState, useEffect, useContext, createContext, useRef,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { generateSopPDF } from "./generatePDF";
import { api } from "../convex/_generated/api";

/* ─── Theme definitions ──────────────────────────────────────────────────── */
const THEMES = {
  light: {
    bg1:"#ffffff", bg2:"#f8f9fa", bg3:"#f1f3f5",
    t1:"#111827",  t2:"#6b7280",  t3:"#9ca3af",
    bd:"#e5e7eb",  err:"#dc2626", ok:"#16a34a",
    ipt:"#ffffff", iptBd:"#d1d5db",
    btn:"#f3f4f6", btnBd:"#e5e7eb", btnT:"#374151",
  },
  dark: {
    bg1:"#1c1c1e", bg2:"#252527", bg3:"#2c2c2e",
    t1:"#f5f5f7",  t2:"#a0a0a5",  t3:"#68686e",
    bd:"#3a3a3c",  err:"#ff453a", ok:"#32d74b",
    ipt:"#2c2c2e", iptBd:"#3a3a3c",
    btn:"#2c2c2e", btnBd:"#3a3a3c", btnT:"#e5e5e7",
  },
  navy: {
    bg1:"#0c1929", bg2:"#112236", bg3:"#163050",
    t1:"#dce8f5",  t2:"#7a95b8",  t3:"#4a6585",
    bd:"#1e3355",  err:"#ff6b6b", ok:"#4ade80",
    ipt:"#0c1929", iptBd:"#1e3355",
    btn:"#112236", btnBd:"#1e3355", btnT:"#dce8f5",
  },
};

const ThemeCtx = createContext({ tv: THEMES.light, isDark: false, topLevelSteps: [], allSops: [] });
const useTV    = () => useContext(ThemeCtx);

/* ─── Accent colours ─────────────────────────────────────────────────────── */
const CAT_COLS = ["c-blue","c-teal","c-purple","c-coral","c-amber","c-green","c-pink"];
const SOP_CL = {
  "c-blue":   {bg:"#EEF5FD",br:"#185FA5",tx:"#0C447C",dot:"#378ADD"},
  "c-teal":   {bg:"#E8F7F0",br:"#0F6E56",tx:"#085041",dot:"#1D9E75"},
  "c-purple": {bg:"#F0EFFE",br:"#534AB7",tx:"#3C3489",dot:"#7F77DD"},
  "c-coral":  {bg:"#FDF0EC",br:"#993C1D",tx:"#712B13",dot:"#D85A30"},
  "c-amber":  {bg:"#FEF5E5",br:"#854F0B",tx:"#633806",dot:"#BA7517"},
  "c-green":  {bg:"#EDF7E2",br:"#3B6D11",tx:"#27500A",dot:"#639922"},
  "c-pink":   {bg:"#FDF0F5",br:"#993556",tx:"#72243E",dot:"#D4537E"},
};
const SOP_CD = {
  "c-blue":   {bg:"rgba(10,31,51,.05)",  br:"#4A9FD5",tx:"#93C5FD",dot:"#4A9FD5"},
  "c-teal":   {bg:"rgba(0,40,24,.05)",   br:"#2DBF8A",tx:"#6EE7B7",dot:"#2DBF8A"},
  "c-purple": {bg:"rgba(20,16,60,.05)",  br:"#8B80E8",tx:"#C4B5FD",dot:"#8B80E8"},
  "c-coral":  {bg:"rgba(44,15,7,.05)",   br:"#E8724D",tx:"#FCA5A5",dot:"#E8724D"},
  "c-amber":  {bg:"rgba(30,16,5,.05)",   br:"#D97706",tx:"#FCD34D",dot:"#D97706"},
  "c-green":  {bg:"rgba(6,22,6,.05)",    br:"#4CAF50",tx:"#86EFAC",dot:"#4CAF50"},
  "c-pink":   {bg:"rgba(37,10,20,.05)",  br:"#E07598",tx:"#FBCFE8",dot:"#E07598"},
};
const getSopC  = (k, d) => d ? SOP_CD[k] : SOP_CL[k];

const OPT_CL = [
  {bg:"#F0FAF5",br:"#0F6E56",tx:"#085041",num:"#1D9E75"},
  {bg:"#FEF2F2",br:"#A32D2D",tx:"#791F1F",num:"#E24B4A"},
  {bg:"#FFFBEB",br:"#854F0B",tx:"#633806",num:"#BA7517"},
  {bg:"#EEF5FD",br:"#185FA5",tx:"#0C447C",num:"#378ADD"},
  {bg:"#F0EFFE",br:"#534AB7",tx:"#3C3489",num:"#7F77DD"},
  {bg:"#FDF0F5",br:"#993556",tx:"#72243E",num:"#D4537E"},
];
const OPT_CD = [
  {bg:"rgba(0,40,24,.05)",   br:"#2DBF8A",tx:"#6EE7B7",num:"#1D9E75"},
  {bg:"rgba(26,5,5,.05)",    br:"#CF4C4C",tx:"#FCA5A5",num:"#E24B4A"},
  {bg:"rgba(30,16,5,.05)",   br:"#D97706",tx:"#FCD34D",num:"#BA7517"},
  {bg:"rgba(10,31,51,.05)",  br:"#4A9FD5",tx:"#93C5FD",num:"#4A9FD5"},
  {bg:"rgba(20,16,60,.05)",  br:"#8B80E8",tx:"#C4B5FD",num:"#8B80E8"},
  {bg:"rgba(37,10,20,.05)",  br:"#E07598",tx:"#FBCFE8",num:"#E07598"},
];
const getOptC  = (i, d) => d ? OPT_CD[i%6] : OPT_CL[i%6];

const HDL_CL = {
  "INBOX & TRIAGE SPECIALIST": {bg:"#EEEDFE",br:"#534AB7",tx:"#3C3489"},
  "RESOLUTION SPECIALIST":     {bg:"#E1F5EE",br:"#0F6E56",tx:"#085041"},
};
const HDL_CD = {
  "INBOX & TRIAGE SPECIALIST": {bg:"rgba(20,16,60,.1)", br:"#8B80E8",tx:"#C4B5FD"},
  "RESOLUTION SPECIALIST":     {bg:"rgba(0,40,24,.1)",  br:"#2DBF8A",tx:"#6EE7B7"},
};
const getHdlC  = (h, d) => d ? HDL_CD[h] : HDL_CL[h];

const HANDLERS = ["INBOX & TRIAGE SPECIALIST","RESOLUTION SPECIALIST"];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const uid    = () => Math.random().toString(36).slice(2,9);
const mkStep = () => ({id:uid(),title:"",detail:"",important:false,handler:"",options:[]});
const mkOpt  = () => ({id:uid(),label:"",note:"",handler:"",endsFlow:false,steps:[],mergeToStepId:null,linkedSopId:null});
const pA = (a,id,p) => a.map(x => x.id===id?{...x,...p}:x);
const rA = (a,id)   => a.filter(x => x.id!==id);
const mA = (a,id,d) => {
  const i=a.findIndex(x=>x.id===id),j=i+d;
  if(j<0||j>=a.length)return a;
  const b=[...a];[b[i],b[j]]=[b[j],b[i]];return b;
};
const parseSteps = (json) => {
  try { const r=JSON.parse(json||"[]"); return Array.isArray(r)?r:[]; }
  catch { return []; }
};
const advStack = (s, topSteps=[]) => {
  if(!s.length) return {s:[],e:true,n:"All steps completed."};
  const t=s[s.length-1],ni=t.index+1;
  if(ni<t.steps.length) return {s:[...s.slice(0,-1),{...t,index:ni}],e:false,n:""};
  if(t.mergeToStepId && topSteps.length){
    const idx=topSteps.findIndex(x=>x.id===t.mergeToStepId);
    if(idx>=0) return {s:[{steps:topSteps,index:idx,optionLabel:null,endsFlow:true,endNote:"All steps completed.",mergeToStepId:null}],e:false,n:""};
  }
  if(t.endsFlow) return {s:s.slice(0,-1),e:true,n:t.endNote||"Branch ended."};
  return advStack(s.slice(0,-1),topSteps);
};

/* ─── Font (loaded once) ─────────────────────────────────────────────────── */
(function(){
  if(document.getElementById("sop-font")) return;
  const l=document.createElement("link");
  l.id="sop-font"; l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Raleway:wght@200;300;400;500;600&display=swap";
  document.head.appendChild(l);
})();

/* ─── Theme CSS injection (colours only) ────────────────────────────────── */
function injectStyles(tv) {
  let el=document.getElementById("sop-theme-css");
  if(!el){el=document.createElement("style");el.id="sop-theme-css";document.head.appendChild(el);}
  el.textContent=`
    .sop-root *,.sop-root *::before,.sop-root *::after{box-sizing:border-box;}
    .sop-root input,.sop-root textarea,.sop-root select{
      background:${tv.ipt}!important;border:1px solid ${tv.iptBd}!important;
      color:${tv.t1}!important;border-radius:5px;padding:5px 8px;
      font-size:12px;font-family:inherit;outline:none;width:100%;
    }
    .sop-root input::placeholder,.sop-root textarea::placeholder{color:${tv.t3};}
    .sop-root input:focus,.sop-root textarea:focus,.sop-root select:focus{
      border-color:#378ADD!important;box-shadow:0 0 0 2px rgba(55,138,221,.15);
    }
    .sop-root button{
      background:${tv.btn};border:1px solid ${tv.btnBd};color:${tv.btnT};
      border-radius:5px;padding:5px 10px;cursor:pointer;
      font-size:12px;font-family:inherit;
      display:inline-flex;align-items:center;gap:4px;transition:opacity .15s;
    }
    .sop-root button:hover{opacity:.75;}
    .sop-root .sb::-webkit-scrollbar{width:4px;}
    .sop-root .sb::-webkit-scrollbar-track{background:transparent;}
    .sop-root .sb::-webkit-scrollbar-thumb{background:${tv.bd};border-radius:4px;}
  `;
}

/* ─── HandlerBadge ───────────────────────────────────────────────────────── */
function HandlerBadge({handler}) {
  const {isDark}=useTV();
  if(!handler) return null;
  const c=getHdlC(handler,isDark);
  return (
    <span style={{fontSize:9,padding:"2px 7px",background:c.bg,color:c.tx,
      border:`0.5px solid ${c.br}`,borderRadius:4,fontWeight:600,whiteSpace:"nowrap",letterSpacing:"0.03em"}}>
      {handler}
    </span>
  );
}

/* ─── OptionBranch ───────────────────────────────────────────────────────── */
function OptionBranch({opt,oi,mode,onUpdate,onDelete}) {
  const _ctx=useTV(), tv=_ctx.tv, isDark=_ctx.isDark, topLevelSteps=_ctx.topLevelSteps||[], allSops=_ctx.allSops||[];
  const oc=getOptC(oi,isDark);
  const [open,setOpen]      = useState((opt.steps?.length||0)>0);
  const [editing,setEditing]= useState(!opt.label);
  const [draft,setDraft]    = useState({
    label:opt.label, note:opt.note, handler:opt.handler||"",
    endsFlow:opt.endsFlow, mergeToStepId:opt.mergeToStepId||null,
    linkedSopId:opt.linkedSopId||null,
  });
  useEffect(()=>{if(mode==="edit")setOpen(true);},[mode]);
  const set=(k,v)=>setDraft(d=>({...d,[k]:v}));
  const startEdit=()=>{
    setDraft({label:opt.label,note:opt.note,handler:opt.handler||"",
      endsFlow:opt.endsFlow,mergeToStepId:opt.mergeToStepId||null,
      linkedSopId:opt.linkedSopId||null});
    setEditing(true);
  };
  const saveEdit=()=>{onUpdate(draft);setEditing(false);};
  const setSubSteps=s=>onUpdate({steps:s});
  const sub=opt.steps?.length||0;
  const mergeIdx  = opt.mergeToStepId ? topLevelSteps.findIndex(s=>s.id===opt.mergeToStepId) : -1;
  const linkedSop = opt.linkedSopId   ? allSops.find(s=>s.id===opt.linkedSopId) : null;
  return (
    <div style={{display:"flex",marginBottom:10}}>
      <div style={{width:3,minWidth:3,background:oc.br,borderRadius:2,marginTop:4,marginRight:10,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:22,height:22,minWidth:22,borderRadius:"50%",background:oc.num,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>{oi+1}</span>
          {editing
            ?<input autoFocus value={draft.label} onChange={e=>set("label",e.target.value)} placeholder={`Option ${oi+1} — e.g. "Yes, she agreed"`} style={{flex:1,fontWeight:600,fontSize:12}}/>
            :<span style={{flex:1,fontSize:12,fontWeight:600,color:tv.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
               {opt.label||<em style={{opacity:.4,fontStyle:"normal"}}>Unnamed option</em>}
             </span>
          }
          {!editing&&<HandlerBadge handler={opt.handler}/>}
          {!editing&&!sub&&opt.endsFlow&&!linkedSop&&<span style={{fontSize:10,color:tv.t3,fontStyle:"italic",flexShrink:0}}>ends flow</span>}
          {!editing&&mergeIdx>=0&&<span style={{fontSize:10,padding:"1px 6px",background:tv.bg2,color:tv.t2,borderRadius:4,border:`1px solid ${tv.bd}`,flexShrink:0}}>↳ Step {mergeIdx+1}</span>}
          {!editing&&sub>0&&(
            <button onClick={()=>setOpen(v=>!v)} style={{fontSize:10,padding:"2px 8px",background:oc.bg,border:`1px solid ${oc.br}`,color:oc.tx,flexShrink:0}}>
              <i className={`ti ${open?"ti-chevron-up":"ti-chevron-down"}`} aria-hidden="true"/> {sub} step{sub>1?"s":""}
            </button>
          )}
          {mode==="edit"&&(
            <div style={{display:"flex",gap:1,flexShrink:0}}>
              <i className={`ti ${editing?"ti-check":"ti-edit"}`} onClick={editing?saveEdit:startEdit}
                style={{fontSize:13,color:editing?tv.ok:tv.t3,cursor:"pointer",padding:3}} aria-hidden="true"/>
              <i className="ti ti-trash" onClick={onDelete}
                style={{fontSize:13,color:tv.err,cursor:"pointer",padding:3}} aria-hidden="true"/>
            </div>
          )}
        </div>
        {!editing&&opt.note&&<p style={{fontSize:11,color:tv.t2,margin:"3px 0 4px 28px",lineHeight:1.55}}>{opt.note}</p>}
        {/* SOP link badge — view mode */}
        {!editing&&linkedSop&&(
          <div style={{margin:"5px 0 3px 28px"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:600,
              padding:"5px 12px",borderRadius:5,
              background:"#EFF6FF",border:"1.5px solid #3B82F6",color:"#1D4ED8"}}>
              <i className="ti ti-arrow-right-circle" style={{fontSize:13}} aria-hidden="true"/>
              Follow: {linkedSop.title}
              <i className="ti ti-external-link" style={{fontSize:10,opacity:.7}} aria-hidden="true"/>
            </span>
          </div>
        )}
        {editing&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,paddingLeft:28}}>
            <textarea value={draft.note} onChange={e=>set("note",e.target.value)} placeholder="Agent instruction (optional)" rows={2} style={{resize:"vertical"}}/>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <select value={draft.handler} onChange={e=>set("handler",e.target.value)} style={{flex:1}}>
                <option value="">— No handler —</option>
                {HANDLERS.map(h=><option key={h} value={h}>{h}</option>)}
              </select>
              <label style={{fontSize:11,color:tv.t2,display:"flex",alignItems:"center",gap:4,cursor:"pointer",whiteSpace:"nowrap"}}>
                <input type="checkbox" checked={draft.endsFlow} onChange={e=>set("endsFlow",e.target.checked)} style={{width:"auto"}}/>
                End flow
              </label>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <label style={{fontSize:11,color:tv.t2,whiteSpace:"nowrap",minWidth:80}}>↳ Merge to:</label>
              <select value={draft.mergeToStepId||""} onChange={e=>set("mergeToStepId",e.target.value||null)} style={{flex:1}}>
                <option value="">— No merge point —</option>
                {(topLevelSteps||[]).map((s,i)=><option key={s.id} value={s.id}>Step {i+1}: {s.title||"Untitled"}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",background:"#EFF6FF",borderRadius:5,border:"1px solid #BFDBFE"}}>
              <i className="ti ti-arrow-right-circle" style={{fontSize:14,color:"#3B82F6",flexShrink:0}} aria-hidden="true"/>
              <label style={{fontSize:11,color:"#1D4ED8",fontWeight:600,whiteSpace:"nowrap"}}>→ Follow SOP:</label>
              <select value={draft.linkedSopId||""} onChange={e=>set("linkedSopId",e.target.value||null)} style={{flex:1}}>
                <option value="">— No SOP link —</option>
                {(allSops||[]).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
        )}
        {mode==="edit"&&!editing&&(
          <button onClick={()=>setOpen(v=>!v)} style={{fontSize:10,marginTop:4,marginLeft:24,background:oc.bg,border:`1px solid ${oc.br}`,color:oc.tx}}>
            <i className={`ti ${open?"ti-chevron-up":"ti-chevron-down"}`} aria-hidden="true"/>
            {" "}{open?`Hide steps (${sub})`:sub>0?`Show steps (${sub})`:"Add steps to this branch"}
          </button>
        )}
        {open&&(
          <div style={{marginTop:6,paddingLeft:8,borderLeft:`2px solid ${oc.br}`}}>
            <StepsList steps={opt.steps||[]} setSteps={setSubSteps} col={oc} mode={mode}/>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── StepBlock ──────────────────────────────────────────────────────────── */
function StepBlock({step,idx,col,mode,onUpdate,onDelete,onUp,onDown}) {
  const {tv,isDark}=useTV();
  const [isEditing,setIsEditing]=useState(!step.title);
  const [draft,setDraft]=useState({title:step.title,detail:step.detail,important:!!step.important,handler:step.handler||""});
  const set=(k,v)=>setDraft(d=>({...d,[k]:v}));
  const startEdit=()=>{setDraft({title:step.title,detail:step.detail,important:!!step.important,handler:step.handler||""});setIsEditing(true);};
  const saveEdit =()=>{onUpdate(draft);setIsEditing(false);};
  const opts=Array.isArray(step.options)?step.options:[];
  const hc=step.handler?getHdlC(step.handler,isDark):null;
  const stepBg=isDark?`${col.br}12`:col.bg;
  return (
    <div style={{marginBottom:12}}>
      <div style={{border:`1px solid ${isEditing?col.br:tv.bd}`,borderRadius:6,background:tv.bg1,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px 16px 14px"}}>
          <div style={{width:30,height:30,minWidth:30,borderRadius:"50%",background:stepBg,border:`1.5px solid ${col.br}`,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2,flexShrink:0,fontSize:12,fontWeight:700,color:col.br}}>
            {idx+1}
          </div>
          <div style={{flex:1,minWidth:0}}>
            {isEditing?(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input autoFocus value={draft.title} onChange={e=>set("title",e.target.value)} placeholder="Step title" style={{fontWeight:600,fontSize:13}}/>
                <textarea value={draft.detail} onChange={e=>set("detail",e.target.value)} placeholder="Instructions for the agent…" rows={2} style={{resize:"vertical"}}/>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <select value={draft.handler} onChange={e=>set("handler",e.target.value)} style={{flex:1}}>
                    <option value="">— No handler —</option>
                    {HANDLERS.map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                  <label style={{fontSize:11,color:tv.t2,display:"flex",alignItems:"center",gap:5,cursor:"pointer",whiteSpace:"nowrap"}}>
                    <input type="checkbox" checked={draft.important} onChange={e=>set("important",e.target.checked)} style={{width:"auto"}}/>
                    Important
                  </label>
                </div>
              </div>
            ):(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,color:tv.t3,fontWeight:500}}>#{idx+1}</span>
                  <span style={{fontSize:13,fontWeight:600,color:tv.t1}}>{step.title||<em style={{opacity:.4,fontStyle:"normal"}}>Untitled step</em>}</span>
                  {step.important&&<span style={{fontSize:10,padding:"1px 6px",background:"#FAEEDA",color:"#633806",borderRadius:4,border:"0.5px solid #BA7517"}}>Important</span>}
                  {opts.length>0&&<span style={{fontSize:10,padding:"1px 6px",background:stepBg,color:col.br,borderRadius:4,border:`0.5px solid ${col.br}`}}>{opts.length} branch{opts.length>1?"es":""}</span>}
                </div>
                {step.detail&&<p style={{fontSize:12,color:tv.t2,margin:"0 0 5px",lineHeight:1.6}}>{step.detail}</p>}
                {hc&&<HandlerBadge handler={step.handler}/>}
              </div>
            )}
          </div>
          {mode==="edit"&&(
            <div style={{display:"flex",gap:1,flexShrink:0}}>
              <i className="ti ti-chevron-up"   onClick={onUp}   style={{fontSize:13,color:tv.t3,cursor:"pointer",padding:3}} aria-hidden="true"/>
              <i className="ti ti-chevron-down" onClick={onDown} style={{fontSize:13,color:tv.t3,cursor:"pointer",padding:3}} aria-hidden="true"/>
              <i className={`ti ${isEditing?"ti-check":"ti-edit"}`} onClick={isEditing?saveEdit:startEdit}
                style={{fontSize:13,color:isEditing?tv.ok:tv.t2,cursor:"pointer",padding:3}} aria-hidden="true"/>
              <i className="ti ti-trash" onClick={onDelete} style={{fontSize:13,color:tv.err,cursor:"pointer",padding:3}} aria-hidden="true"/>
            </div>
          )}
        </div>
        {(mode==="edit"||opts.length>0)&&(
          <div style={{borderTop:`1px solid ${tv.bd}`,padding:"14px 16px 18px",background:tv.bg2}}>
            {opts.length>0&&(
              <div style={{marginBottom:mode==="edit"&&opts.length<3?8:0}}>
                {opts.map((opt,oi)=>(
                  <OptionBranch key={opt.id} opt={opt} oi={oi} mode={mode}
                    onUpdate={p=>onUpdate({options:pA(opts,opt.id,p)})}
                    onDelete={()=>onUpdate({options:rA(opts,opt.id)})}
                  />
                ))}
              </div>
            )}
            {mode==="edit"&&opts.length<3&&(
              <button onClick={()=>onUpdate({options:[...opts,mkOpt()]})} style={{width:"100%",borderStyle:"dashed",padding:"7px 10px"}}>
                <i className="ti ti-plus" aria-hidden="true"/>
                {opts.length===0?" Add branch option":` Add branch option  (${opts.length} / 3)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── StepsList ──────────────────────────────────────────────────────────── */
function StepsList({steps,setSteps,col,mode}) {
  const s=Array.isArray(steps)?steps:[];
  return (
    <div>
      {s.map((step,i)=>(
        <StepBlock key={step.id} step={step} idx={i} col={col} mode={mode}
          onUpdate={p  =>setSteps(pA(s,step.id,p))}
          onDelete={()=>setSteps(rA(s,step.id))}
          onUp={()    =>setSteps(mA(s,step.id,-1))}
          onDown={()  =>setSteps(mA(s,step.id, 1))}
        />
      ))}
      {mode==="edit"&&(
        <button onClick={()=>setSteps([...s,mkStep()])} style={{width:"100%",borderStyle:"dashed",marginTop:s.length?6:0,padding:"7px 10px"}}>
          <i className="ti ti-plus" aria-hidden="true"/> Add step
        </button>
      )}
    </div>
  );
}

/* ─── ThemePicker ────────────────────────────────────────────────────────── */
function ThemePicker({theme,setTheme}) {
  const {tv}=useTV();
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const options=[
    {id:"light",label:"Light",    icon:"ti-sun"},
    {id:"dark", label:"Dark",     icon:"ti-moon"},
    {id:"system",label:"System",  icon:"ti-device-laptop"},
    {id:"navy", label:"Navy Blue",icon:"ti-droplet-filled"},
  ];
  const cur=options.find(o=>o.id===theme);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(v=>!v)} title="Change theme" style={{padding:"4px 8px",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
        <i className={`ti ${cur?.icon||"ti-sun"}`} style={{fontSize:13}} aria-hidden="true"/>
        <i className="ti ti-chevron-down" style={{fontSize:10,opacity:.6}} aria-hidden="true"/>
      </button>
      {open&&(
        <div style={{position:"absolute",right:0,top:"calc(100% + 4px)",zIndex:50,background:tv.bg1,border:`1px solid ${tv.bd}`,borderRadius:6,padding:4,minWidth:130,boxShadow:"0 4px 16px rgba(0,0,0,.15)"}}>
          {options.map(opt=>(
            <div key={opt.id} onClick={()=>{setTheme(opt.id);setOpen(false);}}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:4,cursor:"pointer",fontSize:12,color:tv.t1,background:theme===opt.id?tv.bg2:"transparent",fontWeight:theme===opt.id?600:400}}>
              <i className={`ti ${opt.icon}`} style={{fontSize:13,color:tv.t2}} aria-hidden="true"/>
              {opt.label}
              {theme===opt.id&&<i className="ti ti-check" style={{fontSize:11,color:tv.ok,marginLeft:"auto"}} aria-hidden="true"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SOPTool ────────────────────────────────────────────────────────────── */
export default function SOPTool() {
  /* UI state */
  const [selId,        setSelId]        = useState(null);
  const [mode,         setMode]         = useState("view");
  const [search,       setSearch]       = useState("");
  const [newSopOpen,   setNewSopOpen]   = useState(false);
  const [newSop,       setNewSop]       = useState({title:"",description:""});
  const [delConfirm,   setDelConfirm]   = useState(null);
  const [hoveredSopId, setHoveredSopId] = useState(null);
  const [exporting,    setExporting]    = useState(false);
  const [copied,       setCopied]       = useState(false);
  /* Theme — persisted in localStorage */
  const [theme, setTheme] = useState(()=>localStorage.getItem("sop-theme")||"light");
  useEffect(()=>{ localStorage.setItem("sop-theme",theme); },[theme]);
  /* Follow mode */
  const [stack,   setStack]   = useState([]);
  const [ended,   setEnded]   = useState(false);
  const [endNote, setEndNote] = useState("");
  const [hist,    setHist]    = useState([]);

  /* System dark mode */
  const [sysDark,setSysDark]=useState(()=>window.matchMedia?.("(prefers-color-scheme:dark)").matches??false);
  useEffect(()=>{
    const mq=window.matchMedia?.("(prefers-color-scheme:dark)");
    if(!mq)return;
    const h=e=>setSysDark(e.matches);
    mq.addEventListener("change",h); return()=>mq.removeEventListener("change",h);
  },[]);
  const effectiveTheme = theme==="system"?(sysDark?"dark":"light"):theme;
  const tv    = THEMES[effectiveTheme];
  const isDark = effectiveTheme==="dark"||effectiveTheme==="navy";
  useEffect(()=>{ injectStyles(tv); },[tv]);

  /* ── Convex real-time data ── */
  const rawSops   = useQuery(api.sops.list);
  const loading   = rawSops === undefined;
  const sops      = (rawSops ?? [])
    .sort((a,b) => a.sortOrder - b.sortOrder)
    .map(s => ({ ...s, id: s._id, steps: parseSteps(s.stepsJson) }));

  const _createMut = useMutation(api.sops.create);
  const _updateMut = useMutation(api.sops.update);
  const _removeMut = useMutation(api.sops.remove);

  /* Auto-select from URL hash, or first SOP */
  useEffect(()=>{
    if(!sops.length) return;
    const m=window.location.hash.match(/^#\/sop\/(.+)$/);
    if(m){ const f=sops.find(s=>s.id===m[1]); if(f){setSelId(f.id);return;} }
    if(!selId) setSelId(sops[0].id);
  },[sops.length]);
  const selectSop=(id)=>{ setSelId(id); setMode("view"); window.history.pushState(null,"",`#/sop/${id}`); };

  /* Derived */
  const sel      = sops.find(s=>s.id===selId);
  const col      = sel ? getSopC(sel.color,isDark) : getSopC("c-blue",isDark);
  const filtered = sops.filter(s=>s.title.toLowerCase().includes(search.toLowerCase()));

  /* ── CRUD ── */
  const createSop = async () => {
    if(!newSop.title.trim()) return;
    const autoColor = CAT_COLS[sops.length % CAT_COLS.length];
    const newId = await _createMut({
      title:       newSop.title,
      description: newSop.description || "",
      color:       autoColor,
      stepsJson:   "[]",
      sortOrder:   Date.now(),
    });
    setSelId(newId);
    setNewSopOpen(false);
    setNewSop({title:"",description:""});
    setMode("edit");
  };

  const updateSop = (id, patch) => {
    const p = {};
    if(patch.title       !== undefined) p.title       = patch.title;
    if(patch.description !== undefined) p.description = patch.description;
    if(patch.color       !== undefined) p.color       = patch.color;
    if(patch.steps       !== undefined) p.stepsJson   = JSON.stringify(patch.steps);
    _updateMut({id, ...p});
  };

  const setSopSteps = (steps) => _updateMut({id: selId, stepsJson: JSON.stringify(steps)});

  const deleteSop = (id) => {
    _removeMut({id});
    const remaining = sops.filter(s=>s.id!==id);
    setSelId(remaining.length ? remaining[0].id : null);
    setDelConfirm(null);
    setMode("view");
  };

  /* ── Follow mode ── */
  const startFollow = () => {
    if(!sel?.steps?.length) return;
    setStack([{steps:sel.steps,index:0,optionLabel:null,endsFlow:true,endNote:"All steps completed."}]);
    setEnded(false); setEndNote(""); setHist([]); setMode("follow");
  };
  const curFrame = stack.length?stack[stack.length-1]:null;
  const curStep  = !ended&&curFrame?curFrame.steps[curFrame.index]:null;
  const saveH    = ()=>setHist(h=>[...h,{stack,ended,endNote,prevSelId:selId}]);
  const chooseOpt = opt=>{
    saveH();
    const topSteps=sel?.steps||[];
    if(opt.steps?.length>0){
      setStack(s=>[...s,{steps:opt.steps,index:0,optionLabel:opt.label,
        endsFlow:opt.endsFlow&&!opt.mergeToStepId,
        endNote:opt.note||"Branch ended.",
        mergeToStepId:opt.mergeToStepId||null}]);
      setEnded(false); setEndNote("");
    } else if(opt.linkedSopId){
      const target=sops.find(s=>s.id===opt.linkedSopId);
      if(target?.steps?.length){
        saveH();
        setSelId(target.id); window.history.pushState(null,"",`#/sop/${target.id}`);
        setStack([{steps:target.steps,index:0,optionLabel:null,endsFlow:true,endNote:"All steps completed.",mergeToStepId:null}]);
        setEnded(false); setEndNote("");
      }
    } else if(opt.mergeToStepId){
      const idx=topSteps.findIndex(s=>s.id===opt.mergeToStepId);
      if(idx>=0){
        setStack([{steps:topSteps,index:idx,optionLabel:null,endsFlow:true,endNote:"All steps completed.",mergeToStepId:null}]);
        setEnded(false); setEndNote("");
      } else { const r=advStack(stack,topSteps); setStack(r.s); setEnded(r.e); setEndNote(r.n); }
    } else if(opt.endsFlow){
      setEnded(true); setEndNote(opt.note||"This branch has ended.");
    } else {
      const r=advStack(stack,topSteps); setStack(r.s); setEnded(r.e); setEndNote(r.n);
    }
  };
  const goNext=()=>{saveH();const r=advStack(stack,sel?.steps||[]);setStack(r.s);setEnded(r.e);setEndNote(r.n);};
  const goBack=()=>{
    if(!hist.length)return;
    const p=hist[hist.length-1];
    setStack(p.stack);setEnded(p.ended);setEndNote(p.endNote);
    if(p.prevSelId&&p.prevSelId!==selId){setSelId(p.prevSelId);window.history.pushState(null,"",`#/sop/${p.prevSelId}`);}
    setHist(h=>h.slice(0,-1));
  };
  const breadcrumb=stack.filter(f=>f.optionLabel).map(f=>f.optionLabel);

  if(loading) return (
    <div style={{height:660,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,fontFamily:"'Raleway',sans-serif",color:THEMES.light.t2}}>
      <i className="ti ti-loader-2" style={{fontSize:28,animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <span style={{fontSize:13,letterSpacing:"0.08em"}}>Loading…</span>
    </div>
  );

  const rootVars={"--t-bg1":tv.bg1,"--t-bg2":tv.bg2,"--t-t1":tv.t1,"--t-t2":tv.t2,"--t-t3":tv.t3,"--t-bd":tv.bd,"--t-err":tv.err,"--t-ok":tv.ok};

  return (
    <ThemeCtx.Provider value={{tv,isDark}}>
      <div className="sop-root" style={{...rootVars,display:"flex",height:660,border:`1px solid ${tv.bd}`,borderRadius:8,overflow:"hidden",background:tv.bg1,position:"relative",fontFamily:"'Raleway','Gill Sans','Optima',sans-serif"}}>

        {/* ═══ SIDEBAR ═══ */}
        <div style={{width:225,borderRight:`1px solid ${tv.bd}`,display:"flex",flexDirection:"column",background:tv.bg2,flexShrink:0}}>
          <div style={{padding:"16px 14px 12px",borderBottom:`1px solid ${tv.bd}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"'Raleway','Gill Sans MT',sans-serif",fontWeight:200,fontSize:15,letterSpacing:"0.22em",color:tv.t1,textTransform:"uppercase"}}>
                Hello Macy
              </span>
              <ThemePicker theme={theme} setTheme={setTheme}/>
            </div>
            <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",fontSize:12,padding:"5px 8px"}}/>
          </div>

          <div className="sb" style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
            {!filtered.length&&<p style={{fontSize:12,color:tv.t3,padding:"8px 4px"}}>No SOPs found.</p>}
            {filtered.map(s=>{
              const c=getSopC(s.color,isDark),isSel=s.id===selId,isHov=hoveredSopId===s.id;
              return (
                <div key={s.id}
                  onClick={()=>selectSop(s.id)}
                  onMouseEnter={()=>setHoveredSopId(s.id)}
                  onMouseLeave={()=>setHoveredSopId(null)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:2,borderRadius:6,cursor:"pointer",position:"relative",background:isSel?`${c.br}15`:"transparent",border:isSel?`1px solid ${c.br}30`:"1px solid transparent"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.dot,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:isSel?600:400,color:tv.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>
                    <div style={{fontSize:11,color:tv.t3}}>{s.steps?.length||0} step{(s.steps?.length||0)!==1?"s":""}</div>
                  </div>
                  {isHov&&(
                    <button onClick={e=>{e.stopPropagation();setDelConfirm(s.id);}} title="Delete SOP"
                      style={{flexShrink:0,padding:"3px 5px",background:"transparent",border:`1px solid ${tv.err}50`,borderRadius:4,color:tv.err,fontSize:11,lineHeight:1}}>
                      <i className="ti ti-trash" style={{fontSize:12}} aria-hidden="true"/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{padding:"8px",borderTop:`1px solid ${tv.bd}`}}>
            <button onClick={()=>setNewSopOpen(true)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <i className="ti ti-plus" aria-hidden="true"/> New SOP
            </button>
          </div>
        </div>

        {/* ═══ MAIN ═══ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!sel&&!newSopOpen&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:tv.t3}}>
              <i className="ti ti-sitemap" style={{fontSize:40}} aria-hidden="true"/>
              <p style={{fontSize:14,margin:0,color:tv.t2}}>Select an SOP or create a new one.</p>
              <button onClick={()=>setNewSopOpen(true)}><i className="ti ti-plus" aria-hidden="true"/> New SOP</button>
            </div>
          )}

          {newSopOpen&&(
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <h2 style={{fontSize:15,fontWeight:300,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 24px",color:tv.t1}}>Create New SOP</h2>
              <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:480}}>
                <div>
                  <label style={{fontSize:11,color:tv.t3,display:"block",marginBottom:5,letterSpacing:"0.06em",textTransform:"uppercase"}}>Title</label>
                  <input value={newSop.title} onChange={e=>setNewSop(p=>({...p,title:e.target.value}))} placeholder="e.g. Password Reset" style={{width:"100%"}}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:tv.t3,display:"block",marginBottom:5,letterSpacing:"0.06em",textTransform:"uppercase"}}>Description</label>
                  <textarea value={newSop.description} onChange={e=>setNewSop(p=>({...p,description:e.target.value}))} placeholder="When is this SOP used?" rows={2} style={{resize:"vertical"}}/>
                </div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={createSop} style={{flex:1,fontWeight:500}}>Create SOP</button>
                  <button onClick={()=>{setNewSopOpen(false);setNewSop({title:"",description:""});}}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Follow mode */}
          {sel&&mode==="follow"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${tv.bd}`,display:"flex",alignItems:"center",gap:10,background:`${col.br}10`}}>
                <button onClick={()=>{setMode("view");setHist([]);}}><i className="ti ti-x" aria-hidden="true"/> Exit</button>
                <span style={{fontSize:13,fontWeight:500,color:col.br,flex:1,letterSpacing:"0.03em"}}>Following: {sel.title}</span>
                {hist.length>0&&<button onClick={goBack} style={{background:`${col.br}15`,border:`1px solid ${col.br}40`,color:col.br}}><i className="ti ti-arrow-left" aria-hidden="true"/> Back</button>}
              </div>
              <div className="sb" style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
                {breadcrumb.length>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:14,flexWrap:"wrap",padding:"6px 10px",background:tv.bg2,borderRadius:6}}>
                    <i className="ti ti-git-branch" style={{fontSize:13,color:tv.t3}} aria-hidden="true"/>
                    {breadcrumb.map((lb,i)=>(
                      <span key={i} style={{fontSize:11,color:tv.t2,display:"flex",alignItems:"center",gap:4}}>
                        <span style={{maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lb}</span>
                        {i<breadcrumb.length-1&&<i className="ti ti-chevron-right" style={{fontSize:10}} aria-hidden="true"/>}
                      </span>
                    ))}
                  </div>
                )}
                {ended?(
                  <div style={{textAlign:"center",padding:"32px 0"}}>
                    <div style={{width:52,height:52,borderRadius:"50%",background:`${col.br}15`,border:`1px solid ${col.br}40`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                      <i className="ti ti-check" style={{fontSize:24,color:col.br}} aria-hidden="true"/>
                    </div>
                    <p style={{fontSize:15,fontWeight:500,color:tv.t1,margin:"0 0 8px"}}>Flow ended</p>
                    <p style={{fontSize:13,color:tv.t2,margin:"0 0 20px",lineHeight:1.7,maxWidth:320,marginLeft:"auto",marginRight:"auto"}}>{endNote}</p>
                    <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                      {hist.length>0&&<button onClick={goBack}><i className="ti ti-arrow-left" aria-hidden="true"/> Back</button>}
                      <button onClick={()=>{setMode("view");setHist([]);}} style={{background:`${col.br}15`,border:`1px solid ${col.br}40`,color:col.br}}>Done</button>
                    </div>
                  </div>
                ):curStep?(
                  <>
                    <div style={{border:`1px solid ${col.br}40`,borderRadius:8,padding:"18px 20px",background:`${col.br}10`,marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:`${col.br}20`,border:`1px solid ${col.br}50`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:col.br}}>{(curFrame?.index||0)+1}</div>
                        <span style={{fontSize:10,color:col.br,fontWeight:600,background:`${col.br}15`,padding:"2px 8px",borderRadius:4,border:`0.5px solid ${col.br}40`}}>
                          Step {(curFrame?.index||0)+1} of {curFrame?.steps?.length||0}{curFrame?.optionLabel?` · ${curFrame.optionLabel}`:""}
                        </span>
                        {curStep.important&&<span style={{fontSize:10,padding:"2px 8px",background:"#FAEEDA",color:"#633806",borderRadius:4,border:"0.5px solid #BA7517"}}>Important</span>}
                        {curStep.handler&&<HandlerBadge handler={curStep.handler}/>}
                      </div>
                      <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 8px",color:tv.t1}}>{curStep.title}</h2>
                      <p style={{fontSize:13,color:tv.t2,margin:0,lineHeight:1.7}}>{curStep.detail||"No instructions for this step."}</p>
                    </div>
                    {curStep.options?.length>0?(
                      <div>
                        <p style={{fontSize:10,color:tv.t3,marginBottom:8,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>Customer response:</p>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {(curStep.options||[]).map((opt,oi)=>{
                            const oc=getOptC(oi,isDark);
                            const mergeI=opt.mergeToStepId?(sel?.steps||[]).findIndex(s=>s.id===opt.mergeToStepId):-1;
                            const _lsn=opt.linkedSopId?sops.find(s=>s.id===opt.linkedSopId)?.title:null;
                            const tag=_lsn?`→ Follow: ${_lsn}`:opt.mergeToStepId&&mergeI>=0?`↳ merges to Step ${mergeI+1}`:opt.steps?.length>0?`→ ${opt.steps.length} follow-up step${opt.steps.length>1?"s":""}`:opt.endsFlow?"→ ends flow":"→ continues";
                            return (
                              <button key={opt.id} onClick={()=>chooseOpt(opt)}
                                style={{textAlign:"left",padding:"10px 14px",background:oc.bg,border:`1px solid ${oc.br}40`,borderRadius:6,cursor:"pointer"}}>
                                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                  <span style={{width:18,height:18,minWidth:18,borderRadius:"50%",background:oc.num,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700,marginTop:1,flexShrink:0}}>{oi+1}</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:600,color:oc.tx}}>{opt.label||`Option ${oi+1}`}</div>
                                    {opt.note&&<div style={{fontSize:11,color:oc.tx,marginTop:2,opacity:.8,lineHeight:1.5}}>{opt.note}</div>}
                                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                                      <span style={{fontSize:10,color:oc.tx,opacity:.6}}>{tag}</span>
                                      {opt.handler&&<HandlerBadge handler={opt.handler}/>}
                                    </div>
                                  </div>
                                  <i className="ti ti-arrow-right" style={{fontSize:14,color:oc.tx,opacity:.4,marginTop:2,flexShrink:0}} aria-hidden="true"/>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ):(
                      <div style={{display:"flex",gap:8}}>
                        {hist.length>0&&<button onClick={goBack}><i className="ti ti-arrow-left" aria-hidden="true"/> Back</button>}
                        <button onClick={goNext} style={{flex:1,background:`${col.br}15`,border:`1px solid ${col.br}40`,color:col.br}}>
                          Next <i className="ti ti-arrow-right" aria-hidden="true"/>
                        </button>
                      </div>
                    )}
                  </>
                ):null}
              </div>
            </div>
          )}

          {/* View / Edit */}
          {sel&&mode!=="follow"&&!newSopOpen&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${tv.bd}`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:col.dot,flexShrink:0}}/>
                <span style={{fontSize:15,fontWeight:500,color:tv.t1,flex:1,letterSpacing:"0.02em"}}>{sel.title}</span>
                <div style={{display:"flex",gap:6}}>
                  {mode==="edit"
                    ?<button onClick={()=>setMode("view")} style={{fontSize:12}}><i className="ti ti-eye" aria-hidden="true"/> View</button>
                    :<button onClick={()=>setMode("edit")} style={{fontSize:12}}><i className="ti ti-edit" aria-hidden="true"/> Edit</button>
                  }
                  <button onClick={startFollow} style={{fontSize:12,background:`${col.br}15`,border:`1px solid ${col.br}40`,color:col.br}}>
                    <i className="ti ti-player-play" aria-hidden="true"/> Follow
                  </button>
                  <button
                    onClick={()=>{
                      const url=`${window.location.origin}${window.location.pathname}#/sop/${sel.id}`;
                      navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
                    }}
                    title="Copy direct link to this SOP"
                    style={{fontSize:12}}
                  >
                    <i className={`ti ${copied?"ti-check":"ti-link"}`} aria-hidden="true"/>
                    {copied?" Copied":" Link"}
                  </button>
                  <button
                    onClick={async()=>{
                      if(!sel||exporting) return;
                      setExporting(true);
                      try{ await generateSopPDF(sel); }catch(e){ console.error("PDF export failed",e); }
                      setExporting(false);
                    }}
                    disabled={exporting}
                    title="Export schematic as PDF"
                    style={{fontSize:12}}
                  >
                    <i className={`ti ${exporting?"ti-loader-2":"ti-file-export"}`} aria-hidden="true"/>
                    {exporting?" Exporting…":" PDF"}
                  </button>
                </div>
              </div>
              <div style={{padding:"7px 18px",borderBottom:`1px solid ${tv.bd}`,background:tv.bg2,display:"flex",alignItems:"center",gap:8}}>
                <input value={sel.description} onChange={e=>updateSop(sel.id,{description:e.target.value})}
                  placeholder="Add a description…" readOnly={mode!=="edit"}
                  style={{flex:1,border:"none",background:"transparent",outline:"none",color:tv.t2,cursor:mode==="edit"?"text":"default"}}/>
              </div>
              <div className="sb" style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
                {!sel.steps?.length&&mode!=="edit"&&(
                  <div style={{textAlign:"center",padding:"40px 0",color:tv.t3}}>
                    <i className="ti ti-sitemap" style={{fontSize:36}} aria-hidden="true"/>
                    <p style={{fontSize:13,marginTop:10,color:tv.t2}}>No steps yet. Click Edit to build your workflow.</p>
                  </div>
                )}
                <StepsList steps={sel.steps||[]} setSteps={setSopSteps} col={col} mode={mode}/>
              </div>
              <div style={{padding:"7px 18px",borderTop:`1px solid ${tv.bd}`,background:tv.bg2,display:"flex",gap:16}}>
                <span style={{fontSize:11,color:tv.t3}}>{sel.steps?.length||0} top-level steps</span>
                <span style={{fontSize:11,color:tv.t3}}>{(sel.steps||[]).filter(s=>s.options?.length>0).length} branching</span>
                <span style={{fontSize:11,color:tv.t3}}>{(sel.steps||[]).filter(s=>s.important).length} important</span>
              </div>
            </div>
          )}
        </div>

        {/* Delete confirm */}
        {delConfirm&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20}}>
            <div style={{background:tv.bg1,border:`1px solid ${tv.bd}`,borderRadius:8,padding:"22px 26px",maxWidth:290,width:"90%"}}>
              <p style={{fontSize:14,fontWeight:600,color:tv.t1,margin:"0 0 6px"}}>Delete this SOP?</p>
              <p style={{fontSize:12,color:tv.t2,margin:"0 0 16px"}}>All steps and branch data will be permanently removed.</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>deleteSop(delConfirm)} style={{flex:1,color:tv.err}}>Delete</button>
                <button onClick={()=>setDelConfirm(null)} style={{flex:1}}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
