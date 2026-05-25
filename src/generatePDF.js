import { jsPDF } from "jspdf";

/* ─── Layout constants ───────────────────────────────────────── */
const SW  = 240;   // step box width
const OW  = 200;   // option box width
const HG  = 50;    // horizontal gap between branch columns
const VG  = 28;    // vertical gap after a branch group
const AH  = 38;    // arrow segment height
const PAD = 60;    // outer padding
const SC  = 2;     // canvas scale for crispness

const FONT = "Arial, Helvetica, sans-serif";

const OC = [
  { bg:"#F0FAF5", br:"#0F6E56", tx:"#085041", dot:"#1D9E75" },
  { bg:"#FEF2F2", br:"#A32D2D", tx:"#791F1F", dot:"#E24B4A" },
  { bg:"#FFFBEB", br:"#854F0B", tx:"#633806", dot:"#BA7517" },
];

const SOP_C = {
  "c-blue":   { bg:"#EEF5FD", br:"#185FA5", tx:"#0C447C", dot:"#378ADD" },
  "c-teal":   { bg:"#E8F7F0", br:"#0F6E56", tx:"#085041", dot:"#1D9E75" },
  "c-purple": { bg:"#F0EFFE", br:"#534AB7", tx:"#3C3489", dot:"#7F77DD" },
  "c-coral":  { bg:"#FDF0EC", br:"#993C1D", tx:"#712B13", dot:"#D85A30" },
  "c-amber":  { bg:"#FEF5E5", br:"#854F0B", tx:"#633806", dot:"#BA7517" },
  "c-green":  { bg:"#EDF7E2", br:"#3B6D11", tx:"#27500A", dot:"#639922" },
  "c-pink":   { bg:"#FDF0F5", br:"#993556", tx:"#72243E", dot:"#D4537E" },
};

/* ─── Utilities ──────────────────────────────────────────────── */
const rd  = v  => Math.round(v * 10) / 10;
const esc = s  => String(s || "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function wrapText(text, maxWidth, fontSize) {
  const words  = String(text || "").split(" ");
  const charW  = fontSize * 0.52;
  const maxCh  = Math.max(1, Math.floor(maxWidth / charW));
  const lines  = [];
  let line     = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (test.length > maxCh && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function t(x, y, text, size, fill, weight = "normal", anchor = "start") {
  return `<text x="${rd(x)}" y="${rd(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}" font-family="${FONT}" text-anchor="${anchor}">${esc(text)}</text>`;
}

function line(x1, y1, x2, y2, stroke = "#C4C9D4", sw = 1.5, marker = "") {
  return `<line x1="${rd(x1)}" y1="${rd(y1)}" x2="${rd(x2)}" y2="${rd(y2)}" stroke="${stroke}" stroke-width="${sw}"${marker ? ` marker-end="${marker}"` : ""}/>`;
}

/* ─── Width measurement ──────────────────────────────────────── */
function measureWidth(steps) {
  if (!steps?.length) return SW;
  let w = SW;
  for (const step of steps) {
    if (step.options?.length > 0) {
      const bw = step.options.reduce(
        (sum, opt, i) => sum + (i > 0 ? HG : 0) + Math.max(OW, measureWidth(opt.steps || [])), 0);
      w = Math.max(w, bw);
    }
  }
  return w;
}

/* ─── Step box ───────────────────────────────────────────────── */
function buildStep(step, idx, bx, by, col) {
  const inner       = SW - 58;
  const titleLines  = wrapText(step.title  || "Untitled step", inner, 12);
  const detailLines = step.detail ? wrapText(step.detail, inner, 10).slice(0, 3) : [];
  const hasHandler  = !!step.handler;
  const h = Math.max(72,
    30 + titleLines.length * 17
    + (detailLines.length > 0 ? detailLines.length * 13 + 5 : 0)
    + (hasHandler ? 18 : 0));

  let s = "";
  s += `<rect x="${rd(bx)}" y="${rd(by)}" width="${SW}" height="${h}" rx="6" fill="white" stroke="${col.br}" stroke-width="1.5"/>`;
  s += `<rect x="${rd(bx)}" y="${rd(by)}" width="4" height="${h}" rx="2" fill="${col.br}"/>`;

  // Number circle
  const ncx = bx + 25, ncy = by + h / 2;
  s += `<circle cx="${rd(ncx)}" cy="${rd(ncy)}" r="13" fill="${col.bg}" stroke="${col.br}" stroke-width="1"/>`;
  s += t(ncx, ncy + 4, `${idx + 1}`, 11, col.tx, "700", "middle");

  // Title
  titleLines.forEach((l, li) => { s += t(bx + 50, by + 22 + li * 17, l, 12, "#111827", "600"); });

  // Detail
  const dy = by + 22 + titleLines.length * 17 + 4;
  detailLines.forEach((l, li) => { s += t(bx + 50, dy + li * 13, l, 10, "#6B7280"); });

  // Handler badge
  if (hasHandler) {
    const short = step.handler === "INBOX & TRIAGE SPECIALIST" ? "Inbox & Triage" : "Resolution";
    const hc = step.handler === "INBOX & TRIAGE SPECIALIST"
      ? { bg:"#EEEDFE", tx:"#3C3489" } : { bg:"#E1F5EE", tx:"#085041" };
    const hy = by + h - 15;
    const hw = short.length * 5.6 + 12;
    s += `<rect x="${rd(bx + 50)}" y="${rd(hy)}" width="${rd(hw)}" height="12" rx="3" fill="${hc.bg}"/>`;
    s += t(bx + 56, hy + 9, short, 8, hc.tx);
  }

  // Important badge
  if (step.important) {
    s += `<rect x="${rd(bx + SW - 70)}" y="${rd(by + 7)}" width="63" height="14" rx="3" fill="#FAEEDA"/>`;
    s += t(bx + SW - 38.5, by + 17, "Important", 8, "#633806", "normal", "middle");
  }

  return { svg: s, h };
}

/* ─── Option box ─────────────────────────────────────────────── */
function buildOpt(opt, oi, bx, by) {
  const c           = OC[oi % 3];
  const inner       = OW - 46;
  const labelLines  = wrapText(opt.label || `Option ${oi + 1}`, inner, 11);
  const noteLines   = opt.note ? wrapText(opt.note, inner, 10).slice(0, 2) : [];
  const h = Math.max(58,
    26 + labelLines.length * 15
    + (noteLines.length > 0 ? noteLines.length * 13 + 3 : 0)
    + (opt.endsFlow ? 14 : 0));

  let s = "";
  s += `<rect x="${rd(bx)}" y="${rd(by)}" width="${OW}" height="${h}" rx="5" fill="${c.bg}" stroke="${c.br}" stroke-width="1"/>`;

  // Number bubble
  const ncx = bx + 18, ncy = by + h / 2;
  s += `<circle cx="${rd(ncx)}" cy="${rd(ncy)}" r="10" fill="${c.dot}"/>`;
  s += t(ncx, ncy + 4, `${oi + 1}`, 10, "white", "700", "middle");

  // Label
  labelLines.forEach((l, li) => { s += t(bx + 34, by + 18 + li * 15, l, 11, c.tx, "700"); });

  // Note
  const noteY = by + 18 + labelLines.length * 15 + 3;
  noteLines.forEach((l, li) => { s += t(bx + 34, noteY + li * 13, l, 10, c.tx); });

  // Ends flow
  if (opt.endsFlow) {
    s += t(bx + 34, by + h - 4, "↳ ends flow", 9, c.tx);
  }

  // Handler tag
  if (opt.handler) {
    const short = opt.handler === "INBOX & TRIAGE SPECIALIST" ? "Inbox" : "Resolution";
    s += t(bx + OW - 8, by + 11, short, 8, c.tx, "normal", "end");
  }

  return { svg: s, h };
}

/* ─── Recursive draw ─────────────────────────────────────────── */
function drawBlock(steps, cx, y, col, out) {
  let curY = y;

  for (const [i, step] of steps.entries()) {
    const { svg: sBox, h: sH } = buildStep(step, i, cx - SW / 2, curY, col);
    out.push(sBox);
    curY += sH;

    if (step.options?.length > 0) {
      // Arrow down to branch row
      out.push(line(cx, curY, cx, curY + AH, "#C4C9D4", 1.5, "url(#arr)"));
      curY += AH;

      const colW   = step.options.map(opt => Math.max(OW, measureWidth(opt.steps || [])));
      const totalW = colW.reduce((s, w) => s + w, 0) + (colW.length - 1) * HG;
      let leftEdge = cx - totalW / 2;

      // Horizontal connector across option columns
      if (step.options.length > 1) {
        const hx1 = leftEdge + colW[0] / 2;
        const hx2 = cx + totalW / 2 - colW[colW.length - 1] / 2;
        out.push(line(hx1, curY, hx2, curY, "#C4C9D4", 1.5));
      }

      const topY    = curY;
      const bottoms = [];

      for (const [oi, opt] of step.options.entries()) {
        const cw   = colW[oi];
        const ocx  = leftEdge + cw / 2;
        const drop = step.options.length > 1 ? 18 : 0;

        // Vertical drop from horizontal connector to option box
        if (drop > 0) out.push(line(ocx, topY, ocx, topY + drop, "#C4C9D4", 1.5));

        const { svg: oBox, h: oH } = buildOpt(opt, oi, ocx - OW / 2, topY + drop);
        out.push(oBox);

        let botY = topY + drop + oH;

        // Sub-steps within this branch
        if (opt.steps?.length > 0) {
          out.push(line(ocx, botY, ocx, botY + AH, "#C4C9D4", 1.5, "url(#arr)"));
          botY += AH;
          botY = drawBlock(opt.steps, ocx, botY, OC[oi % 3], out);
        }

        bottoms.push(botY);
        leftEdge += cw + HG;
      }

      curY = Math.max(...bottoms) + VG;

      if (i < steps.length - 1) {
        out.push(line(cx, curY, cx, curY + AH, "#C4C9D4", 1.5, "url(#arr)"));
        curY += AH;
      }
    } else {
      if (i < steps.length - 1) {
        out.push(line(cx, curY, cx, curY + AH, "#C4C9D4", 1.5, "url(#arr)"));
        curY += AH;
      }
    }
  }

  return curY;
}

/* ─── Public export function ─────────────────────────────────── */
export async function generateSopPDF(sop) {
  const col   = SOP_C[sop.color] || SOP_C["c-blue"];
  const steps = sop.steps || [];

  const diagW  = Math.max(measureWidth(steps), SW);
  const cx     = PAD + diagW / 2;
  const HDR_H  = 95;

  // Dry run to measure total height
  const dryOut = [];
  const endY   = drawBlock(steps, cx, HDR_H + PAD, col, dryOut);

  const totalW = diagW + PAD * 2;
  const totalH = endY + PAD;

  // Real render pass
  const out = [];
  drawBlock(steps, cx, HDR_H + PAD, col, out);

  const now = new Date().toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF"/>
    </marker>
  </defs>
  <rect width="${totalW}" height="${totalH}" fill="white"/>
  <!-- Header band -->
  <rect width="${totalW}" height="${HDR_H}" fill="${col.bg}"/>
  <rect width="${totalW}" height="3" fill="${col.br}" opacity="0.7"/>
  <!-- SOP colour dot -->
  <circle cx="${PAD}" cy="${HDR_H / 2}" r="13" fill="${col.dot}"/>
  <!-- Title -->
  ${t(PAD + 24, HDR_H / 2 - 8, sop.title, 22, col.tx, "700")}
  ${sop.description ? t(PAD + 24, HDR_H / 2 + 16, sop.description, 12, col.tx) : ""}
  <!-- Branding + date -->
  ${t(totalW - PAD, HDR_H - 12, `Hello Macy  ·  ${now}`, 10, col.tx, "normal", "end")}
  <!-- Footer rule -->
  <rect y="${totalH - 3}" width="${totalW}" height="3" fill="${col.br}" opacity="0.3"/>
  <!-- Diagram -->
  ${out.join("\n  ")}
</svg>`;

  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();

    img.onload = () => {
      try {
        const canvas  = document.createElement("canvas");
        canvas.width  = Math.ceil(totalW * SC);
        canvas.height = Math.ceil(totalH * SC);
        const ctx = canvas.getContext("2d");
        ctx.scale(SC, SC);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, totalW, totalH);
        ctx.drawImage(img, 0, 0, totalW, totalH);
        URL.revokeObjectURL(url);

        const orient = totalW > totalH ? "l" : "p";
        const pdf = new jsPDF({
          orientation: orient,
          unit:        "px",
          format:      [totalW, totalH],
          hotfixes:    ["px_scaling"],
        });
        pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", 0, 0, totalW, totalH, "", "FAST");
        const filename = (sop.title || "SOP").replace(/[^a-z0-9\s-]/gi, "").trim().replace(/\s+/g, "_");
        pdf.save(`${filename}_SOP.pdf`);
        resolve();
      } catch (e) { reject(e); }
    };

    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
