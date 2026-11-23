/* Retteskjema-generator: bygger en .xlsx-fil (OOXML) uten eksterne bibliotek.
   Retteskjema.build(test, klasser) -> Uint8Array
   test = {navn, tema:[{id,navn}], oppgaver:[{nr,del,maks,fasit,niva,tema:[id]}], grenser:[p6,p5,p4,p3,p2]}
   klasser = [{navn, antall}] */
(function (root) {
  "use strict";

  const X = s => String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function col(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  const A = (c, r) => col(c) + r;                    // relativ
  const AA = (c, r) => "$" + col(c) + "$" + r;       // absolutt
  const q = name => "'" + String(name).replace(/'/g, "''") + "'!";

  function sheetName(raw, used, prefix) {
    let n = String(raw || "").replace(/[\[\]\*\?\/\\:]/g, " ").replace(/^'+|'+$/g, "").trim() || "Klasse";
    n = ((prefix || "") + n).slice(0, 31);
    let base = n, i = 2;
    while (used.has(n.toLowerCase())) { const suf = " (" + i++ + ")"; n = base.slice(0, 31 - suf.length) + suf; }
    used.add(n.toLowerCase());
    return n;
  }

  /* ---------- stiler ---------- */
  function Styles() {
    const fonts = [], borders = [], xfs = [], map = new Map();
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const numFmts = ['<numFmt numFmtId="164" formatCode="0.0"/>'];
    const idx = (arr, xml) => { let i = arr.indexOf(xml); if (i < 0) { arr.push(xml); i = arr.length - 1; } return i; };
    const side = (n, v) => v ? `<${n} style="${v}"><color rgb="FF${v === "medium" ? "1F2933" : "B8C0CC"}"/></${n}>` : `<${n}/>`;
    function get(o) {
      o = o || {};
      const key = JSON.stringify(o);
      if (map.has(key)) return map.get(key);
      const fontId = idx(fonts, `<font>${o.b ? "<b/>" : ""}${o.i ? "<i/>" : ""}<sz val="${o.sz || 11}"/><color rgb="FF${o.color || "1F2933"}"/><name val="Calibri"/><family val="2"/></font>`);
      const fillId = o.fill ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${o.fill}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      const bd = o.border ? { l: o.l || "thin", r: "thin", t: "thin", b: "thin" } : { l: o.l };
      const borderId = idx(borders, `<border>${side("left", bd.l)}${side("right", bd.r)}${side("top", bd.t)}${side("bottom", bd.b)}<diagonal/></border>`);
      const numFmtId = o.fmt === "pct" ? 9 : o.fmt === "d1" ? 164 : 0;
      const al = `<alignment${o.h ? ` horizontal="${o.h}"` : ""} vertical="${o.v || "center"}"${o.wrap ? ' wrapText="1"' : ""}/>`;
      xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
      map.set(key, xfs.length - 1);
      return xfs.length - 1;
    }
    get({ v: "bottom" });
    const dxf = (font, bg) => `<dxf><font><color rgb="FF${font}"/></font>${bg ? `<fill><patternFill><bgColor rgb="FF${bg}"/></patternFill></fill>` : ""}</dxf>`;
    function xml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<numFmts count="${numFmts.length}">${numFmts.join("")}</numFmts>` +
        `<fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills>` +
        `<borders count="${borders.length}">${borders.join("")}</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `<dxfs count="4">${dxf("1E6B34", "C9EBCF")}${dxf("7A5A00", "FFE99A")}${dxf("9B1C1C", "F8C4C4")}${dxf("9AA5B1", "")}</dxfs>` +
        `</styleSheet>`;
    }
    return { get, xml };
  }
  const DXF = { green: 0, yellow: 1, red: 2, grey: 3 };

  /* ---------- ark ---------- */
  function Sheet(name) {
    this.name = name; this.rows = new Map(); this.cols = []; this.heights = {}; this.merges = [];
    this.cf = []; this.dv = []; this.breaks = []; this.freeze = null; this.landscape = false;
    this.grid = true; this.chart = null; this.prio = 1;
  }
  Sheet.prototype.set = function (r, c, v, s) {
    if (!this.rows.has(r)) this.rows.set(r, new Map());
    this.rows.get(r).set(c, { v, s: s || 0 });
  };
  Sheet.prototype.width = function (from, to, w) { this.cols.push({ from, to, w }); };
  Sheet.prototype.merge = function (r1, c1, r2, c2) { if (r1 !== r2 || c1 !== c2) this.merges.push(A(c1, r1) + ":" + A(c2, r2)); };
  Sheet.prototype.addCF = function (sqref, rules) { this.cf.push({ sqref, rules }); };
  Sheet.prototype.xml = function (first) {
    let o = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;
    o += `<sheetViews><sheetView${first ? ' tabSelected="1"' : ""}${this.grid ? "" : ' showGridLines="0"'} workbookViewId="0">`;
    if (this.freeze) {
      const [fr, fc] = this.freeze;
      o += `<pane xSplit="${fc - 1}" ySplit="${fr - 1}" topLeftCell="${A(fc, fr)}" activePane="bottomRight" state="frozen"/>`;
    }
    o += `</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>`;
    if (this.cols.length) {
      o += "<cols>" + this.cols.slice().sort((a, b) => a.from - b.from).map(c => `<col min="${c.from}" max="${c.to}" width="${c.w}" customWidth="1"/>`).join("") + "</cols>";
    }
    o += "<sheetData>";
    const rs = [...this.rows.keys()].sort((a, b) => a - b);
    for (const r of rs) {
      const h = this.heights[r];
      o += `<row r="${r}"${h ? ` ht="${h}" customHeight="1"` : ""}>`;
      const cells = this.rows.get(r);
      for (const c of [...cells.keys()].sort((a, b) => a - b)) {
        const { v, s } = cells.get(c), ref = A(c, r), st = s ? ` s="${s}"` : "";
        if (v == null || v === "") o += `<c r="${ref}"${st}/>`;
        else if (typeof v === "number") o += `<c r="${ref}"${st}><v>${v}</v></c>`;
        else if (typeof v === "object") o += `<c r="${ref}"${st}><f>${X(v.f)}</f></c>`;
        else o += `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
      }
      o += "</row>";
    }
    o += "</sheetData>";
    if (this.merges.length) o += `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`;
    for (const cf of this.cf) {
      o += `<conditionalFormatting sqref="${cf.sqref}">`;
      for (const r of cf.rules) {
        if (r.scale) o += `<cfRule type="colorScale" priority="${this.prio++}"><colorScale><cfvo type="num" val="0"/><cfvo type="num" val="0.5"/><cfvo type="num" val="1"/><color rgb="FFF8C4C4"/><color rgb="FFFFE99A"/><color rgb="FFC9EBCF"/></colorScale></cfRule>`;
        else o += `<cfRule type="expression" dxfId="${r.dxf}" priority="${this.prio++}"${r.stop ? ' stopIfTrue="1"' : ""}><formula>${X(r.f)}</formula></cfRule>`;
      }
      o += "</conditionalFormatting>";
    }
    if (this.dv.length) {
      o += `<dataValidations count="${this.dv.length}">` + this.dv.map(d => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${d.sqref}"><formula1>${X(d.list)}</formula1></dataValidation>`).join("") + "</dataValidations>";
    }
    o += `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>`;
    o += `<pageSetup paperSize="9" orientation="${this.landscape ? "landscape" : "portrait"}"/>`;
    if (this.breaks.length) o += `<rowBreaks count="${this.breaks.length}" manualBreakCount="${this.breaks.length}">${this.breaks.map(b => `<brk id="${b}" max="16383" man="1"/>`).join("")}</rowBreaks>`;
    if (this.chart) o += `<drawing r:id="rId1"/>`;
    return o + "</worksheet>";
  };

  /* ---------- zip (uten komprimering) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function zip(files) {
    const parts = [], central = []; let off = 0;
    const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    for (const f of files) {
      const name = utf8(f.name), data = utf8(f.data), crc = crc32(data);
      const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      const local = new Uint8Array([0x50, 0x4B, 3, 4, ...common]);
      parts.push(local, name, data);
      central.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
      off += local.length + name.length + data.length;
    }
    const csize = central.reduce((a, p) => a + p.length, 0);
    const end = new Uint8Array([0x50, 0x4B, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(csize), ...u32(off), ...u16(0)]);
    const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
    let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }

  /* ---------- diagram ---------- */
  function chartXml(series, cat) {
    const colors = ["2F6DB5", "E08A1E", "3A9A63", "8E5BB5", "C0504D", "4BACC6"];
    const ser = series.map((s, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:strRef><c:f>${X(s.name)}</c:f></c:strRef></c:tx>` +
      `<c:spPr><a:solidFill><a:srgbClr val="${colors[i % colors.length]}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>` +
      `<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>` +
      `<c:cat><c:numRef><c:f>${X(cat)}</c:f></c:numRef></c:cat><c:val><c:numRef><c:f>${X(s.val)}</c:f></c:numRef></c:val></c:ser>`).join("");
    const title = t => `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="nb-NO"/><a:t>${X(t)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<c:roundedCorners val="0"/><c:chart>${title("Karakterfordeling")}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>` +
      `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="60"/><c:axId val="500000001"/><c:axId val="500000002"/></c:barChart>` +
      `<c:catAx><c:axId val="500000001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>${title("Karakter")}<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="500000002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
      `<c:valAx><c:axId val="500000002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/>${title("Antall elever")}<c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="500000001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/><c:majorUnit val="1"/></c:valAx>` +
      `</c:plotArea>${series.length > 1 ? '<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>' : ""}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
  }
  function drawingXml(a) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<xdr:twoCellAnchor><xdr:from><xdr:col>${a.c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${a.c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
      `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Karakterfordeling"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
      `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
  }

  /* ---------- selve retteskjemaet ---------- */
  const NIVA = ["Lav", "Middels", "Høy"];
  const nrDeler = s => String(s == null ? "" : s).toLowerCase().trim().match(/\d+|\D+/g) || [];
  function cmpNr(a, b) {   // del 1 før del 2, og oppgave 2 før oppgave 10
    const A = nrDeler(a), B = nrDeler(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      const x = A[i], y = B[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      const tx = /^\d/.test(x), ty = /^\d/.test(y);
      if (tx && ty) { const d = parseInt(x, 10) - parseInt(y, 10); if (d) return d; }
      else if (tx !== ty) { return tx ? -1 : 1; }
      else { const d = x.localeCompare(y, "nb"); if (d) return d; }
    }
    return 0;
  }
  const num = v => { const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };

  function build(test, klasser) {
    const S = Styles();
    const tasks = test.oppgaver.map(o => ({ nr: String(o.nr || "").trim(), del: Number(o.del) === 2 ? 2 : 1, maks: num(o.maks), fasit: String(o.fasit == null ? "" : o.fasit), niva: NIVA.includes(o.niva) ? o.niva : "Middels", tema: o.tema || [] }))
      .map((o, i) => ({ ...o, i })).sort((a, b) => a.del - b.del || cmpNr(a.nr, b.nr) || a.i - b.i);
    const temas = test.tema || [];
    const n = tasks.length, K = temas.length;
    if (!n) throw new Error("Prøven har ingen oppgaver.");
    const gr = (test.grenser && test.grenser.length === 5 ? test.grenser : [0.9, 0.7, 0.5, 0.3, 0.1]).map(num);
    const used = new Set(["statistikk", "egenvurdering", "oppsett"]);
    const classes = klasser.map(k => ({ antall: Math.max(1, Math.min(200, Math.round(num(k.antall)) || 1)), name: sheetName(k.navn, used) }));
    classes.forEach(k => { k.ark = sheetName(k.name, used, "Elevark "); });
    if (!classes.length) throw new Error("Legg inn minst én klasse.");

    // kolonner i klassearket
    const T1 = 3, TN = 2 + n, firstDel2 = T1 + tasks.findIndex(t => t.del === 2), hasDel2 = tasks.some(t => t.del === 2), hasDel1 = tasks.some(t => t.del === 1);
    const s0 = TN + 2;
    const C = { del1: s0, del2: s0 + 1, tot: s0 + 2, pct: s0 + 3, kar: s0 + 4, lav: s0 + 5, mid: s0 + 6, hoy: s0 + 7, tema: k => s0 + 8 + k, kom: s0 + 8 + K };
    const R = { band: 1, oppg: 2, fasit: 3, maks: 4, first: 5 };
    const O = { oppg: 1, del: 2, maks: 3, fasit: 4, niva: 5, th: 6, tema: k => 7 + k };
    const oRow = r => `Oppsett!$${col(T1)}$${r}:$${col(TN)}$${r}`;
    const ST = "Statistikk!";

    const hdr = { b: 1, h: "center", border: 1, wrap: 1 };
    const fill1 = "DCE6F2", fill2 = "FCE8D5", fillS = "E7E9ED", fillN = "E3EEE4", fillT = "EFE6F3";
    const taskFill = t => t.del === 2 ? fill2 : fill1;
    const div = (c, o) => (hasDel1 && hasDel2 && c === firstDel2) ? { ...o, l: "medium" } : o;

    /* --- Oppsett --- */
    const ops = new Sheet("Oppsett");
    ops.width(1, 1, 40); ops.width(2, 2, 8); ops.width(T1, TN, 7);
    const lab = S.get({ b: 1, fill: fillS, border: 1 });
    [["Oppgave", O.oppg], ["Del (1 eller 2)", O.del], ["Maks poeng", O.maks], ["Fasit", O.fasit], ["Nivå (Lav, Middels, Høy)", O.niva], ["Tema – skriv 1 der oppgaven teller", O.th]].forEach(([t, r]) => ops.set(r, 1, t, lab));
    ops.set(O.oppg, 2, "Sum", S.get({ b: 1, fill: fillS, border: 1, h: "center" }));
    ops.set(O.maks, 2, { f: `SUM(${oRow(O.maks)})` }, S.get({ b: 1, border: 1, h: "center" }));
    tasks.forEach((t, j) => {
      const c = T1 + j;
      ops.set(O.oppg, c, t.nr, S.get(div(c, { ...hdr, fill: taskFill(t) })));
      ops.set(O.del, c, t.del, S.get(div(c, { h: "center", border: 1 })));
      ops.set(O.maks, c, t.maks, S.get(div(c, { h: "center", border: 1, b: 1 })));
      ops.set(O.fasit, c, t.fasit, S.get(div(c, { h: "center", border: 1, wrap: 1, sz: 9 })));
      ops.set(O.niva, c, t.niva, S.get(div(c, { h: "center", border: 1, sz: 9 })));
      ops.set(O.th, c, null, S.get(div(c, { fill: fillS, border: 1 })));
      temas.forEach((tm, k) => ops.set(O.tema(k), c, t.tema.includes(tm.id) ? 1 : null, S.get(div(c, { h: "center", border: 1 }))));
    });
    temas.forEach((tm, k) => {
      ops.set(O.tema(k), 1, tm.navn, S.get({ border: 1, fill: fillT }));
      ops.set(O.tema(k), 2, { f: `SUMPRODUCT(${oRow(O.maks)},${oRow(O.tema(k))})` }, S.get({ border: 1, h: "center" }));
    });
    ops.heights[O.fasit] = 30;
    ops.freeze = [2, 3];
    ops.dv.push({ sqref: `${A(T1, O.niva)}:${A(TN, O.niva)}`, list: '"Lav,Middels,Høy"' }, { sqref: `${A(T1, O.del)}:${A(TN, O.del)}`, list: '"1,2"' });
    const noteRow = O.tema(K) + 1;
    ops.set(noteRow, 1, "Endringer her (poeng, fasit, nivå, tema) slår rett inn i retteskjema, elevark og statistikk.", S.get({ i: 1, color: "52606D" }));
    ops.set(noteRow + 1, 1, "Arket Egenvurdering er en fast utskrift og oppdateres ikke.", S.get({ i: 1, color: "52606D" }));
    ops.landscape = true;

    /* --- klasseark --- */
    const classSheets = classes.map(k => {
      const sh = new Sheet(k.name), N = k.antall, last = R.first + N - 1, RS = last + 1;
      k.last = last; k.RS = RS;
      sh.landscape = true; sh.freeze = [R.first, 3];
      sh.width(1, 1, 6); sh.width(2, 2, 20); sh.width(T1, TN, 6); sh.width(TN + 1, TN + 1, 2);
      sh.width(C.del1, C.hoy, 8.5); if (K) sh.width(C.tema(0), C.tema(K - 1), 13); sh.width(C.kom, C.kom, 60);
      sh.heights[R.oppg] = K ? 48 : 20; sh.heights[R.fasit] = 30;

      // bånd
      const band = (c1, c2, text, fill) => { for (let c = c1; c <= c2; c++) sh.set(R.band, c, c === c1 ? text : null, S.get(div(c, { ...hdr, fill }))); sh.merge(R.band, c1, R.band, c2); };
      sh.set(R.band, 1, test.navn || "Terminprøve", S.get({ b: 1 }));
      if (hasDel1) band(T1, hasDel2 ? firstDel2 - 1 : TN, "Del 1", fill1);
      if (hasDel2) band(firstDel2, TN, "Del 2", fill2);
      band(C.del1, C.kar, "Sum", fillS); band(C.lav, C.hoy, "Nivå", fillN); if (K) band(C.tema(0), C.tema(K - 1), "Tema", fillT);

      const left = S.get({ b: 1, fill: fillS, border: 1 });
      sh.set(R.oppg, 1, "Kand.", left); sh.set(R.oppg, 2, "Navn ↓   Oppgave →", left);
      sh.set(R.fasit, 1, null, left); sh.set(R.fasit, 2, "Fasit", left);
      sh.set(R.maks, 1, null, left); sh.set(R.maks, 2, "Maks poeng", left);

      tasks.forEach((t, j) => {
        const c = T1 + j, oc = col(c);
        sh.set(R.oppg, c, { f: `Oppsett!${oc}$${O.oppg}` }, S.get(div(c, { ...hdr, fill: taskFill(t) })));
        sh.set(R.fasit, c, { f: `IF(Oppsett!${oc}$${O.fasit}="","",Oppsett!${oc}$${O.fasit})` }, S.get(div(c, { h: "center", border: 1, wrap: 1, sz: 9, i: 1, color: "52606D" })));
        sh.set(R.maks, c, { f: `Oppsett!${oc}$${O.maks}` }, S.get(div(c, { h: "center", border: 1, b: 1 })));
      });

      const sums = [
        [C.del1, "Del 1", r => `SUMIF(${oRow(O.del)},1,$${col(T1)}${r}:$${col(TN)}${r})`, fillS],
        [C.del2, "Del 2", r => `SUMIF(${oRow(O.del)},2,$${col(T1)}${r}:$${col(TN)}${r})`, fillS],
        [C.tot, "Totalt", r => `SUM($${col(T1)}${r}:$${col(TN)}${r})`, fillS],
        [C.lav, "Lav", r => `SUMIF(${oRow(O.niva)},"Lav",$${col(T1)}${r}:$${col(TN)}${r})`, fillN],
        [C.mid, "Middels", r => `SUMIF(${oRow(O.niva)},"Middels",$${col(T1)}${r}:$${col(TN)}${r})`, fillN],
        [C.hoy, "Høy", r => `SUMIF(${oRow(O.niva)},"Høy",$${col(T1)}${r}:$${col(TN)}${r})`, fillN],
        ...temas.map((tm, k) => [C.tema(k), { f: `Oppsett!$A$${O.tema(k)}` }, r => `SUMPRODUCT($${col(T1)}${r}:$${col(TN)}${r},${oRow(O.tema(k))})`, fillT]),
      ];
      const numSt = S.get({ h: "center", border: 1 }), maxSt = S.get({ h: "center", border: 1, b: 1 });
      for (const [c, title, f, fill] of sums) {
        sh.set(R.oppg, c, title, S.get({ ...hdr, fill }));
        sh.set(R.fasit, c, null, numSt);
        sh.set(R.maks, c, { f: f(R.maks) }, maxSt);
        for (let r = R.first; r <= last; r++) sh.set(r, c, { f: `IF($B${r}="","",${f(r)})` }, numSt);
        sh.set(RS, c, { f: `IF(OR(COUNT(${A(c, R.first)}:${A(c, last)})=0,${col(c)}$${R.maks}=0),"",SUM(${A(c, R.first)}:${A(c, last)})/(COUNT(${A(c, R.first)}:${A(c, last)})*${col(c)}$${R.maks}))` }, S.get({ h: "center", border: 1, fmt: "pct", b: 1 }));
      }
      // prosent og karakter
      const tc = col(C.tot), pc = col(C.pct);
      sh.set(R.oppg, C.pct, "Prosent", S.get({ ...hdr, fill: fillS })); sh.set(R.oppg, C.kar, "Karakter", S.get({ ...hdr, fill: fillS }));
      sh.set(R.fasit, C.pct, null, numSt); sh.set(R.fasit, C.kar, null, numSt); sh.set(R.maks, C.pct, 1, S.get({ h: "center", border: 1, b: 1, fmt: "pct" })); sh.set(R.maks, C.kar, 6, maxSt);
      for (let r = R.first; r <= last; r++) {
        sh.set(r, C.pct, { f: `IF($B${r}="","",IF($${tc}$${R.maks}=0,0,$${tc}${r}/$${tc}$${R.maks}))` }, S.get({ h: "center", border: 1, fmt: "pct" }));
        const p = `ROUND($${pc}${r},6)`;
        sh.set(r, C.kar, { f: `IF($B${r}="","",IF(${p}>=${ST}$B$5,6,IF(${p}>=${ST}$B$6,5,IF(${p}>=${ST}$B$7,4,IF(${p}>=${ST}$B$8,3,IF(${p}>=${ST}$B$9,2,1))))))` }, S.get({ h: "center", border: 1, b: 1 }));
      }
      const avg = c => `IF(COUNT(${A(c, R.first)}:${A(c, last)})=0,"",AVERAGE(${A(c, R.first)}:${A(c, last)}))`;
      sh.set(RS, C.pct, { f: avg(C.pct) }, S.get({ h: "center", border: 1, fmt: "pct", b: 1 }));
      sh.set(RS, C.kar, { f: avg(C.kar) }, S.get({ h: "center", border: 1, fmt: "d1", b: 1 }));
      // kommentar
      sh.set(R.oppg, C.kom, "Kommentar til eleven", S.get({ ...hdr, fill: fillS, h: "left" }));
      for (let r = R.first; r <= last; r++) sh.set(r, C.kom, null, S.get({ border: 1, wrap: 1, h: "left" }));

      // elevrader
      const idSt = S.get({ h: "center", border: 1, color: "52606D" }), nameSt = S.get({ border: 1 });
      for (let r = R.first; r <= last; r++) {
        sh.set(r, 1, r - R.first + 1, idSt); sh.set(r, 2, null, nameSt);
        for (let j = 0; j < n; j++) { const c = T1 + j; sh.set(r, c, { f: `${col(c)}$${R.maks}` }, S.get(div(c, { h: "center", border: 1 }))); }
      }
      // løsningsprosent
      const nm = `$B$${R.first}:$B$${last}`;
      sh.set(RS, 1, null, left); sh.set(RS, 2, "Løsningsprosent", left);
      for (let j = 0; j < n; j++) {
        const c = T1 + j, cc = col(c);
        sh.set(RS, c, { f: `IF(OR(COUNTA(${nm})=0,${cc}$${R.maks}=0),"",SUMIF(${nm},"<>",${cc}${R.first}:${cc}${last})/(COUNTA(${nm})*${cc}$${R.maks}))` }, S.get(div(c, { h: "center", border: 1, fmt: "pct", sz: 9, b: 1 })));
      }
      sh.set(RS + 2, 2, "Skriv elevens navn først. Full pott står ferdig utfylt – trykk pil høyre, og skriv bare inn der eleven har færre poeng. Rader uten navn telles ikke med.", S.get({ i: 1, color: "52606D", v: "top" }));

      // betinget formatering
      const t0 = A(T1, R.first), mx = `${col(T1)}$${R.maks}`;
      sh.addCF(`${t0}:${A(TN, last)}`, [
        { f: `$B${R.first}=""`, dxf: DXF.grey, stop: 1 },
        { f: `AND(ISNUMBER(${t0}),${t0}<=0)`, dxf: DXF.red, stop: 1 },
        { f: `AND(ISNUMBER(${t0}),${t0}>=${mx})`, dxf: DXF.green, stop: 1 },
        { f: `AND(ISNUMBER(${t0}),${t0}<${mx})`, dxf: DXF.yellow, stop: 1 },
        { f: `AND(NOT(ISNUMBER(${t0})),${t0}<>"")`, dxf: DXF.red },
      ]);
      const g0 = A(C.lav, R.first), gmx = `${col(C.lav)}$${R.maks}`;
      sh.addCF(`${g0}:${A(K ? C.tema(K - 1) : C.hoy, last)}`, [
        { f: `AND(ISNUMBER(${g0}),${gmx}>0,${g0}<=0)`, dxf: DXF.red, stop: 1 },
        { f: `AND(ISNUMBER(${g0}),${gmx}>0,ROUND(${g0},6)>=ROUND(${gmx},6))`, dxf: DXF.green, stop: 1 },
        { f: `AND(ISNUMBER(${g0}),${gmx}>0)`, dxf: DXF.yellow, stop: 1 },
      ]);
      sh.addCF(`${A(T1, RS)}:${A(TN, RS)} ${A(C.del1, RS)}:${A(C.tot, RS)} ${A(C.lav, RS)}:${A(K ? C.tema(K - 1) : C.hoy, RS)}`, [{ scale: 1 }]);
      return sh;
    });

    /* --- Statistikk --- */
    const st = new Sheet("Statistikk");
    const nc = classes.length, cTot = 2 + nc, cAnd = 3 + nc;
    st.width(1, 1, 30); st.width(2, cAnd, 13);
    const h2 = S.get({ b: 1, sz: 12 }), th = S.get({ b: 1, fill: fillS, border: 1, h: "center", wrap: 1 }), thL = S.get({ b: 1, fill: fillS, border: 1 });
    const td = S.get({ border: 1, h: "center" }), tdL = S.get({ border: 1 }), tdP = S.get({ border: 1, h: "center", fmt: "pct" }), tdB = S.get({ border: 1, h: "center", b: 1 }), tdD = S.get({ border: 1, h: "center", fmt: "d1" });
    st.set(1, 1, test.navn || "Terminprøve", S.get({ b: 1, sz: 14 }));
    st.set(3, 1, "Karaktergrenser (kan justeres)", h2);
    st.set(4, 1, "Karakter", thL); st.set(4, 2, "Fra og med (%)", th); st.set(4, 3, "Fra og med (poeng)", th);
    const k0 = classes[0], maxTot = `${q(k0.name)}$${col(C.tot)}$${R.maks}`;
    [6, 5, 4, 3, 2, 1].forEach((g, i) => {
      st.set(5 + i, 1, g, S.get({ border: 1, b: 1, h: "left" }));
      st.set(5 + i, 2, g === 1 ? 0 : gr[i], tdP);
      st.set(5 + i, 3, { f: `B${5 + i}*${maxTot}` }, tdD);
    });
    st.set(13, 1, "Karakterfordeling", h2);
    st.set(14, 1, "Karakter", thL); classes.forEach((k, i) => st.set(14, 2 + i, k.name, th)); st.set(14, cTot, "Totalt", th); st.set(14, cAnd, "Andel", th);
    const karRange = k => `${q(k.name)}$${col(C.kar)}$${R.first}:$${col(C.kar)}$${k.last}`;
    for (let g = 1; g <= 6; g++) {
      const r = 14 + g;
      st.set(r, 1, g, S.get({ border: 1, b: 1, h: "left" }));
      classes.forEach((k, i) => st.set(r, 2 + i, { f: `COUNTIF(${karRange(k)},$A${r})` }, td));
      st.set(r, cTot, { f: `SUM(${A(2, r)}:${A(1 + nc, r)})` }, tdB);
      st.set(r, cAnd, { f: `IF(${AA(cTot, 21)}=0,"",${A(cTot, r)}/${AA(cTot, 21)})` }, tdP);
    }
    st.set(21, 1, "Antall rettet", thL); st.set(22, 1, "Snitt karakter", thL); st.set(23, 1, "Snitt poeng", thL); st.set(24, 1, "Snitt prosent", thL);
    for (let i = 0; i <= nc; i++) st.set(21, 2 + i, { f: `SUM(${A(2 + i, 15)}:${A(2 + i, 20)})` }, tdB);
    const rng = (k, c) => `${q(k.name)}$${col(c)}$${R.first}:$${col(c)}$${k.last}`;
    classes.forEach((k, i) => {
      [[22, C.kar, tdD], [23, C.tot, tdD], [24, C.pct, tdP]].forEach(([r, c, s]) => st.set(r, 2 + i, { f: `IF(COUNT(${rng(k, c)})=0,"",AVERAGE(${rng(k, c)}))` }, s));
    });
    [[22, C.kar, tdD], [23, C.tot, tdD], [24, C.pct, tdP]].forEach(([r, c, s]) => {
      const sum = classes.map(k => `SUM(${rng(k, c)})`).join("+");
      st.set(r, cTot, { f: `IF(${AA(cTot, 21)}=0,"",(${sum})/${AA(cTot, 21)})` }, s);
    });
    st.set(27, 1, "Løsningsprosent per del, nivå og tema", h2);
    st.set(28, 1, "", thL); classes.forEach((k, i) => st.set(28, 2 + i, k.name, th));
    const lines = [["Del 1", C.del1], ["Del 2", C.del2], ["Totalt", C.tot], ["Lav", C.lav], ["Middels", C.mid], ["Høy", C.hoy], ...temas.map((tm, k) => [{ f: `Oppsett!$A$${O.tema(k)}` }, C.tema(k)])];
    lines.forEach(([t, c], i) => {
      st.set(29 + i, 1, t, tdL);
      classes.forEach((k, j) => st.set(29 + i, 2 + j, { f: `${q(k.name)}${AA(c, k.RS)}` }, tdP));
    });
    st.addCF(`${A(2, 29)}:${A(1 + nc, 28 + lines.length)}`, [{ scale: 1 }]);
    const series = nc > 1 ? classes.map((k, i) => ({ name: `Statistikk!${AA(2 + i, 14)}`, val: `Statistikk!${AA(2 + i, 15)}:${AA(2 + i, 20)}` })) : [{ name: `Statistikk!${AA(cTot, 14)}`, val: `Statistikk!${AA(cTot, 15)}:${AA(cTot, 20)}` }];
    st.chart = { xml: chartXml(series, "Statistikk!$A$15:$A$20"), anchor: { c1: cAnd + 1, r1: 2, c2: cAnd + 9, r2: 24 } };

    /* --- Elevark --- */
    const H = 21 + K;
    const elevSheets = classes.map(k => {
      const sh = new Sheet(k.ark); sh.grid = false;
      sh.width(1, 1, 30); sh.width(2, 2, 8); sh.width(3, 3, 4); sh.width(4, 4, 8); sh.width(5, 5, 9); sh.width(6, 6, 20);
      const src = q(k.name), cfP = [], bold = S.get({ b: 1 }), big = S.get({ b: 1, sz: 14 }), kar = S.get({ b: 1, sz: 20, h: "center", border: 1 });
      const hL = S.get({ b: 1, fill: fillS, border: 1 }), hC = S.get({ b: 1, fill: fillS, border: 1, h: "center" });
      const cL = S.get({ border: 1 }), cC = S.get({ border: 1, h: "center" }), cP = S.get({ border: 1, h: "center", fmt: "pct" }), cBar = S.get({ border: 1, color: "2F6DB5" }), cAv = S.get({ border: 1, h: "center", color: "52606D" });
      for (let e = 0; e < k.antall; e++) {
        const b = 1 + e * H, r = R.first + e;
        const line = (row, label, c, bar) => {
          sh.set(row, 1, label, cL);
          sh.set(row, 2, { f: `IF(${src}$B$${r}="","",${src}${AA(c, r)})` }, cC);
          sh.set(row, 3, "av", cAv);
          sh.set(row, 4, { f: `${src}${AA(c, R.maks)}` }, cC);
          sh.set(row, 5, { f: `IF(AND(ISNUMBER(B${row}),D${row}>0),B${row}/D${row},"")` }, cP);
          if (bar) sh.set(row, 6, { f: `IF(ISNUMBER(E${row}),REPT("█",ROUND(E${row}*10,0)),"")` }, cBar);
        };
        const head = (row, t, bar) => { sh.set(row, 1, t, hL); sh.set(row, 2, "Poeng", hC); sh.set(row, 3, null, hC); sh.set(row, 4, "Maks", hC); sh.set(row, 5, "Prosent", hC); if (bar) sh.set(row, 6, null, hC); };
        sh.set(b, 1, "Vurdering: " + (test.navn || "Terminprøve"), big); sh.heights[b] = 24;
        sh.set(b + 1, 1, "Kandidatnummer", bold); sh.set(b + 1, 2, { f: `${src}$A$${r}` }, S.get({ b: 1, h: "left" }));
        sh.set(b + 2, 1, "Navn", bold); sh.set(b + 2, 2, { f: `IF(${src}$B$${r}="","",${src}$B$${r})` }, S.get({ b: 1, h: "left" }));
        head(b + 4, "Poeng", false);
        line(b + 5, "Del 1", C.del1); line(b + 6, "Del 2", C.del2); line(b + 7, "Totalt", C.tot);
        sh.set(b + 9, 1, "Karakter", S.get({ b: 1, sz: 14 })); sh.set(b + 9, 2, { f: `IF(${src}$B$${r}="","",${src}${AA(C.kar, r)})` }, kar); sh.heights[b + 9] = 30;
        head(b + 11, "Nivå", true);
        line(b + 12, "Lav", C.lav, 1); line(b + 13, "Middels", C.mid, 1); line(b + 14, "Høy", C.hoy, 1);
        cfP.push(`B${b + 12}:B${b + 14}`);
        head(b + 16, "Tema", true);
        temas.forEach((tm, i) => line(b + 17 + i, { f: `Oppsett!$A$${O.tema(i)}` }, C.tema(i), 1));
        if (K) cfP.push(`B${b + 17}:B${b + 16 + K}`);
        sh.set(b + 18 + K, 1, "Kommentar", bold);
        sh.set(b + 19 + K, 1, { f: `IF(${src}${AA(C.kom, r)}="","",${src}${AA(C.kom, r)})` }, S.get({ wrap: 1, v: "top", border: 1 }));
        for (let c = 2; c <= 6; c++) sh.set(b + 19 + K, c, null, S.get({ border: 1 }));
        sh.merge(b + 19 + K, 1, b + 19 + K, 6); sh.heights[b + 19 + K] = 70;
        if (e < k.antall - 1) sh.breaks.push(b + H - 1);
      }
      const f0 = "B13", m0 = "D13";
      sh.addCF(cfP.join(" "), [
        { f: `AND(ISNUMBER(${f0}),${m0}>0,${f0}<=0)`, dxf: DXF.red, stop: 1 },
        { f: `AND(ISNUMBER(${f0}),${m0}>0,ROUND(${f0},6)>=ROUND(${m0},6))`, dxf: DXF.green, stop: 1 },
        { f: `AND(ISNUMBER(${f0}),${m0}>0)`, dxf: DXF.yellow, stop: 1 },
      ]);
      return sh;
    });

    /* --- Egenvurdering (utskrift til elevene) --- */
    const ev = new Sheet("Egenvurdering"); ev.grid = false;
    ev.width(1, 1, 11); ev.width(2, 2, 8); ev.width(3, 3, 10); ev.width(4, 4, 40); ev.width(5, 5, 12);
    const eH = S.get({ b: 1, fill: fillS, border: 1, h: "center" }), eHL = S.get({ b: 1, fill: fillS, border: 1 });
    const eC = S.get({ border: 1, h: "center" }), eL = S.get({ border: 1, wrap: 1, sz: 10 }), eB = S.get({ border: 1 });
    ev.set(1, 1, "Egenvurdering: " + (test.navn || "Terminprøve"), S.get({ b: 1, sz: 14 })); ev.heights[1] = 24;
    ev.set(2, 1, "Kandidatnummer: ____________", S.get({ sz: 12 }));
    ev.set(3, 1, "Rett besvarelsen din under gjennomgangen, og skriv poengene dine i kolonnen til høyre.", S.get({ i: 1, color: "52606D" }));
    let er = 5;
    ev.set(er, 1, "Oppgave", eHL); ev.set(er, 2, "Maks", eH); ev.set(er, 3, "Nivå", eH); ev.set(er, 4, "Tema", eHL); ev.set(er, 5, "Mine poeng", eH); er++;
    const temaNavn = id => (temas.find(t => t.id === id) || {}).navn;
    let prevDel = 0;
    tasks.forEach(t => {
      if (t.del !== prevDel && hasDel1 && hasDel2) {
        for (let c = 1; c <= 5; c++) ev.set(er, c, c === 1 ? "Del " + t.del : null, S.get({ b: 1, fill: t.del === 2 ? fill2 : fill1, border: 1 }));
        ev.merge(er, 1, er, 5); er++;
      }
      prevDel = t.del;
      ev.set(er, 1, t.nr, S.get({ border: 1, b: 1 })); ev.set(er, 2, t.maks, eC); ev.set(er, 3, t.niva, eC);
      ev.set(er, 4, t.tema.map(temaNavn).filter(Boolean).join(", "), eL); ev.set(er, 5, null, eB);
      ev.heights[er] = 20; er++;
    });
    er++;
    ev.set(er, 1, "Oppsummering", S.get({ b: 1, sz: 12 })); er++;
    ev.set(er, 1, "", eHL); ev.set(er, 2, null, eHL); ev.set(er, 3, null, eHL); ev.merge(er, 1, er, 3); ev.set(er, 4, "Maks poeng", eH); ev.set(er, 5, "Mine poeng", eH); er++;
    const sumOf = f => Math.round(tasks.filter(f).reduce((a, t) => a + t.maks, 0) * 1000) / 1000;
    const sumRows = [["Del 1", sumOf(t => t.del === 1)], ["Del 2", sumOf(t => t.del === 2)], ["Totalt", sumOf(() => true)], ...NIVA.map(nv => ["Nivå: " + nv, sumOf(t => t.niva === nv)]), ...temas.map(tm => ["Tema: " + tm.navn, sumOf(t => t.tema.includes(tm.id))])];
    sumRows.forEach(([t, m]) => {
      ev.set(er, 1, t, eB); ev.set(er, 2, null, eB); ev.set(er, 3, null, eB); ev.merge(er, 1, er, 3);
      ev.set(er, 4, m, eC); ev.set(er, 5, null, eB); ev.heights[er] = 20; er++;
    });
    er++;
    ev.set(er, 1, "Karaktergrenser (poeng fra og med)", S.get({ b: 1, sz: 12 })); er++;
    [6, 5, 4, 3, 2, 1].forEach((g, i) => {
      ev.set(er, 1, "Karakter " + g, eB); ev.set(er, 2, { f: `Statistikk!$C$${5 + i}` }, S.get({ border: 1, h: "center", fmt: "d1" })); er++;
    });
    er++;
    ev.set(er, 1, "Min karakter: ______", S.get({ b: 1, sz: 14 })); ev.heights[er] = 28;

    /* --- pakk sammen --- */
    const sheets = [...classSheets, st, ...elevSheets, ev, ops];
    const files = [];
    const ct = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>', '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'];
    const wbRels = [], wbSheets = [];
    const sheetXml = sheets.map((sh, i) => sh.xml(i === 0));   // samler også stiler
    sheets.forEach((sh, i) => {
      const id = i + 1;
      files.push({ name: `xl/worksheets/sheet${id}.xml`, data: sheetXml[i] });
      ct.push(`<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
      wbRels.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${id}.xml"/>`);
      wbSheets.push(`<sheet name="${X(sh.name)}" sheetId="${id}" r:id="rId${id}"/>`);
      if (sh.chart) {
        files.push({ name: `xl/worksheets/_rels/sheet${id}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>` });
        files.push({ name: "xl/drawings/drawing1.xml", data: drawingXml(sh.chart.anchor) });
        files.push({ name: "xl/drawings/_rels/drawing1.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>` });
        files.push({ name: "xl/charts/chart1.xml", data: sh.chart.xml });
        ct.push('<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>', '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>');
      }
    });
    wbRels.push(`<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);
    const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    files.unshift(
      { name: "[Content_Types].xml", data: head + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join("")}</Types>` },
      { name: "_rels/.rels", data: head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", data: head + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000"/></bookViews><sheets>${wbSheets.join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels.join("")}</Relationships>` },
      { name: "xl/styles.xml", data: S.xml() },
    );
    return zip(files);
  }

  root.Retteskjema = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = root.Retteskjema;
})(typeof window !== "undefined" ? window : globalThis);
