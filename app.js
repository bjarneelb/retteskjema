(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : 0; };
  const fmt = n => String(Math.round(n * 100) / 100).replace(".", ",");
  const NIVA = ["Lav", "Middels", "Høy"];
  // Sorterer del 1 før del 2, og 2 før 10: tall sammenlignes som tall, bokstaver som tekst.
  const nrDeler = s => String(s == null ? "" : s).toLowerCase().trim().match(/\d+|\D+/g) || [];
  function cmpNr(a, b) {
    const A = nrDeler(a), B = nrDeler(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      const x = A[i], y = B[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      const tallX = /^\d/.test(x), tallY = /^\d/.test(y);
      if (tallX && tallY) { const d = parseInt(x, 10) - parseInt(y, 10); if (d) return d; }
      else if (tallX !== tallY) { return tallX ? -1 : 1; }
      else { const d = x.localeCompare(y, "nb"); if (d) return d; }
    }
    return 0;
  }
  const cmpOppg = (a, b) => (a.del - b.del) || cmpNr(a.nr, b.nr);
  const LS = "retteskjema.v1";
  const use = n => (window.claude && typeof window.claude.use === "function") ? window.claude.use(n).catch(() => null) : Promise.resolve(null);

  /* ---------- tilstand ---------- */
  function example() {
    const t = ["Tall og regning", "Brøk", "Algebra", "Likninger", "Praktiske oppgaver"].map(n => ({ id: uid(), navn: n }));
    const [tall, brok, alg, lik, prak] = t.map(x => x.id);
    const o = (nr, del, maks, fasit, niva, tema, tekst, losning) => ({ id: uid(), nr, del, maks, fasit, niva, tema, tekst: tekst || "", losning: losning || "", ok: !!losning });
    return {
      id: uid(), navn: "Terminprøve vår – 8. trinn", tema: t, grenser: [90, 70, 50, 30, 10],
      oppgaver: [
        o("1a", 1, 1, "-2", "Lav", [tall], "Regn ut: 3 − 5", "3 − 5 = −2 | Du starter på 3 og går 5 steg nedover på tallinja.\nSvar: −2"),
        o("1b", 1, 1, "-7", "Lav", [tall], "Regn ut: −2 − 5", "−2 − 5 = −7 | Du starter på −2 og går 5 steg til nedover.\nSvar: −7"),
        o("2", 1, 2, "1/3, 0,5, 3/4", "Middels", [tall, brok], "Sorter tallene fra minst til størst: 3/4, 1/3 og 0,5", "3/4 = 0,75 | Gjør om alle tallene til desimaltall, så blir de lette å sammenligne.\n1/3 ≈ 0,33 | Del 1 på 3.\n0,33 < 0,5 < 0,75 | Sorter desimaltallene fra minst til størst.\nSvar: 1/3, 0,5, 3/4"),
        o("3a", 1, 1, "1/2", "Lav", [brok], "Regn ut: 1/4 + 1/4", "1/4 + 1/4 = 2/4 | Nevnerne er like, så du legger bare sammen tellerne.\n2/4 = 1/2 | Forkort med 2: både teller og nevner deles på 2.\nSvar: 1/2"),
        o("3b", 1, 1, "14/15", "Middels", [brok], "Regn ut: 2/3 + 4/15", "2/3 = 10/15 | Felles nevner er 15, så du utvider den første brøken med 5.\n10/15 + 4/15 = 14/15 | Nå er nevnerne like, og du legger sammen tellerne.\nSvar: 14/15"),
        o("4a", 1, 1, "x+5y", "Lav", [alg], "Trekk sammen: x + 2y + 3y", "2y + 3y = 5y | Du kan bare trekke sammen ledd som har samme bokstav.\nx + 5y | x står alene, så det blir stående.\nSvar: x + 5y"),
        o("4b", 1, 1, "15x", "Høy", [alg], "Trekk sammen: 3x + 4(3x − 2x) + 2x·2", "3x − 2x = x | Regn ut inni parentesen først.\n4 · x = 4x | Gang tallet foran parentesen med det du fikk.\n2x · 2 = 4x | Gang sammen det siste leddet.\n3x + 4x + 4x = 11x | Legg sammen alle leddene med x.\nSvar: 11x"),
        o("5", 1, 2, "8a+6", "Middels", [alg], "Multipliser ut: 2(4a + 3)", "2 · 4a = 8a | Gang tallet foran parentesen med det første leddet inni.\n2 · 3 = 6 | Gang det samme tallet med det andre leddet.\n8a + 6 | Sett sammen de to svarene.\nSvar: 8a + 6"),
        o("6", 2, 2, "5, 9, 18", "Middels", [prak], "I en klasse er det 18 elever. Halvparten spiller fotball, og av disse spiller 5 også håndball. Hvor mange spiller fotball?", "18 : 2 = 9 | Halvparten av 18 finner du ved å dele på 2.\n | Svar med hele setninger når oppgaven spør om et antall elever.\nSvar: 9 spiller fotball"),
        o("7a", 2, 1, "x+25", "Lav", [lik], "Lisa er x år. Hennes mor er 25 år eldre. Skriv et uttrykk for morens alder.", "x + 25 | Moren er 25 år eldre, så du legger 25 til Lisas alder.\nSvar: x + 25"),
        o("7b", 2, 1, "45", "Middels", [lik, prak], "Til sammen er Lisa og moren 65 år. Hvor gammel er moren?", "x + (x + 25) = 65 | Sett opp en likning: begge aldrene til sammen er 65.\n2x + 25 = 65 | Trekk sammen de to x-ene.\n2x = 40 | Trekk 25 fra på begge sider av likhetstegnet.\nx = 20 | Del på 2 på begge sider. Dette er Lisas alder.\n20 + 25 = 45 | Moren er 25 år eldre enn Lisa.\nSvar: Moren er 45 år"),
        o("8", 2, 2, "s=2g+2", "Høy", [alg, prak], "I figur nummer 1 er det 4 sirkler, i figur 2 er det 6, og i figur 3 er det 8. Skriv et uttrykk for antall sirkler s i figur nummer g.", "4, 6, 8 | Se hvor mange flere sirkler det blir for hver figur: det øker med 2.\n2g | Når det øker med 2 hver gang, inneholder uttrykket 2 ganger figurnummeret.\n2 · 1 = 2 | Prøv med figur 1. Du får 2, men figuren har 4 sirkler.\ns = 2g + 2 | Du mangler 2, så legg til 2 i uttrykket.\nSvar: s = 2g + 2"),
      ],
    };
  }
  const blank = () => ({ id: uid(), navn: "", tema: [], grenser: [90, 70, 50, 30, 10], oppgaver: [] });
  let state = { test: example(), klasser: [{ id: uid(), navn: "8a", antall: 24 }], eksempel: true };
  try { const s = JSON.parse(localStorage.getItem(LS)); if (s && s.test && Array.isArray(s.test.oppgaver)) state = s; } catch (e) { }

  function clean(t) {   // gjør innlest prøve trygg å bruke
    const tema = (Array.isArray(t.tema) ? t.tema : []).map(x => ({ id: String(x.id || uid()), navn: String(x.navn || "").slice(0, 80) })).filter(x => x.navn);
    const ids = new Set(tema.map(x => x.id));
    return {
      id: /^[A-Za-z0-9_-]{4,40}$/.test(t.id || "") ? t.id : uid(), navn: String(t.navn || "").slice(0, 120), tema,
      grenser: Array.isArray(t.grenser) && t.grenser.length === 5 ? t.grenser.map(num) : [90, 70, 50, 30, 10],
      oppgaver: (Array.isArray(t.oppgaver) ? t.oppgaver : []).slice(0, 200).map(o => ({
        id: uid(), nr: String(o.nr == null ? "" : o.nr).slice(0, 12), del: Number(o.del) === 2 ? 2 : 1, maks: num(o.maks) || 1,
        fasit: String(o.fasit == null ? "" : o.fasit).slice(0, 120), niva: NIVA.includes(o.niva) ? o.niva : "Middels",
        tema: (Array.isArray(o.tema) ? o.tema : []).map(String).filter(x => ids.has(x)),
        tekst: String(o.tekst == null ? "" : o.tekst).slice(0, 1200), losning: String(o.losning == null ? "" : o.losning).slice(0, 3000), ok: !!o.ok,
        bilde: typeof o.bilde === "string" && o.bilde.startsWith("data:image/") ? o.bilde : "",
      })),
    };
  }

  const openRows = new Set();
  let saveT;
  let bildeAdvart = false;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(LS, JSON.stringify(state)); return; } catch (e) { }
      try {                                   // for stort: lagre uten utklippsbildene
        localStorage.setItem(LS, JSON.stringify({ ...state, test: { ...state.test, oppgaver: state.test.oppgaver.map(o => ({ ...o, bilde: "" })) } }));
        if (!bildeAdvart) { bildeAdvart = true; msg("msgAi", "Oppgavebildene er for store til å huskes her. De følger med i elevfilen og i prøvefilen, men forsvinner hvis du laster siden på nytt.", ""); }
      } catch (e) { }
    }, 300);
  }
  function msg(id, text, kind) { const el = $(id); el.textContent = text || ""; el.className = "msg" + (kind ? " " + kind : ""); }

  let undo = null;
  function replaceTest(t, label, eksempel) {
    undo = { test: state.test, eksempel: state.eksempel };
    state.test = t; state.eksempel = !!eksempel;
    $("undoText").textContent = label; $("undoBar").hidden = false;
    renderAll(); persist();
  }
  $("btnUndo").onclick = () => { if (!undo) return; state.test = undo.test; state.eksempel = undo.eksempel; undo = null; $("undoBar").hidden = true; renderAll(); persist(); };

  /* ---------- tegning ---------- */
  function renderTema() {
    const T = state.test;
    $("temaer").innerHTML = T.tema.length ? T.tema.map(t => {
      const p = T.oppgaver.filter(o => o.tema.includes(t.id));
      return `<span class="tema"><input type="text" id="tema-${t.id}" data-tema="${t.id}" value="${esc(t.navn)}" aria-label="Temanavn"><small>${p.length} oppg.</small><button type="button" class="icon" data-deltema="${t.id}" aria-label="Fjern tema ${esc(t.navn)}">✕</button></span>`;
    }).join("") : `<span class="note">Ingen tema ennå. Legg til de temaene prøven dekker.</span>`;
  }
  function rowHtml(o, i, n) {
    const T = state.test;
    const seg = (cls, field, vals, cur, lab) => `<span class="seg ${cls}" role="group" aria-label="${lab}">${vals.map(v => `<button type="button" data-set="${field}" data-v="${v[0]}" aria-pressed="${String(cur) === String(v[0])}">${v[1]}</button>`).join("")}</span>`;
    return `<tr data-id="${o.id}" class="d${o.del}">
      <td><input type="text" class="nr" id="nr-${o.id}" data-f="nr" value="${esc(o.nr)}" aria-label="Oppgavenummer" autocomplete="off"></td>
      <td>${seg("", "del", [[1, "1"], [2, "2"]], o.del, "Del")}</td>
      <td><input type="text" class="maks" id="maks-${o.id}" data-f="maks" value="${esc(fmt(o.maks))}" inputmode="decimal" aria-label="Maks poeng" autocomplete="off"></td>
      <td><input type="text" class="fasit" id="fasit-${o.id}" data-f="fasit" value="${esc(o.fasit)}" aria-label="Fasit" autocomplete="off"></td>
      <td>${seg("niva", "niva", NIVA.map(v => [v, v]), o.niva, "Nivå")}</td>
      <td><div class="chips">${T.tema.length ? T.tema.map(t => `<button type="button" class="chip" data-chip="${t.id}" aria-pressed="${o.tema.includes(t.id)}">${esc(t.navn)}</button>`).join("") : '<span class="note">Legg til tema i steg 2</span>'}</div></td>
      <td style="white-space:nowrap"><button type="button" class="st ${losStatus(o)[1]}" data-open="1" aria-expanded="${openRows.has(o.id)}">${losStatus(o)[0]}</button><button type="button" class="icon" data-move="-1" aria-label="Flytt opp" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" class="icon" data-move="1" aria-label="Flytt ned" ${i === n - 1 ? "disabled" : ""}>↓</button><button type="button" class="icon" data-del="1" aria-label="Slett oppgave ${esc(o.nr)}">✕</button></td></tr>`
      + (openRows.has(o.id) ? detailHtml(o) : "");
  }
  const losStatus = o => !o.losning ? ["Løsning mangler", "mangler"] : o.ok ? ["Løsning godkjent", "godkjent"] : ["Løsning utkast", "utkast"];
  function detailHtml(o) {
    return `<tr class="detail" data-id="${o.id}"><td colspan="7"><div class="det">
      <label class="f">Oppgavetekst, slik elevene ser den<textarea data-f="tekst" rows="3" placeholder="Skriv eller lim inn oppgaveteksten">${esc(o.tekst)}</textarea></label>
      ${o.bilde ? `<div class="utklipp"><img src="${o.bilde}" alt="Utklipp av oppgave ${esc(o.nr)}"><div class="row"><span class="note">Utklipp fra oppgavesettet. Elevene ser dette bildet.</span><button type="button" data-fjernbilde="1">Fjern bildet</button></div></div>` : ""}
      <label class="f">Løsningsforslag, ett steg per linje på formen <code>utregning | forklaring</code><textarea data-f="losning" rows="7" placeholder="3 − 5 = −2 | Du starter på 3 og går 5 steg nedover på tallinja.">${esc(o.losning)}</textarea></label>
      <div class="row">
        <button type="button" data-gen="1">${o.losning ? "Lag nytt forslag" : "Lag forslag"}</button>
        <label class="chk"><input type="checkbox" data-f="ok" ${o.ok ? "checked" : ""}> Godkjent av meg</label>
        <span class="note">Kontroller regnestykket. Forslaget kan inneholde feil.</span>
      </div></div></td></tr>`;
  }
  function renderTasks() {
    const os = state.test.oppgaver;
    $("tbody").innerHTML = os.length ? os.map((o, i) => rowHtml(o, i, os.length)).join("") : `<tr><td colspan="7" class="empty">Ingen oppgaver ennå. Legg til oppgaver under${sample ? ", eller les inn oppgavesettet" : ""}.</td></tr>`;
    renderLos();
  }
  function renderSummary() {
    const T = state.test, os = T.oppgaver, sum = f => os.filter(f).reduce((a, o) => a + num(o.maks), 0), tot = sum(() => true);
    $("tiles").innerHTML = [[os.length, "oppgaver"], [fmt(sum(o => o.del === 1)), "poeng del 1"], [fmt(sum(o => o.del === 2)), "poeng del 2"], [fmt(tot), "poeng totalt"]]
      .map(([b, s]) => `<div class="tile"><b>${b}</b><span>${s}</span></div>`).join("");
    const rows = [...NIVA.map(n => ["Nivå: " + n, sum(o => o.niva === n)]), ...T.tema.map(t => [t.navn, sum(o => o.tema.includes(t.id))])];
    $("bars").innerHTML = os.length ? rows.map(([l, p]) => `<span>${esc(l)}</span><span class="bar"><i style="width:${tot ? Math.min(100, p / tot * 100) : 0}%"></i></span><span>${fmt(p)} p</span>`).join("") : "";
    const w = [];
    const utenTema = os.filter(o => !o.tema.length).map(o => o.nr || "?");
    if (T.tema.length && utenTema.length) w.push("Uten tema: " + utenTema.join(", "));
    const tomme = T.tema.filter(t => !os.some(o => o.tema.includes(t.id))).map(t => t.navn);
    if (os.length && tomme.length) w.push("Tema uten oppgaver: " + tomme.join(", "));
    const seen = new Set(), dup = new Map();
    os.forEach(o => { const n = o.nr.trim(); if (!n) return; const k = o.del + "|" + n.toLowerCase(); if (seen.has(k)) dup.set(k, `${n} i del ${o.del}`); else seen.add(k); });
    if (dup.size) w.push("Samme oppgavenummer flere ganger i samme del: " + [...dup.values()].join(", "));
    if (os.some(o => !o.nr.trim())) w.push("Noen oppgaver mangler nummer.");
    [1, 2].forEach(del => {
      const tall = [...new Set(os.filter(o => o.del === del).map(o => parseInt(o.nr, 10)).filter(n => n > 0 && n < 100))];
      if (tall.length < 3) return;
      const hull = [];
      for (let n = Math.min(...tall); n < Math.max(...tall); n++) if (!tall.includes(n)) hull.push(n);
      if (hull.length && hull.length <= 12) w.push(`Hull i nummereringen i del ${del}: oppgave ${hull.join(", ")} mangler. Les gjennom oppgavesettet og legg dem inn.`);
    });
    if (os.some(o => !(num(o.maks) > 0))) w.push("Noen oppgaver har 0 poeng som maks.");
    const utenFasit = os.filter(o => !o.fasit.trim()).map(o => o.nr || "?");
    if (utenFasit.length && utenFasit.length < os.length) w.push("Uten fasit: " + utenFasit.join(", "));
    let seen2 = false; if (os.some(o => { if (o.del === 2) seen2 = true; return o.del === 1 && seen2; })) w.push("Del 1-oppgaver står etter del 2. I retteskjemaet sorteres del 1 først.");
    $("warns").innerHTML = w.map(x => `<div>${esc(x)}</div>`).join("");
    renderPrev();
    T.tema.forEach(t => { const el = $("tema-" + t.id); if (el) el.nextElementSibling.textContent = os.filter(o => o.tema.includes(t.id)).length + " oppg."; });
  }
  function renderPrev() {
    const os = state.test.oppgaver.slice().sort((a, b) => a.del - b.del).slice(0, 40);
    if (!os.length) { $("prev").innerHTML = `<tr><td class="dim">Legg til oppgaver for å se forhåndsvisning.</td></tr>`; return; }
    const c = o => "d" + o.del, n1 = os.filter(o => o.del === 1).length, n2 = os.length - n1;
    const demo = os.map((o, i) => i % 5 === 2 ? 0 : i % 4 === 1 ? num(o.maks) / 2 : num(o.maks));
    const cls = (v, o) => v <= 0 ? "r" : v >= num(o.maks) ? "g" : "y";
    $("prev").innerHTML =
      `<tr><th class="l"></th><th class="l"></th>${n1 ? `<th class="d1" colspan="${n1}">Del 1</th>` : ""}${n2 ? `<th class="d2" colspan="${n2}">Del 2</th>` : ""}<th class="s" colspan="3">Sum</th></tr>` +
      `<tr><th class="l">Kand.</th><th class="l">Navn</th>${os.map(o => `<th class="${c(o)}">${esc(o.nr)}</th>`).join("")}<th class="s">Totalt</th><th class="s">Prosent</th><th class="s">Karakter</th></tr>` +
      `<tr><td class="l"></td><td class="l">Fasit</td>${os.map(o => `<td class="fas">${esc(o.fasit)}</td>`).join("")}<td></td><td></td><td></td></tr>` +
      `<tr><td class="l"></td><td class="l">Maks poeng</td>${os.map(o => `<th>${fmt(num(o.maks))}</th>`).join("")}<th>${fmt(os.reduce((a, o) => a + num(o.maks), 0))}</th><th>100 %</th><th>6</th></tr>` +
      `<tr><td>1</td><td style="text-align:left">Eksempelelev</td>${os.map((o, i) => `<td class="${cls(demo[i], o)}">${fmt(demo[i])}</td>`).join("")}<td>${fmt(demo.reduce((a, b) => a + b, 0))}</td><td></td><td></td></tr>` +
      `<tr><td class="dim">2</td><td></td>${os.map(o => `<td class="dim">${fmt(num(o.maks))}</td>`).join("")}<td></td><td></td><td></td></tr>`;
  }
  function renderKlasser() {
    $("klasser").innerHTML = state.klasser.map((k, i) => `<div class="klasse" data-k="${k.id}">
      <label class="f">Klassenavn<input type="text" id="kn-${k.id}" data-kf="navn" value="${esc(k.navn)}" placeholder="f.eks. 8a" autocomplete="off"></label>
      <label class="f">Antall elever<input type="number" id="ka-${k.id}" data-kf="antall" min="1" max="200" value="${esc(k.antall)}"></label>
      ${state.klasser.length > 1 ? `<button type="button" class="icon" data-delk="1" aria-label="Fjern klasse">✕</button>` : "<span></span>"}</div>`).join("");
    $("grenser").innerHTML = [6, 5, 4, 3, 2].map((g, i) => `<label class="f">Karakter ${g}<input type="number" id="gr-${g}" data-gr="${i}" min="0" max="100" value="${esc(state.test.grenser[i])}"></label>`).join("");
  }
  function renderAll() {
    $("navn").value = state.test.navn;
    $("exBanner").hidden = !state.eksempel;
    renderTema(); renderTasks(); renderKlasser(); renderSummary(); settModusValg();
  }

  /* ---------- hendelser ---------- */
  const touched = () => { if (state.eksempel) { state.eksempel = false; $("exBanner").hidden = true; } persist(); };
  function sorter(tegnOpp) {
    state.test.oppgaver.sort(cmpOppg);
    if (tegnOpp) { renderTasks(); renderSummary(); }
  }
  $("navn").oninput = e => { state.test.navn = e.target.value; touched(); };
  const startNew = () => replaceTest(blank(), "Startet en ny tom prøve.");
  $("btnNew").onclick = startNew; $("btnNew2").onclick = startNew;

  $("temaForm").onsubmit = e => {
    e.preventDefault(); const v = $("nyttTema").value.trim(); if (!v) return;
    v.split(/[;,\n]+/).map(s => s.trim()).filter(Boolean).forEach(n => state.test.tema.push({ id: uid(), navn: n.slice(0, 80) }));
    $("nyttTema").value = ""; renderTema(); renderTasks(); renderSummary(); touched(); $("nyttTema").focus();
  };
  $("temaer").addEventListener("change", e => {
    const id = e.target.dataset.tema; if (!id) return;
    const t = state.test.tema.find(x => x.id === id); const v = e.target.value.trim();
    if (v) t.navn = v; else e.target.value = t.navn;
    renderTasks(); renderSummary(); touched();
  });
  $("temaer").addEventListener("click", e => {
    const id = e.target.dataset.deltema; if (!id) return;
    state.test.tema = state.test.tema.filter(t => t.id !== id);
    state.test.oppgaver.forEach(o => { o.tema = o.tema.filter(x => x !== id); });
    renderTema(); renderTasks(); renderSummary(); touched();
  });

  const task = el => { const tr = el.closest("tr[data-id]"); return tr && state.test.oppgaver.find(o => o.id === tr.dataset.id); };
  function setStatus(o) {
    const row = $("tbody").querySelector(`tr[data-id="${o.id}"]:not(.detail) button[data-open]`);
    if (row) { const [t, k] = losStatus(o); row.textContent = t; row.className = "st " + k; }
    renderLos();
  }
  $("tbody").addEventListener("input", e => {
    const o = task(e.target), f = e.target.dataset.f; if (!o || !f) return;
    o[f] = f === "maks" ? num(e.target.value) : e.target.value;
    if (f === "losning" || f === "tekst") { if (f === "losning") o.ok = false, (e.target.closest(".det").querySelector("[data-f=ok]").checked = false); setStatus(o); touched(); return; }
    renderSummary(); touched();
  });
  $("tbody").addEventListener("change", e => {
    const o = task(e.target); if (!o) return;
    if (e.target.dataset.f === "ok") { o.ok = e.target.checked; setStatus(o); touched(); return; }
    if (e.target.dataset.f === "nr") { sorter(true); touched(); }
  });
  $("tbody").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; const o = task(b); if (!o) return;
    const os = state.test.oppgaver, i = os.indexOf(o), tr = b.closest("tr");
    if (b.dataset.set) {
      o[b.dataset.set] = b.dataset.set === "del" ? Number(b.dataset.v) : b.dataset.v;
      b.parentNode.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      if (b.dataset.set === "del") { tr.className = "d" + o.del; sorter(true); renderSummary(); touched(); return; }
    } else if (b.dataset.chip) {
      const id = b.dataset.chip, on = !o.tema.includes(id);
      o.tema = on ? [...o.tema, id] : o.tema.filter(x => x !== id); b.setAttribute("aria-pressed", String(on));
    } else if (b.dataset.open) {
      if (openRows.has(o.id)) openRows.delete(o.id); else openRows.add(o.id);
      renderTasks(); return;
    } else if (b.dataset.fjernbilde) { o.bilde = ""; renderTasks(); touched(); return;
    } else if (b.dataset.gen) { lagLosninger([o], b); return;
    } else if (b.dataset.move) {
      const j = i + Number(b.dataset.move); if (j < 0 || j >= os.length) return;
      [os[i], os[j]] = [os[j], os[i]]; renderTasks();
    } else if (b.dataset.del) { os.splice(i, 1); openRows.delete(o.id); renderTasks(); }
    renderSummary(); touched();
  });
  $("tbody").addEventListener("keydown", e => {   // pil opp/ned flytter mellom rader i samme kolonne
    if ((e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") || !e.target.dataset.f) return;
    const tr = e.target.closest("tr"), nx = e.key === "ArrowUp" ? tr.previousElementSibling : tr.nextElementSibling;
    if (nx) { const el = nx.querySelector(`[data-f="${e.target.dataset.f}"]`); if (el) { e.preventDefault(); el.focus(); el.select(); } }
  });

  let addDel = 1;
  $("addDel").onclick = e => { const b = e.target.closest("button"); if (!b) return; addDel = Number(b.dataset.v); $("addDel").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); };
  $("addForm").onsubmit = e => {
    e.preventDefault();
    const names = $("addNr").value.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean); if (!names.length) { $("addNr").focus(); return; }
    const maks = num($("addMaks").value) || 1;
    names.slice(0, 100).forEach(nr => state.test.oppgaver.push({ id: uid(), nr: nr.slice(0, 12), del: addDel, maks, fasit: "", niva: "Middels", tema: [], tekst: "", losning: "", ok: false }));
    sorter(false);
    $("addNr").value = ""; renderTasks(); renderSummary(); touched(); $("addNr").focus();
  };

  $("klasser").addEventListener("input", e => {
    const row = e.target.closest("[data-k]"), f = e.target.dataset.kf; if (!row || !f) return;
    const k = state.klasser.find(x => x.id === row.dataset.k); k[f] = f === "antall" ? e.target.value : e.target.value; persist();
  });
  $("klasser").addEventListener("click", e => {
    if (!e.target.dataset.delk) return; const row = e.target.closest("[data-k]");
    state.klasser = state.klasser.filter(x => x.id !== row.dataset.k); renderKlasser(); persist();
  });
  $("btnSorter").onclick = () => { sorter(true); touched(); msg("msgProve", ""); };
  $("del2Form").onsubmit = e => {
    e.preventDefault();
    const v = $("del2Nr").value.trim().toLowerCase(), os = state.test.oppgaver;
    if (!v) { $("del2Nr").focus(); return; }
    const i = os.findIndex(o => o.nr.trim().toLowerCase() === v);
    if (i < 0) { msg("msgAi", `Fant ingen oppgave som heter ${v}.`, "err"); return; }
    let n = 0;
    for (let j = i; j < os.length; j++) if (os[j].del !== 2) { os[j].del = 2; n++; }
    sorter(true); touched(); $("del2Nr").value = "";
    msg("msgAi", `Flyttet ${n} ${n === 1 ? "oppgave" : "oppgaver"} til del 2.`, "ok");
  };
  $("btnAddKlasse").onclick = () => { state.klasser.push({ id: uid(), navn: "", antall: 24 }); renderKlasser(); persist(); const k = state.klasser[state.klasser.length - 1]; $("kn-" + k.id).focus(); };
  $("grenser").addEventListener("input", e => { const i = e.target.dataset.gr; if (i == null) return; state.test.grenser[i] = num(e.target.value); persist(); });

  /* ---------- nedlasting ---------- */
  let downloads = null;
  async function saveFile(filename, data, mime) {
    if (downloads) { await downloads.save({ filename, data: new Blob([data]) }); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const slug = s => (String(s || "").replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "_").slice(0, 60)) || "retteskjema";
  const dlError = e => e && e.code === "declined" ? "Nedlastingen ble avbrutt." : "Kunne ikke laste ned filen her. Åpne siden i Claude og prøv igjen.";

  $("btnXlsx").onclick = async () => {
    const T = state.test, err = [];
    if (!T.oppgaver.length) err.push("Legg til minst én oppgave.");
    if (T.oppgaver.some(o => !o.nr.trim())) err.push("Alle oppgaver må ha et nummer.");
    const ks = state.klasser.map(k => ({ navn: k.navn.trim(), antall: Math.round(num(k.antall)) }));
    if (ks.some(k => !k.navn)) err.push("Skriv inn klassenavn.");
    if (ks.some(k => !(k.antall >= 1 && k.antall <= 200))) err.push("Antall elever må være mellom 1 og 200.");
    const g = T.grenser.map(num);
    if (!g.every((x, i) => x > 0 && x <= 100 && (i === 0 || x < g[i - 1]))) err.push("Karaktergrensene må synke fra karakter 6 til 2.");
    if (err.length) { msg("msgXlsx", err.join(" "), "err"); return; }
    try {
      const bytes = window.Retteskjema.build({ ...T, grenser: g.map(x => x / 100) }, ks);
      const name = `Retteskjema_${slug(T.navn)}_${slug(ks.map(k => k.navn).join("-"))}.xlsx`;
      msg("msgXlsx", "Lager fil …");
      await saveFile(name, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      msg("msgXlsx", `Retteskjema for ${ks.map(k => `${k.navn} (${k.antall} elever)`).join(" og ")} er klart.`, "ok");
    } catch (e) { msg("msgXlsx", e && e.code ? dlError(e) : "Noe gikk galt: " + (e && e.message || e), "err"); }
  };

  const exportTest = () => { const t = JSON.parse(JSON.stringify(state.test)); return { format: "retteskjema-prove", versjon: 1, test: t }; };
  $("btnSaveFile").onclick = async () => {
    try { await saveFile(`Prove_${slug(state.test.navn)}.json`, JSON.stringify(exportTest(), null, 1), "application/json"); msg("msgProve", "Prøvefilen er lagret. Send den til kolleger som skal bruke samme prøve.", "ok"); }
    catch (e) { msg("msgProve", dlError(e), "err"); }
  };
  $("openFile").onchange = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const j = JSON.parse(await f.text()); const t = j && j.test ? j.test : j;
      if (!t || !Array.isArray(t.oppgaver)) throw 0;
      const c = clean(t); c.oppgaver.forEach((o, i) => { o.tema = (t.oppgaver[i].tema || []).filter(x => c.tema.some(y => y.id === x)); });
      replaceTest(c, `Åpnet «${c.navn || "prøve"}» fra fil.`); msg("msgProve", "");
    } catch (x) { msg("msgProve", "Filen er ikke en prøvefil fra denne siden.", "err"); }
  };

  /* ---------- delte prøver ---------- */
  let db = null, shared = [];
  function renderShared() {
    $("sharedList").innerHTML = shared.length ? shared.map(s => `<div data-s="${esc(s.id)}"><span class="n">${esc(s.navn || "Uten navn")}</span><small>${esc(s.antall)} oppgaver · ${esc((s.oppdatert || "").slice(0, 10))}</small><button type="button" data-open="1">Åpne</button><button type="button" class="icon" data-rm="1" aria-label="Slett delt prøve">✕</button></div>`).join("")
      : `<div><small>Ingen delte prøver ennå. Lagre prøven din med knappen over.</small></div>`;
  }
  async function initDb() {
    db = await use("db"); if (!db) return;
    $("btnShare").hidden = false; const box = $("sharedBox"); box.hidden = false; box.style.display = "flex";
    $("sharedList").innerHTML = `<div><small>Henter delte prøver …</small></div>`;
    const timer = setTimeout(() => { $("sharedList").innerHTML = `<div><small>Får ikke kontakt med delte prøver akkurat nå.</small></div>`; }, 10000);
    try {
      db.collection("prover").onSnapshot(snap => {
        clearTimeout(timer);
        shared = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) })).sort((a, b) => String(b.oppdatert || "").localeCompare(String(a.oppdatert || "")));
        renderShared();
      }, () => { clearTimeout(timer); $("sharedList").innerHTML = `<div><small>Delte prøver er ikke tilgjengelige i denne visningen.</small></div>`; });
    } catch (e) { clearTimeout(timer); }
  }
  $("btnShare").onclick = async () => {
    const T = state.test; if (!T.oppgaver.length) { msg("msgProve", "Legg til oppgaver før du deler prøven.", "err"); return; }
    if (!T.navn.trim()) { msg("msgProve", "Gi prøven et navn før du deler den.", "err"); $("navn").focus(); return; }
    $("btnShare").disabled = true;
    try {
      const utenBilder = { ...T, oppgaver: T.oppgaver.map(o => ({ ...o, bilde: "" })) };
      await db.doc("prover/" + T.id).set({ navn: T.navn, antall: T.oppgaver.length, oppdatert: new Date().toISOString(), test: JSON.parse(JSON.stringify(utenBilder)) });
      msg("msgProve", `«${T.navn}» er lagret i delte prøver.${T.oppgaver.some(o => o.bilde) ? " Utklippsbildene er ikke med, de er for store til å deles slik. Bruk prøvefil hvis kollegene skal ha dem." : ""}`, "ok");
    } catch (e) { msg("msgProve", "Kunne ikke lagre. Du trenger skrivetilgang til siden for å dele prøver.", "err"); }
    $("btnShare").disabled = false;
  };
  $("sharedList").addEventListener("click", async e => {
    const row = e.target.closest("[data-s]"); if (!row) return; const s = shared.find(x => x.id === row.dataset.s); if (!s) return;
    if (e.target.dataset.open) {
      const c = clean(s.test || {}); c.id = s.id;
      c.oppgaver.forEach((o, i) => { o.tema = ((s.test.oppgaver[i] || {}).tema || []).filter(x => c.tema.some(y => y.id === x)); });
      replaceTest(c, `Åpnet «${c.navn}» fra delte prøver.`); window.scrollTo({ top: 0 });
    } else if (e.target.dataset.rm) {
      if (e.target.dataset.rm === "1") { e.target.dataset.rm = "2"; e.target.textContent = "Slett?"; e.target.style.color = "var(--bad)"; return; }
      try { await db.doc("prover/" + s.id).delete(); } catch (x) { msg("msgProve", "Kunne ikke slette. Du trenger skrivetilgang.", "err"); }
    }
  });

  /* ---------- les inn oppgavesett med Claude ---------- */
  let sample = null, aiCtl = null;
  const iClaude = !!(window.claude && typeof window.claude.use === "function");
  function settAiStatus(tekst) {
    const av = !sample;
    $("aiFile").disabled = av;
    $("aiKnapp").classList.toggle("av", av);
    $("aiStatus").textContent = tekst != null ? tekst
      : !av ? "Claude leser dokumentet noen sider om gangen og foreslår oppgaver, poeng, nivå og tema. Et sett på 12 sider tar noen minutter. Du kontrollerer og retter etterpå."
        : iClaude ? "Claude svarte ikke da siden ble lastet, så innlesing er ikke tilgjengelig nå. Last siden på nytt, så kobler den til igjen."
          : "Denne utgaven kjører utenfor Claude, så innlesing av oppgavesett finnes ikke her. Legg inn oppgavene under, eller åpne en prøvefil du har fått.";
  }
  function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("script")); document.head.appendChild(s); }); }
  async function readPdf(file, wantImages, onPage) {
    if (!window.pdfjsLib) {
      const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
      await loadScript(base + "pdf.worker.min.js"); await loadScript(base + "pdf.min.js");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js";
    }
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const n = Math.min(pdf.numPages, 40), pages = [];
    for (let p = 1; p <= n; p++) {
      if (onPage) onPage(p, n);
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const text = tc.items.map(i => i.str + (i.hasEOL ? "\n" : " ")).join("").slice(0, 8000);
      let image = null, linjer = null, hoyde = 0, bredde = 0;
      if (wantImages) {
        const vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(2, 1300 / vp0.width) });
        const cv = document.createElement("canvas"); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
        image = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85));
        bredde = cv.width; hoyde = cv.height;
        linjer = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ s: it.str, y: vp.convertToViewportPoint(it.transform[4], it.transform[5])[1] }));
        cv.width = cv.height = 0;
      }
      pages.push({ n: p, text, images: image ? [image] : [], linjer, hoyde, bredde });
    }
    return { pages, truncated: pdf.numPages > n };
  }
  /* ----- Word (.docx) ----- */
  async function pakkUt(buf) {                      // leser zip-en uten eksternt bibliotek
    const dv = new DataView(buf), u8 = new Uint8Array(buf), td = new TextDecoder();
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("zip");
    const antall = dv.getUint16(eocd + 10, true), filer = new Map();
    let p = dv.getUint32(eocd + 16, true);
    for (let k = 0; k < antall; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const metode = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true),
        nLen = dv.getUint16(p + 28, true), eLen = dv.getUint16(p + 30, true), kLen = dv.getUint16(p + 32, true),
        lokal = dv.getUint32(p + 42, true);
      const navn = td.decode(u8.subarray(p + 46, p + 46 + nLen));
      const start = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true);
      const data = u8.subarray(start, start + csize);
      if (/^word\/(document\.xml|_rels\/document\.xml\.rels|media\/)/.test(navn)) {
        filer.set(navn, metode === 0 ? data : new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()));
      }
      p += 46 + nLen + eLen + kLen;
    }
    return filer;
  }
  function mattTekst(el) {                          // formler i Word (OMML) til vanlig skrivemåte
    const navn = el.localName, barn = [...el.children];
    const sammen = liste => liste.map(mattTekst).join("");
    const arg = n => { const d = barn.find(c => c.localName === n); return d ? sammen([...d.children]) : ""; };
    const pakk = t => /^[\wÆØÅæøå.,]+$/.test(t) || /^\(.*\)$/.test(t) ? t : "(" + t + ")";
    if (navn === "t") return el.textContent;
    if (navn === "f") return pakk(arg("num")) + "/" + pakk(arg("den"));
    if (navn === "sSup") return pakk(arg("e")) + "^" + arg("sup");
    if (navn === "sSub") return pakk(arg("e")) + "_" + arg("sub");
    if (navn === "rad") return "√" + pakk(arg("e"));
    if (navn === "d") return "(" + sammen(barn.filter(c => c.localName === "e")) + ")";
    return sammen(barn);
  }
  async function lesDocx(file, maksBilder) {
    const filer = await pakkUt(await file.arrayBuffer());
    const doc = filer.get("word/document.xml");
    if (!doc) throw new Error("docx");
    const xml = new DOMParser().parseFromString(new TextDecoder().decode(doc), "application/xml");
    const relXml = filer.get("word/_rels/document.xml.rels");
    const rel = new Map();
    if (relXml) for (const r of new DOMParser().parseFromString(new TextDecoder().decode(relXml), "application/xml").getElementsByTagName("Relationship"))
      rel.set(r.getAttribute("Id"), "word/" + String(r.getAttribute("Target") || "").replace(/^\.?\//, ""));
    const body = xml.getElementsByTagName("*");
    let kropp = null;
    for (const el of body) if (el.localName === "body") { kropp = el; break; }
    if (!kropp) throw new Error("docx");
    const blokker = [], GRENSE = 3500;
    let tekst = "", bilder = [], nr = 1;
    const lukk = () => { if (tekst.trim() || bilder.length) { blokker.push({ n: nr++, text: tekst.slice(0, 8000), images: bilder }); } tekst = ""; bilder = []; };
    const avsnitt = el => {
      let ut = "";
      for (const node of el.getElementsByTagName("*")) {
        const n = node.localName;
        if (n === "oMath") { ut += mattTekst(node) + " "; [...node.getElementsByTagName("*")].forEach(x => x.setAttribute("data-brukt", "1")); }
        else if (n === "t" && !node.closest("oMath") && !node.hasAttribute("data-brukt")) ut += node.textContent;
        else if (n === "tab") ut += "  ";
        else if (n === "br") ut += "\n";
        else if (n === "blip") {
          const sti = rel.get(node.getAttribute("r:embed") || node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed"));
          const data = sti && filer.get(sti);
          if (data && bilder.length < 6 && /\.(png|jpe?g|gif|webp)$/i.test(sti)) {
            ut += " [Figur " + (bilder.length + 1) + "] ";
            if (maksBilder) bilder.push(new Blob([data], { type: /\.png$/i.test(sti) ? "image/png" : /\.gif$/i.test(sti) ? "image/gif" : /\.webp$/i.test(sti) ? "image/webp" : "image/jpeg" }));
          }
        }
      }
      return ut;
    };
    let del2Nr = 0;
    for (const el of kropp.children) {
      if (el.localName === "p") {
        const ren = el.textContent.trim();
        if (!del2Nr && ren.length < 80 && (/^del\s*2\b/i.test(ren) || /^(oppgaver\s+)?med\s+(hjelpemidler|kalkulator)/i.test(ren))) { lukk(); del2Nr = nr; }
        tekst += avsnitt(el) + "\n";
      }
      else if (el.localName === "tbl") {
        tekst += "[Tabell]\n";
        for (const rad of el.children) if (rad.localName === "tr") tekst += [...rad.children].filter(c => c.localName === "tc").map(c => avsnitt(c).trim()).join(" | ") + "\n";
      }
      if (tekst.length > GRENSE) lukk();
      if (blokker.length >= 40) break;
    }
    lukk();
    return { pages: blokker, truncated: false, del2: del2Nr };
  }
  /* ----- klipp ut hver oppgave fra sidebildet ----- */
  const norm = t => String(t || "").toLowerCase().replace(/[\s.,:;()\-–—]/g, "");
  function finnLinje(pages, fraSide, nr, tekst) {
    const nrN = norm(nr), tekstN = norm(tekst).slice(0, 14);
    for (const p of pages) {
      if (p.n < fraSide || !p.linjer) continue;
      for (let k = 0; k < p.linjer.length; k++) {
        const l = norm(p.linjer[k].s);
        const treff = nrN && (l === nrN || l.startsWith(nrN) || l.startsWith("oppgave" + nrN));
        if (treff) return { side: p.n, y: p.linjer[k].y, sikker: true };
      }
      if (tekstN.length > 6) {
        let samlet = "", start = -1;
        for (let k = 0; k < p.linjer.length; k++) {
          samlet = (samlet + norm(p.linjer[k].s)).slice(-60);
          if (start < 0) start = k;
          if (samlet.includes(tekstN)) return { side: p.n, y: p.linjer[Math.max(0, k - 1)].y, sikker: false };
          if (samlet.length > 50) start = -1;
        }
      }
    }
    return null;
  }
  async function lagUtklipp(oppgaver, pages, melding) {
    if (!pages.some(p => p.linjer && p.images.length)) return 0;
    const treff = [];
    let side = 1;
    for (const o of oppgaver) {
      const t = finnLinje(pages, side, o.nr, o.tekst);
      if (t) { side = t.side; treff.push({ o, ...t }); } else treff.push({ o, side: 0 });
    }
    let laget = 0;
    for (const p of pages) {
      const pa = treff.filter(t => t.side === p.n).sort((a, b) => a.y - b.y);
      if (!pa.length || !p.images.length) continue;
      if (melding) melding(p.n, pages.length);
      let bitmap;
      try { bitmap = await createImageBitmap(p.images[0]); } catch (e) { continue; }
      for (let k = 0; k < pa.length; k++) {
        const topp = Math.max(0, pa[k].y - 26);
        const neste = pa[k + 1] ? pa[k + 1].y - 24 : p.hoyde - 30;
        const h = Math.min(neste, p.hoyde) - topp;
        if (h < 40) continue;
        const skala = Math.min(1, 900 / p.bredde);
        const cv = document.createElement("canvas");
        cv.width = Math.round(p.bredde * skala); cv.height = Math.round(h * skala);
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(bitmap, 0, topp, p.bredde, h, 0, 0, cv.width, cv.height);
        let slutt = cv.height;                      // trim bort tomt område nederst
        try {
          const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
          for (let y = cv.height - 1; y >= 0; y--) {
            let blekk = false;
            for (let x = 0; x < cv.width; x += 3) { const i = (y * cv.width + x) * 4; if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) { blekk = true; break; } }
            if (blekk) { slutt = Math.min(cv.height, y + 14); break; }
          }
        } catch (e) { }
        let ut = cv;
        if (slutt < cv.height - 8 && slutt > 30) {
          ut = document.createElement("canvas"); ut.width = cv.width; ut.height = slutt;
          const c2 = ut.getContext("2d"); c2.fillStyle = "#fff"; c2.fillRect(0, 0, ut.width, ut.height); c2.drawImage(cv, 0, 0);
        }
        pa[k].o.bilde = ut.toDataURL("image/jpeg", 0.7);
        cv.width = cv.height = 0; if (ut !== cv) { ut.width = ut.height = 0; }
        laget++;
      }
      bitmap.close && bitmap.close();
    }
    return laget;
  }
  const aiErr = c => ({ not_granted: "Du må tillate at siden bruker Claude for å lese inn oppgavesett.", rate_limited: "For mange forespørsler akkurat nå. Prøv igjen om litt.", refused: "Claude kunne ikke lese dette dokumentet.", invalid_json: "Svaret kunne ikke tolkes. Prøv igjen.", image_rejected: "Bildet kunne ikke leses. Prøv en annen fil.", cancelled: "Innlesingen ble stoppet." }[c] || "Innlesingen feilet. Prøv igjen, eller legg inn oppgavene manuelt.");
  function finnDel2Side(pages, erWord) {
    for (const p of pages) {
      if (p.n === 1 && !erWord) continue;                       // forsiden nevner ofte begge delene
      const t = (p.text || "").toLowerCase();
      if (/\bdel\s*1\b/.test(t)) continue;
      if (/\bdel\s*2\b/.test(t) || /med\s+hjelpemidler/.test(t) || /med\s+kalkulator/.test(t)) return p.n;
    }
    return 0;
  }
  let aiModus = "ny";
  function settModusValg() {
    const har = state.test.oppgaver.length > 0;
    $("aiModus").hidden = !har;
    if (!har) aiModus = "ny";
    $("aiModus").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === aiModus)));
  }
  $("aiModus").onclick = e => { const b = e.target.closest("button"); if (!b) return; aiModus = b.dataset.v; settModusValg(); };
  $("aiStop").onclick = () => aiCtl && aiCtl.abort();
  function chunkPrompt(part, total, temaNavn, lasteTema, funnet, sisteDel, forstePart, del2Side, enhet) {
    const E = enhet || "side", Ebest = E === "side" ? "siden" : "bolken", Ebestfl = E === "side" ? "sidene" : "bolkene";
    const fra = part[0].n, til = part[part.length - 1].n;
    const del2Hint = !del2Side ? ""
      : fra >= del2Side ? `Del 2 begynner i ${E} ${del2Side}, så ALLE oppgavene her hører til del 2. Sett del=2 på hver eneste av dem.`
        : til >= del2Side ? `Del 2 begynner i ${E} ${del2Side}. Oppgaver der og senere er del 2, oppgaver før er del 1.`
          : `Del 2 begynner først i ${E} ${del2Side}, så alle oppgavene her er del 1.`;
    const harBilde = part.some(p => p.images && p.images.length);
    const tekst = part.map(p => `\n--- ${E} ${p.n} ---\n${p.text}`).join("");
    const sisteNr = funnet.slice(-8).map(o => o.nr).join(", ");
    return `Du leser et oppgavesett til en terminprøve i matematikk for norsk ungdomsskole, side for side.
Dette er ${E.toUpperCase()} ${fra}${til > fra ? " til " + til : ""} av ${total}${harBilde ? ", med bilder av figurene som hører til" : ""}. Teksten under er hentet ut maskinelt og kan ha rot i formler og figurer${harBilde ? " – bildene gjelder foran teksten" : ""}.
Finn ALLE oppgaver og deloppgaver som står her, i den rekkefølgen de står. Ta med oppgaver som begynner helt på slutten, og ta med hver eneste deloppgave (a, b, c, d) – det er lett å hoppe over en. Ikke gjett på oppgaver du ikke ser.
Begynnelsen kan du ha sett før. Ta likevel med oppgavene der hvis de ikke står i listen under.
${funnet.length ? `Fra tidligere er disse allerede funnet: ${sisteNr}${funnet.length > 8 ? " (og " + (funnet.length - 8) + " til før dem)" : ""}. Ta ikke med de samme oppgavene en gang til. Hvis en oppgave som alt er funnet fortsetter her med nye deloppgaver, ta bare med de nye deloppgavene.` : ""}
Bruk ALLTID oppgavenummeret slik det står trykt i oppgavesettet. Du skal aldri fortsette nummereringen selv eller finne på nye numre. Del 2 begynner ofte på nytt med oppgave 1: står det 1a på den første oppgaven i del 2, skal den hete 1a, ikke et høyere tall.
Deloppgaver skrives som 1a, 1b; oppgaver uten deloppgaver som 2, 3.
Svar kun med JSON på denne formen:
{${forstePart ? '"navn":"kort navn på prøven",' : ""}"tema":["..."],"oppgaver":[{"nr":"1a","del":${sisteDel},"maks":1,"fasit":"-2","niva":"Lav","tema":["..."],"tekst":"Regn ut 3 - 5"}]}
Regler:
- tekst: oppgaveteksten ordrett, uten oppgavenummeret. Har oppgaven en figur, tabell eller graf, beskriv den kort i hakeparenteser til slutt, for eksempel [Figur: rektangel med sidene 4 cm og 7 cm]. Høyst 300 tegn.
- del: 1 for delen uten hjelpemidler, 2 for delen med hjelpemidler (kalkulator). ${del2Hint || `Forrige ${E} var i del ${sisteDel}. Bruk ${sisteDel} til du ser en overskrift som «Del 2», «Med hjelpemidler» eller «Med kalkulator»; fra og med den overskriften er alle oppgaver del 2.`}
- maks: poeng slik det står i oppgavesettet. Står det ikke, bruk 1 for korte oppgaver og 2 for større.
- fasit: BARE hvis svaret står trykt i dokumentet, for eksempel i en fasit- eller løsningsdel. Du skal ikke regne ut oppgaven selv her. Står ikke svaret der, skriv tom streng.
- niva: "Lav", "Middels" eller "Høy", vurdert for trinnet.
- tema: ${lasteTema
        ? `bruk bare disse temaene, skrevet nøyaktig slik: ${JSON.stringify(temaNavn)}. Sett "tema" øverst til den samme listen.`
        : temaNavn.length
          ? `bruk temaene fra tidligere sider der de passer, skrevet nøyaktig slik: ${JSON.stringify(temaNavn)}. Legg bare til et nytt tema hvis ingen av dem passer. Sett "tema" øverst til listen du har brukt, nye inkludert.`
          : `foreslå tema ut fra læreplanen i matematikk, og bruk bare dem. Sett "tema" øverst til listen du har brukt.`} En oppgave kan ha flere tema.

Teksten:${tekst}`;
  }

  $("aiFile").onchange = async e => {
    const file = e.target.files[0]; e.target.value = ""; if (!file || !sample) return;
    aiCtl = new AbortController(); $("aiStop").hidden = false;
    try {
      const lim = await sample.limits().catch(() => null), maxImg = lim && lim.images ? lim.images.maxCount : 0;
      let pages = [], avkuttet = false, erWord = false, wordDel2 = 0;
      if (/\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        erWord = true;
        msg("msgAi", "Pakker opp Word-filen …");
        try { const r = await lesDocx(file, maxImg); pages = r.pages; wordDel2 = r.del2; }
        catch (x) { msg("msgAi", "Filen kunne ikke leses som Word-dokument. Er det en gammel .doc-fil, må du lagre den som .docx eller PDF først.", "err"); return; }
        if (!pages.length) { msg("msgAi", "Fant ingen tekst i Word-dokumentet.", "err"); return; }
      } else if (/\.docx?$/i.test(file.name) || /\.(odt|rtf|pages)$/i.test(file.name)) {
        msg("msgAi", "Dette filformatet kan ikke leses her. Lagre dokumentet som .docx eller PDF, og prøv igjen.", "err"); return;
      } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        msg("msgAi", "Gjør klar PDF-en …");
        const r = await readPdf(file, maxImg > 0, (p, n) => msg("msgAi", `Gjør klar side ${p} av ${n} …`));
        pages = r.pages; avkuttet = r.truncated;
        const tekstMengde = pages.reduce((a, p) => a + p.text.replace(/\s|\d/g, "").length, 0);
        if (!maxImg && tekstMengde < 80) { msg("msgAi", "PDF-en er skannet uten tekst og kan ikke leses i denne visningen.", "err"); return; }
      } else {
        if (!maxImg) { msg("msgAi", "Bilder kan ikke leses i denne visningen. Last opp en PDF med tekst.", "err"); return; }
        pages = [{ n: 1, text: "", image: file }];
      }
      if (!pages.length) { msg("msgAi", "Fant ingen sider i filen.", "err"); return; }

      const T = state.test, lasteTema = T.tema.length > 0, modus = T.oppgaver.length ? aiModus : "ny";
      let tema = lasteTema ? T.tema.map(t => ({ ...t })) : [];
      const byName = new Map(tema.map(t => [t.navn.toLowerCase(), t.id]));
      const funnet = [], settNr = new Set(), del2Side = wordDel2 || finnDel2Side(pages, erWord);
      let navn = "", sisteDel = 1, stoppetPa = 0, feil = null;
      const CH = Math.max(1, Math.min(maxImg || 3, 3)), STEG = CH >= 3 ? CH - 1 : CH;   // overlapp én side når bolken er stor nok

      const grense = del2Side ? pages.findIndex(p => p.n >= del2Side) : -1;
      for (let i = 0; i < pages.length;) {
        let slutt = Math.min(i + CH, pages.length);
        if (grense > i && grense < slutt) slutt = grense;        // la aldri en bolk krysse skillet mellom del 1 og del 2
        const part = pages.slice(i, slutt), fra = part[0].n, til = part[part.length - 1].n;
        const tvungenDel = del2Side ? (fra >= del2Side ? 2 : 1) : 0;
        const nesteI = slutt < i + CH ? slutt : i + STEG;
        msg("msgAi", `Leser ${erWord ? "bolk" : "side"} ${fra}${til > fra ? "–" + til : ""} av ${pages.length} … ${funnet.length} oppgaver funnet hittil. Dette tar litt tid.`);
        let r;
        try {
          const opts = { signal: aiCtl.signal, cache: false };
          const bilder = part.flatMap(p => p.images || []).slice(0, maxImg);
          if (bilder.length) opts.images = bilder;
          r = await sample.json(chunkPrompt(part, pages.length, tema.map(t => t.navn), lasteTema, funnet, sisteDel, i === 0, del2Side, erWord ? "bolk" : "side"), opts);
        } catch (x) {
          if (x && x.code === "cancelled") throw x;
          feil = x; stoppetPa = fra; break;
        }
        const erForste = i === 0;
        i = nesteI;
        if (r) {
        if (erForste && r.navn) navn = String(r.navn).slice(0, 120);
        if (!lasteTema) for (const nv of (Array.isArray(r.tema) ? r.tema : [])) {
          const s = String(nv).slice(0, 80).trim(), k = s.toLowerCase();
          if (s && !byName.has(k) && tema.length < 24) { const t = { id: uid(), navn: s }; tema.push(t); byName.set(k, t.id); }
        }
        for (const o of (Array.isArray(r.oppgaver) ? r.oppgaver : [])) {
          const nr = String(o && o.nr != null ? o.nr : "").trim().slice(0, 12);
          if (!nr || funnet.length >= 300) continue;
          sisteDel = tvungenDel || (Number(o.del) === 2 ? 2 : sisteDel);
          const k = sisteDel + "|" + nr.toLowerCase();   // del 2 kan begynne på oppgave 1 igjen
          if (settNr.has(k)) continue;
          settNr.add(k);
          funnet.push({ nr, del: sisteDel, maks: o.maks, fasit: o.fasit, niva: o.niva, tekst: o.tekst, temaNavn: Array.isArray(o.tema) ? o.tema : [] });
        }
        }
        if (slutt >= pages.length) break;
      }

      if (!funnet.length) { msg("msgAi", feil ? aiErr(feil.code) : "Fant ingen oppgaver i dokumentet.", "err"); return; }
      if (modus === "del2") funnet.forEach(o => { o.del = 2; });
      const nt = clean({ id: T.id, navn: T.navn || navn, tema, grenser: T.grenser, oppgaver: funnet });
      nt.oppgaver.forEach((o, i) => { o.tema = [...new Set(funnet[i].temaNavn.map(nv => byName.get(String(nv).toLowerCase().trim())).filter(Boolean))]; });
      if (pages.some(p => p.linjer)) {
        msg("msgAi", "Klipper ut bilde av hver oppgave …");
        await lagUtklipp(nt.oppgaver, pages, (p, n) => msg("msgAi", `Klipper ut bilder fra side ${p} av ${n} …`));
      }
      let lagtTil = nt.oppgaver.length;
      if (modus !== "ny") {                       // behold det som alt står i listen
        const fins = new Set(T.oppgaver.map(o => o.del + "|" + o.nr.trim().toLowerCase()));
        const nye = nt.oppgaver.filter(o => !fins.has(o.del + "|" + o.nr.trim().toLowerCase()));
        lagtTil = nye.length;
        nt.oppgaver = T.oppgaver.concat(nye);
      }
      nt.oppgaver.sort(cmpOppg);
      const sider = (stoppetPa ? ` Stoppet på ${erWord ? "bolk" : "side"} ${stoppetPa}.` : avkuttet ? " Bare de 40 første sidene ble lest." : "")
        + (del2Side ? ` Del 2 ble funnet fra ${erWord ? "bolk" : "side"} ${del2Side}.` : nt.oppgaver.every(o => o.del === 1) ? " Alle oppgavene ble lagt i del 1. Har prøven en del 2, bruk «Del 2 fra og med» under listen." : "");
      const utklipp = nt.oppgaver.filter(o => o.bilde).length;
      replaceTest(nt, modus === "ny" ? `Claude foreslo ${nt.oppgaver.length} oppgaver. Kontroller poeng, fasit, nivå og tema.` : `La til ${lagtTil} oppgaver fra ${file.name}.`);
      msg("msgAi", `${modus === "ny" ? `Leste inn ${nt.oppgaver.length}` : `La til ${lagtTil}`} oppgaver fra ${stoppetPa ? stoppetPa - 1 : pages.length} ${erWord ? "bolker" : "sider"}.${sider}${utklipp ? ` ${utklipp} av oppgavene har utklippsbilde.` : ""} Dette er et forslag – gå gjennom listen før du lager retteskjema.${feil ? " (" + aiErr(feil.code) + ")" : ""}`, feil || stoppetPa ? "" : "ok");
    } catch (x) {
      if (x && x.code && ["sampling_disabled", "not_declared", "capability_disabled"].includes(x.code)) { sample = null; settAiStatus("Innlesing er ikke tilgjengelig i denne visningen. Legg inn oppgavene manuelt."); }
      msg("msgAi", x && x.code ? aiErr(x.code) : "Kunne ikke lese filen. Prøv en annen fil, eller legg inn oppgavene manuelt.", "err");
    } finally { $("aiStop").hidden = true; aiCtl = null; }
  };

  /* ---------- løsningsforslag ---------- */
  let genCtl = null;
  function renderLos() {
    const os = state.test.oppgaver, med = os.filter(o => o.losning).length, ok = os.filter(o => o.ok).length, utenTekst = os.filter(o => !o.tekst.trim()).length;
    $("losTall").innerHTML = !os.length ? "Legg til oppgaver først."
      : `<b>${med}</b> av <b>${os.length}</b> oppgaver har løsningsforslag, <b>${ok}</b> er godkjent av deg.`
      + (utenTekst ? ` <b>${utenTekst}</b> mangler oppgavetekst.` : "")
      + (sample ? "" : iClaude ? " Claude er ikke tilgjengelig nå, så forslag må skrives for hånd." : " Denne utgaven kjører utenfor Claude, så forslagene må lages i Claude-utgaven, eller skrives for hånd i panelet under hver oppgave.");
    $("btnGenAlle").disabled = !sample || !os.length;
    $("btnElevfil").disabled = !os.length;
  }
  function stegTilTekst(steg, fasit) {
    const linjer = (Array.isArray(steg) ? steg : []).map(st => {
      const u = String(st && st.utregning || "").trim().replace(/\s*\|\s*/g, " "), f = String(st && st.forklaring || "").trim().replace(/\s*\|\s*/g, " ");
      return u && f ? u + " | " + f : (u || f);
    }).filter(Boolean);
    if (!linjer.length) return "";
    if (fasit && !linjer.some(l => /^svar\s*:/i.test(l))) linjer.push("Svar: " + fasit);
    return linjer.join("\n");
  }
  function temaNavnFor(o) { return o.tema.map(id => (state.test.tema.find(t => t.id === id) || {}).navn).filter(Boolean); }
  async function lagLosninger(liste, knapp) {
    if (!sample) { msg("msgLos", "Claude er ikke tilgjengelig i denne visningen. Skriv løsningsforslagene selv.", "err"); return; }
    if (genCtl) { msg("msgLos", "Vent til den forrige kjøringen er ferdig.", "err"); return; }
    const jobb = liste.filter(o => o.nr.trim());
    if (!jobb.length) { msg("msgLos", "Ingen oppgaver å lage forslag til.", "err"); return; }
    genCtl = new AbortController(); $("btnGenStop").hidden = false; if (knapp) knapp.disabled = true;
    const CH = 3, ferdige = new Set(); let laget = 0, nyFasit = 0, feil = null;
    try {
      for (let i = 0; i < jobb.length; i += CH) {
        const del = jobb.slice(i, i + CH);
        msg("msgLos", `Lager løsningsforslag … ${laget} av ${jobb.length} ferdig. Dette tar litt tid.`);
        const data = del.map(o => ({ nr: o.nr, maks: o.maks, fasit: o.fasit, niva: o.niva, tema: temaNavnFor(o), tekst: o.tekst }));
        let r;
        try {
          r = await sample.json(`Du er mattelærer på norsk ungdomsskole og skriver løsningsforslag som elevene selv skal bruke når de retter sin egen besvarelse etter en terminprøve.
Skriv ett løsningsforslag for hver oppgave under.
Løsningen skal deles i korte steg, slik regneapper som Photomath gjør det: eleven henter fram ett steg om gangen.
Svar kun med JSON: {"losninger":[{"nr":"1a","steg":[{"utregning":"3 − 5 = −2","forklaring":"Du starter på 3 og går 5 steg nedover på tallinja."}],"fasit":"-2"}]}
Krav til hvert steg:
- Ett steg er én ting som skjer. Slå aldri sammen flere regneoperasjoner i samme steg, og hopp aldri over et mellomregnestykke.
- "utregning": bare selve matematikken på den linja, ført slik eleven skal føre den. Ingen forklarende ord her. Er steget et resonnement uten regning, for eksempel å sette opp en likning eller lese av en figur, skriv uttrykket du setter opp, eller la feltet stå tomt.
- "forklaring": én kort setning i du-form som sier hva du gjør og hvorfor. Bruk ord eleven kjenner fra ungdomsskolen, og nevn regelen når det finnes en, for eksempel felles nevner, gange inn i parentesen, eller flytte over likhetstegnet og bytte fortegn.
- Vanligvis 2 til 6 steg. En helt enkel oppgave kan ha 1 steg. Aldri mer enn 8.
- Bruk norsk desimalkomma, og vanlige tegn som eleven kjenner.
- Er oppgaven verdt mer enn 1 poeng, legg til et siste steg der "utregning" er tom og "forklaring" sier hva eleven må ha med av utregning eller forklaring for å få full uttelling.
- Mangler oppgaveteksten, eller er den så uklar at du må gjette: svar med ett steg der "utregning" er tom og "forklaring" er "Oppgaveteksten mangler, så her må læreren fylle inn.", og tom streng som fasit.
- Regn oppgaven ut nøye, og regn den etter en gang til før du svarer. Oppgaver med figur eller flere steg er lette å regne feil på.
- fasit: bare det endelige svaret, kort, med norsk desimalkomma. Det skal være det samme som det siste steget ender på. Er du i tvil om du har forstått oppgaven riktig, skriv tom streng som fasit og legg til et siste steg som sier "Dette er jeg usikker på – kontroller oppgaven."
- Er det alt lagt inn en fasit nedenfor og den ikke stemmer med din egen utregning: behold den fasiten som står der, følg din egen utregning i stegene, og legg til et siste steg som sier "Merk: dette stemmer ikke med fasiten som er lagt inn."
Oppgavene:
${JSON.stringify(data, null, 1)}`, { signal: genCtl.signal, cache: false, modelTier: "complex" });
        } catch (x) { if (x && x.code === "cancelled") throw x; feil = x; break; }
        for (const l of (r && Array.isArray(r.losninger) ? r.losninger : [])) {
          const o = del.find(o2 => o2.nr.trim().toLowerCase() === String(l && l.nr || "").trim().toLowerCase());
          if (!o || ferdige.has(o.id)) continue;
          const tekst = (l.steg ? stegTilTekst(l.steg, l.fasit) : String(l.losning || "").trim()).slice(0, 3000);
          if (!tekst) continue;
          o.losning = tekst; o.ok = false; ferdige.add(o.id); laget++;
          const f = String(l.fasit == null ? "" : l.fasit).trim().slice(0, 120);
          if (f && f !== o.fasit) { o.fasit = f; nyFasit++; }
        }
      }
    } catch (x) { feil = x; }
    genCtl = null; $("btnGenStop").hidden = true; if (knapp) knapp.disabled = false;
    renderTasks(); persist();
    msg("msgLos", laget ? `Laget ${laget} løsningsforslag${nyFasit ? `, og fylte inn fasit på ${nyFasit} av dem` : ""}. Les gjennom hvert av dem og huk av for godkjent.${feil ? " (" + aiErr(feil.code) + ")" : ""}`
      : (feil ? aiErr(feil.code) : "Ingen forslag ble laget."), laget && !feil ? "ok" : laget ? "" : "err");
  }
  $("btnGenStop").onclick = () => genCtl && genCtl.abort();
  $("btnGenAlle").onclick = () => lagLosninger(state.test.oppgaver.filter(o => !o.losning), null);
  $("btnGenMangler").onclick = () => lagLosninger(state.test.oppgaver, null);

  $("btnElevfil").onclick = async () => {
    const T = state.test, os = T.oppgaver;
    if (!os.length) { msg("msgElev", "Legg til oppgaver først.", "err"); return; }
    if (!window.ELEV_MAL) { msg("msgElev", "Malen for elevfilen kunne ikke lastes. Last siden på nytt.", "err"); return; }
    const data = {
      id: T.id, navn: T.navn || "Terminprøve", grenser: T.grenser.map(num), tema: T.tema.map(t => t.navn),
      oppgaver: os.slice().sort(cmpOppg).map(o => ({ nr: o.nr, del: o.del, maks: num(o.maks), fasit: o.fasit, niva: o.niva, tema: temaNavnFor(o), tekst: o.tekst, losning: o.losning, bilde: o.bilde })),
    };
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    const html = window.ELEV_MAL
      .replace(/(<script id="data" type="application\/json">)[\s\S]*?(<\/script>)/, (m, a, b) => a + json + b)
      .replace("<title>Egenvurdering</title>", `<title>Egenvurdering – ${esc(data.navn)}</title>`);
    try {
      msg("msgElev", "Lager elevfil …");
      await saveFile(`Egenvurdering_${slug(data.navn)}.html`, html, "text/html");
      const uten = os.filter(o => !o.losning).length;
      msg("msgElev", `Elevfilen er klar. Del den i Teams, og be elevene laste den ned og åpne den.${uten ? ` ${uten} oppgaver er uten løsningsforslag.` : ""}`, "ok");
    } catch (e) { msg("msgElev", dlError(e), "err"); }
  };

  /* ---------- start ---------- */
  renderAll();
  use("downloads").then(d => { downloads = d; });
  use("sample").then(s => { sample = s; settAiStatus(); if (s && !state.test.oppgaver.length) renderTasks(); renderLos(); });
  initDb();
})();
