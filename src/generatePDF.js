import { jsPDF } from "jspdf";

/* ─── Layout constants ─────────────────────────────────────── */
const SW  = 250;   // step box width
const OW  = 210;   // option box width
const HG  = 55;    // horizontal gap between branch columns
const VG  = 30;    // vertical gap after branch group
const AH  = 40;    // arrow segment height
const PAD = 65;    // outer padding
const SC  = 2;     // canvas scale (retina)
const FONT = "Arial, Helvetica, sans-serif";

/* ─── 6 branch colours ─────────────────────────────────────── */
const OC = [
  {bg:"#F0FAF5",br:"#0F6E56",tx:"#085041",dot:"#1D9E75",name:"Green"},
  {bg:"#FEF2F2",br:"#A32D2D",tx:"#791F1F",dot:"#E24B4A",name:"Red"},
  {bg:"#FFFBEB",br:"#854F0B",tx:"#633806",dot:"#BA7517",name:"Amber"},
  {bg:"#EEF5FD",br:"#185FA5",tx:"#0C447C",dot:"#378ADD",name:"Blue"},
  {bg:"#F0EFFE",br:"#534AB7",tx:"#3C3489",dot:"#7F77DD",name:"Purple"},
  {bg:"#FDF0F5",br:"#993556",tx:"#72243E",dot:"#D4537E",name:"Pink"},
];

const SOP_C = {
  "c-blue":   {bg:"#EEF5FD",br:"#185FA5",tx:"#0C447C",dot:"#378ADD"},
  "c-teal":   {bg:"#E8F7F0",br:"#0F6E56",tx:"#085041",dot:"#1D9E75"},
  "c-purple": {bg:"#F0EFFE",br:"#534AB7",tx:"#3C3489",dot:"#7F77DD"},
  "c-coral":  {bg:"#FDF0EC",br:"#993C1D",tx:"#712B13",dot:"#D85A30"},
  "c-amber":  {bg:"#FEF5E5",br:"#854F0B",tx:"#633806",dot:"#BA7517"},
  "c-green":  {bg:"#EDF7E2",br:"#3B6D11",tx:"#27500A",dot:"#639922"},
  "c-pink":   {bg:"#FDF0F5",br:"#993556",tx:"#72243E",dot:"#D4537E"},
};

/* ─── Utilities ─────────────────────────────────────────────── */
const rd  = v => Math.round(v * 10) / 10;
const esc = s => String(s||"")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function wrap(text, maxW, size) {
  const words = String(text||"").split(" ");
  const cw    = size * 0.52;
  const max   = Math.max(1, Math.floor(maxW / cw));
  const lines = []; let line = "";
  for (const w of words) {
    const t = line ? line+" "+w : w;
    if (t.length > max && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

const tx = (x,y,s,sz,fill,weight="normal",anchor="start") =>
  `<text x="${rd(x)}" y="${rd(y)}" font-size="${sz}" font-weight="${weight}" fill="${fill}" font-family="${FONT}" text-anchor="${anchor}">${esc(s)}</text>`;

const ln = (x1,y1,x2,y2,stroke="#C4C9D4",sw=1.5,mk="") =>
  `<line x1="${rd(x1)}" y1="${rd(y1)}" x2="${rd(x2)}" y2="${rd(y2)}" stroke="${stroke}" stroke-width="${sw}"${mk?` marker-end="${mk}"`:""} />`;

/* ─── Width measurement ─────────────────────────────────────── */
function mW(steps) {
  if (!steps?.length) return SW;
  let w = SW;
  for (const s of steps) {
    if (s.options?.length > 0) {
      const bw = s.options.reduce((sum,o,i) =>
        sum + (i>0?HG:0) + Math.max(OW, mW(o.steps||[])), 0);
      w = Math.max(w, bw);
    }
  }
  return w;
}

/* ─── Step box ──────────────────────────────────────────────── */
function stepBox(step, idx, bx, by, col) {
  const inner       = SW - 60;
  const titleLines  = wrap(step.title||"Untitled", inner, 12);
  const detailLines = step.detail ? wrap(step.detail, inner, 10).slice(0,3) : [];
  const HANDLER_H = step.handler ? 24 : 0;
  const h = Math.max(80,
    34 + titleLines.length*18
    + (detailLines.length ? detailLines.length*14+6 : 0)
    + HANDLER_H);

  let s = `<filter id="sh${idx}"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/></filter>`;
  s += `<rect x="${rd(bx)}" y="${rd(by)}" width="${SW}" height="${h}" rx="7" fill="white" stroke="${col.br}" stroke-width="1.5" filter="url(#sh${idx})"/>`;
  s += `<rect x="${rd(bx)}" y="${rd(by)}" width="5" height="${h}" rx="2" fill="${col.br}"/>`;

  // Number circle
  const ncx=bx+26, ncy=by+h/2;
  s += `<circle cx="${rd(ncx)}" cy="${rd(ncy)}" r="14" fill="${col.bg}" stroke="${col.br}" stroke-width="1.5"/>`;
  s += tx(ncx, ncy+4.5, `${idx+1}`, 12, col.tx, "700", "middle");

  // Title
  titleLines.forEach((l,li) => { s += tx(bx+50, by+22+li*17, l, 12, "#111827", "600"); });

  // Detail
  const dy = by+22+titleLines.length*17+4;
  detailLines.forEach((l,li) => { s += tx(bx+50, dy+li*13, l, 10, "#6B7280"); });

  // Handler badge — reserved space at bottom, always visible
  if (step.handler) {
    const short = step.handler==="INBOX & TRIAGE SPECIALIST"?"Inbox & Triage Specialist":"Resolution Specialist";
    const hc    = step.handler==="INBOX & TRIAGE SPECIALIST"
      ? {bg:"#EEEDFE",br:"#534AB7",tx:"#3C3489"} : {bg:"#E1F5EE",br:"#0F6E56",tx:"#085041"};
    const hy = by+h-20;
    const hw = short.length*5.6+16;
    s += `<rect x="${rd(bx+50)}" y="${rd(hy)}" width="${rd(hw)}" height="16" rx="4" fill="${hc.bg}" stroke="${hc.br}" stroke-width="0.5"/>`;
    s += tx(bx+58, hy+11, short, 8.5, hc.tx, "600");
  }

  // Important badge
  if (step.important) {
    s += `<rect x="${rd(bx+SW-72)}" y="${rd(by+7)}" width="65" height="15" rx="3" fill="#FAEEDA"/>`;
    s += tx(bx+SW-39.5, by+17.5, "Important", 8, "#633806", "normal", "middle");
  }

  return {svg:s, h};
}

/* ─── Option box ─────────────────────────────────────────────── */
function optBox(opt, oi, bx, by, topSteps) {
  const c           = OC[oi % 6];
  const inner       = OW - 46;
  const labelLines  = wrap(opt.label||`Option ${oi+1}`, inner, 11);
  const noteLines   = opt.note ? wrap(opt.note, inner, 10).slice(0,2) : [];
  const isMerge     = !!opt.mergeToStepId;
  const mergeIdx    = isMerge ? (topSteps||[]).findIndex(s=>s.id===opt.mergeToStepId) : -1;
  const OPT_HANDLER_H = opt.handler ? 20 : 0;
  const h = Math.max(64,
    28 + labelLines.length*15
    + (noteLines.length ? noteLines.length*13+4 : 0)
    + (opt.endsFlow||isMerge ? 14 : 0)
    + OPT_HANDLER_H);

  let s = `<rect x="${rd(bx)}" y="${rd(by)}" width="${OW}" height="${h}" rx="5" fill="${c.bg}" stroke="${c.br}" stroke-width="1"/>`;
  if (isMerge) {
    s += `<rect x="${rd(bx)}" y="${rd(by)}" width="${OW}" height="${h}" rx="5" fill="none" stroke="${c.br}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  }

  // Bubble
  const ncx=bx+18, ncy=by+h/2;
  s += `<circle cx="${rd(ncx)}" cy="${rd(ncy)}" r="11" fill="${c.dot}"/>`;
  s += tx(ncx, ncy+4, `${oi+1}`, 10, "white", "700", "middle");

  // Label
  labelLines.forEach((l,li) => { s += tx(bx+36, by+18+li*15, l, 11, c.tx, "700"); });

  // Note
  const ny = by+18+labelLines.length*15+2;
  noteLines.forEach((l,li) => { s += tx(bx+36, ny+li*13, l, 10, c.tx); });

  // Footer indicator
  if (isMerge && mergeIdx>=0) {
    s += tx(bx+36, by+h-4, `\u21b3 merges to Step ${mergeIdx+1}`, 9, c.tx);
  } else if (opt.endsFlow) {
    s += tx(bx+36, by+h-4, "\u21b3 ends flow", 9, c.tx);
  }

  // Handler badge — bottom left, clearly separated from content
  if (opt.handler) {
    const short = opt.handler==="INBOX & TRIAGE SPECIALIST"?"Inbox & Triage":"Resolution";
    const hc    = opt.handler==="INBOX & TRIAGE SPECIALIST"
      ? {bg:"#EEEDFE",br:"#534AB7",tx:"#3C3489"} : {bg:"#E1F5EE",br:"#0F6E56",tx:"#085041"};
    const hy = by+h-17;
    const hw = short.length*5.2+14;
    s += `<rect x="${rd(bx+30)}" y="${rd(hy)}" width="${rd(hw)}" height="13" rx="3" fill="${hc.bg}" stroke="${hc.br}" stroke-width="0.5"/>`;
    s += tx(bx+37, hy+9.5, short, 8, hc.tx, "600");
  }

  return {svg:s, h};
}

/* ─── Recursive draw ─────────────────────────────────────────── */
function drawBlock(steps, cx, y, col, out, topSteps) {
  let curY = y;
  for (const [i, step] of steps.entries()) {
    const {svg:sBox, h:sH} = stepBox(step, i, cx-SW/2, curY, col);
    out.push(sBox);
    curY += sH;

    if (step.options?.length > 0) {
      out.push(ln(cx, curY, cx, curY+AH, "#C4C9D4", 1.5, "url(#arr)"));
      curY += AH;

      const colW  = step.options.map(o => Math.max(OW, mW(o.steps||[])));
      const totW  = colW.reduce((s,w)=>s+w,0) + (colW.length-1)*HG;
      let left    = cx - totW/2;

      if (step.options.length > 1) {
        out.push(ln(left+colW[0]/2, curY, cx+totW/2-colW[colW.length-1]/2, curY, "#C4C9D4", 1.5));
      }

      const topY    = curY;
      const bottoms = [];

      for (const [oi, opt] of step.options.entries()) {
        const cw  = colW[oi];
        const ocx = left + cw/2;
        const drop= step.options.length>1 ? 18 : 0;

        if (drop>0) out.push(ln(ocx, topY, ocx, topY+drop, "#C4C9D4", 1.5));

        const {svg:oBox, h:oH} = optBox(opt, oi, ocx-OW/2, topY+drop, topSteps);
        out.push(oBox);

        let botY = topY+drop+oH;

        if (opt.steps?.length > 0) {
          out.push(ln(ocx, botY, ocx, botY+AH, "#C4C9D4", 1.5, "url(#arr)"));
          botY += AH;
          botY = drawBlock(opt.steps, ocx, botY, OC[oi%6], out, topSteps);
        }

        bottoms.push(botY);
        left += cw + HG;
      }

      curY = Math.max(...bottoms) + VG;
      if (i < steps.length-1) {
        out.push(ln(cx, curY, cx, curY+AH, "#C4C9D4", 1.5, "url(#arr)"));
        curY += AH;
      }
    } else {
      if (i < steps.length-1) {
        out.push(ln(cx, curY, cx, curY+AH, "#C4C9D4", 1.5, "url(#arr)"));
        curY += AH;
      }
    }
  }
  return curY;
}

/* ─── Legend ────────────────────────────────────────────────── */
function buildLegend(totalW, col, y) {
  const lh = 16, pad = 20, gap = 18;
  let s = "";
  let lx = pad, ly = y+30;

  // Title
  s += `<rect x="0" y="${y}" width="${totalW}" height="1" fill="#E5E7EB"/>`;
  s += tx(pad, y+18, "Legend", 11, "#6B7280", "700");
  ly = y + 36;

  // Step symbol
  s += `<circle cx="${lx+10}" cy="${ly+7}" r="10" fill="${col.bg}" stroke="${col.br}" stroke-width="1.5"/>`;
  s += tx(lx+10, ly+11, "1", 9, col.tx, "700", "middle");
  s += tx(lx+26, ly+11, "Step", 10, "#374151");
  lx += 80;

  // Branch options
  OC.slice(0,6).forEach((c,i) => {
    s += `<circle cx="${lx+9}" cy="${ly+7}" r="9" fill="${c.dot}"/>`;
    s += tx(lx+9, ly+11, `${i+1}`, 8, "white", "700", "middle");
    s += tx(lx+22, ly+11, c.name, 10, "#374151");
    lx += 72;
    if (lx > totalW-100) { lx=pad; ly+=gap; }
  });

  lx = pad; ly += gap+4;

  // Handler badges
  [{bg:"#EEEDFE",tx:"#3C3489",label:"Inbox & Triage"},{bg:"#E1F5EE",tx:"#085041",label:"Resolution"}].forEach(h=>{
    const hw = h.label.length*5.5+14;
    s += `<rect x="${lx}" y="${ly}" width="${hw}" height="13" rx="3" fill="${h.bg}"/>`;
    s += tx(lx+7, ly+9.5, h.label, 8, h.tx);
    lx += hw+12;
  });

  // Merge + ends flow
  s += tx(lx+4, ly+10, "\u21b3 merges to Step N", 9, "#6B7280");
  lx += 130;
  s += tx(lx, ly+10, "\u21b3 ends flow", 9, "#6B7280");
  lx += 90;

  // Dashed = merge point box
  s += `<rect x="${lx}" y="${ly}" width="36" height="13" rx="3" fill="#F9FAFB" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,2"/>`;
  s += tx(lx+18, ly+9.5, "merge", 8, "#6B7280", "normal", "middle");

  return s;
}

/* ─── Main export ───────────────────────────────────────────── */
export async function generateSopPDF(sop) {
  const col   = SOP_C[sop.color] || SOP_C["c-blue"];
  const steps = sop.steps || [];

  const diagW  = Math.max(mW(steps), SW);
  const cx     = PAD + diagW/2;
  const HDR_H  = 100;
  const LEG_H  = 80;

  // Measure height
  const dry = [];
  const endY = drawBlock(steps, cx, HDR_H+PAD, col, dry, steps);
  const totalW = diagW + PAD*2;
  const totalH = endY + PAD + LEG_H + 20;

  // Real render
  const out = [];
  drawBlock(steps, cx, HDR_H+PAD, col, out, steps);
  const legend = buildLegend(totalW, col, endY+PAD);

  const now = new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
  const stepCount = steps.length;
  const branchCount = steps.filter(s=>s.options?.length>0).length;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF"/>
    </marker>
    <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${col.bg}"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.4"/>
    </linearGradient>
  </defs>
  <rect width="${totalW}" height="${totalH}" fill="white"/>
  <!-- Header -->
  <rect width="${totalW}" height="${HDR_H}" fill="url(#hdrGrad)"/>
  <rect width="${totalW}" height="4" fill="${col.br}" opacity="0.8"/>
  <circle cx="${PAD}" cy="${HDR_H/2}" r="14" fill="${col.dot}"/>
  ${tx(PAD+24, HDR_H/2-10, sop.title, 22, col.tx, "700")}
  ${sop.description ? tx(PAD+24, HDR_H/2+12, sop.description, 12, col.tx) : ""}
  ${tx(PAD+24, HDR_H/2+28, `${stepCount} steps  ·  ${branchCount} branching`, 10, col.tx)}
  ${tx(totalW-PAD, HDR_H-14, `Hello Macy  ·  ${now}`, 10, col.tx, "normal", "end")}
  <rect y="${HDR_H-1}" width="${totalW}" height="1" fill="${col.br}" opacity="0.25"/>
  <!-- Diagram -->
  ${out.join("\n  ")}
  <!-- Legend -->
  ${legend}
  <rect y="${totalH-3}" width="${totalW}" height="3" fill="${col.br}" opacity="0.3"/>
</svg>`;

  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], {type:"image/svg+xml;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      try {
        const canvas  = document.createElement("canvas");
        canvas.width  = Math.ceil(totalW*SC);
        canvas.height = Math.ceil(totalH*SC);
        const ctx = canvas.getContext("2d");
        ctx.scale(SC, SC);
        ctx.fillStyle = "white";
        ctx.fillRect(0,0,totalW,totalH);
        ctx.drawImage(img,0,0,totalW,totalH);
        URL.revokeObjectURL(url);
        const orient = totalW>totalH?"l":"p";
        const pdf = new jsPDF({orientation:orient,unit:"px",format:[totalW,totalH],hotfixes:["px_scaling"]});
        pdf.addImage(canvas.toDataURL("image/png",1.0),"PNG",0,0,totalW,totalH,"","FAST");
        const fn = (sop.title||"SOP").replace(/[^a-z0-9\s-]/gi,"").trim().replace(/\s+/g,"_");
        pdf.save(`${fn}_SOP.pdf`);
        resolve();
      } catch(e){reject(e);}
    };
    img.onerror = e=>{URL.revokeObjectURL(url);reject(e);};
    img.src = url;
  });
}
