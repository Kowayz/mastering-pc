'use strict';

/* ════════════════════════════════════════════════════════════
   MASTERING PC — moteur (3 dispositions + jauge à segments)
   • Vue au choix : Rangées / Mini-cartes / Tableau (mémorisée)
   • Chrono AUTO au 1er segment validé, stop au « Terminé »
   • Multi-PC en parallèle, historique, persistance localStorage
   ════════════════════════════════════════════════════════════ */

const STEPS = [
  'Boot menu', 'Windows', 'Hash', 'Autopilote',
  'Synchro / Renommage', 'Windows Update / MAJ BIOS',
];

const PALETTE = [
  ['#f0b54a', '#f7cd7a'], ['#f07d6a', '#f6a08f'], ['#3fd0bf', '#6fe0d2'], ['#7fb0f5', '#a3c8f8'],
  ['#f08ab0', '#f6abc7'], ['#b59cf2', '#cbb8f6'], ['#5fd699', '#85e2b1'], ['#e6c84a', '#f0d877'],
];

const VIEWS = ['rows', 'mini', 'table'];
const KEY = 'mastering.app.v6';

// ── persistance ────────────────────────────────────────────────
function load() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {} return null; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

// ── helpers ────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function fmt(ms) { const t = Math.max(0, Math.floor(ms / 1000)); const p = (n) => String(n).padStart(2, '0'); return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`; }
function elapsed(pc) { const live = (pc.status === 'running' && pc.startedAt) ? Date.now() - pc.startedAt : 0; return pc.acc + live; }
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function meta(pc) { return { cur: pc.steps.findIndex((s) => !s.done), d: pc.steps.filter((s) => s.done).length }; }
function stepText(pc) { const { cur } = meta(pc); return cur === -1 ? '✓ Toutes les étapes faites' : `Étape ${cur + 1} · ${pc.steps[cur].label}`; }
function isToday(ts) { const d = new Date(ts), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }
function clk(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`; }

// ── démo (1re visite) ──────────────────────────────────────────
function mkPc(name, accIdx, doneCount, runMsAgo) {
  return {
    id: uid(), name, status: runMsAgo != null ? 'running' : 'idle',
    acc: 0, startedAt: runMsAgo != null ? Date.now() - runMsAgo : null,
    firstStartedAt: runMsAgo != null ? Date.now() - runMsAgo : null,
    accent: PALETTE[accIdx % PALETTE.length],
    steps: STEPS.map((label, i) => ({ label, done: i < doneCount })), createdAt: Date.now(),
  };
}
function seed() {
  const m = 60000;
  const hh = (name, ai, dur, ago) => { const fin = Date.now() - ago * m; return { name, totalMs: dur * m, stepsDone: 6, stepsTotal: 6, startedAt: fin - dur * m, finishedAt: fin, accent: PALETTE[ai] }; };
  return {
    seed: 4, view: 'rows',
    pcs: [ mkPc('PCP2612', 0, 5, 23 * m), mkPc('PCP2615', 1, 6, 47 * m), mkPc('PCP2617', 3, 2, 8 * m), mkPc('PCP2614', 2, 0, null) ],
    history: [
      hh('PCP2609', 0, 41, 70), hh('PCP2608', 4, 38, 150), hh('PCP2605', 2, 52, 240),
      hh('PCP2603', 1, 47, 26 * 60), hh('PCP2602', 5, 33, 27 * 60), hh('PCP2531', 6, 58, 28 * 60),
      hh('PCP2528', 3, 61, 50 * 60), hh('PCP2524', 7, 29, 51 * 60), hh('PCP2519', 0, 44, 74 * 60),
    ],
  };
}

let store = load() || seed();
if (!VIEWS.includes(store.view)) store.view = 'rows';

// ── refs ───────────────────────────────────────────────────────
const board = document.getElementById('board');
const emptyEl = document.getElementById('empty');
const histSec = document.getElementById('history');
const histList = document.getElementById('historyList');
const histSummary = document.getElementById('historySummary');
const counter = document.getElementById('counter');
const counterNum = document.getElementById('counterNum');
const counterTotal = document.getElementById('counterTotal');
const switchBtns = Array.from(document.querySelectorAll('.viewswitch button'));

const cards = new Map();   // id -> { node, timeEl, sync }

// ── briques partagées ──────────────────────────────────────────
function segsFor(pc) {
  const wrap = el(`<div class="gauge__segs"></div>`);
  pc.steps.forEach((s, i) => {
    const b = el(`<button class="seg" type="button"></button>`);
    b.title = s.label;
    b.addEventListener('click', () => toggleStep(pc, i));
    wrap.appendChild(b);
  });
  return { wrap, segs: [...wrap.children] };
}
function applyAccent(node, pc) { node.style.setProperty('--accent', pc.accent[0]); node.style.setProperty('--accent-deep', pc.accent[1]); }
function wireName(node, pc) {
  const i = node.querySelector('.card__name');
  i.value = pc.name; i.setAttribute('value', pc.name);
  i.addEventListener('input', () => { pc.name = i.value; i.setAttribute('value', pc.name); persist(); });
}
function wireButtons(node, pc) {
  node.querySelector('.card__del').addEventListener('click', () => deletePc(pc));
  node.querySelector('.js-finish').addEventListener('click', () => finishPc(pc));
  const p = node.querySelector('.js-pause');
  if (p) p.addEventListener('click', () => pauseToggle(pc));
}
function register(pc, node, refs) {
  const pauseBtn = node.querySelector('.js-pause');
  const pauseIco = node.querySelector('.js-pause-ico');
  function sync() {
    const { d } = meta(pc);
    refs.segs.forEach((b, i) => b.classList.toggle('done', pc.steps[i].done));
    if (refs.countEl) refs.countEl.textContent = refs.countSuffix ? `${d} / ${pc.steps.length} étapes` : `${d} / ${pc.steps.length}`;
    if (refs.stepEl) refs.stepEl.textContent = stepText(pc);
    if (refs.statusEl) refs.statusEl.textContent = pc.status === 'running' ? 'En cours' : pc.status === 'paused' ? 'En pause' : 'À démarrer';
    refs.timeEl.textContent = fmt(elapsed(pc));
    node.classList.toggle('is-running', pc.status === 'running');
    node.classList.toggle('is-paused', pc.status === 'paused');
    if (pauseBtn) {
      pauseBtn.disabled = pc.status === 'idle';
      pauseIco.textContent = pc.status === 'running' ? '⏸\uFE0E' : '▶\uFE0E';
      pauseBtn.title = pc.status === 'running' ? 'Mettre en pause' : 'Reprendre';
    }
    node.classList.toggle('all-done', d === pc.steps.length && pc.steps.length > 0);
  }
  cards.set(pc.id, { node, timeEl: refs.timeEl, sync });
  sync();
}

// ── builders par vue ───────────────────────────────────────────
function buildRow(pc) {
  const node = el(`
    <div class="row">
      <div class="row__id"><span class="tag"></span><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /></div>
      <div class="row__chrono"><time class="timer">00:00:00</time><span class="status"></span></div>
      <div class="row__prog"><div class="row__progtop"><span class="gauge__step"></span><span class="region__count"></span></div></div>
      <button class="key key--pause key--icon key--sm js-pause" type="button" aria-label="Pause"><span class="js-pause-ico">⏸</span></button>
      <button class="key key--finish key--sm js-finish" type="button"><span class="key__ico">✓</span> Terminé</button>
      <button class="card__del" type="button" aria-label="Supprimer ce PC" title="Supprimer">×</button>
    </div>`);
  applyAccent(node, pc); wireName(node, pc); wireButtons(node, pc);
  const { wrap, segs } = segsFor(pc);
  node.querySelector('.row__prog').appendChild(wrap);
  register(pc, node, { segs, timeEl: node.querySelector('.timer'), statusEl: node.querySelector('.status'), stepEl: node.querySelector('.gauge__step'), countEl: node.querySelector('.region__count') });
  return node;
}

function buildMini(pc) {
  const node = el(`
    <div class="mini">
      <div class="mini__head"><span class="tag"></span><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /><button class="card__del" type="button" aria-label="Supprimer ce PC" title="Supprimer">×</button></div>
      <div class="mini__meter"><time class="timer">00:00:00</time><span class="status"></span></div>
      <div class="mini__step"><span class="gauge__step"></span><span class="region__count"></span></div>
      <div class="mini__actions"><button class="key key--pause key--icon key--sm js-pause" type="button" aria-label="Pause"><span class="js-pause-ico">⏸</span></button><button class="key key--finish key--sm js-finish" type="button"><span class="key__ico">✓</span> Terminé</button></div>
    </div>`);
  applyAccent(node, pc); wireName(node, pc); wireButtons(node, pc);
  const { wrap, segs } = segsFor(pc);
  node.querySelector('.mini__step').after(wrap);
  register(pc, node, { segs, timeEl: node.querySelector('.timer'), statusEl: node.querySelector('.status'), stepEl: node.querySelector('.gauge__step'), countEl: node.querySelector('.region__count') });
  return node;
}

function buildTableRow(pc) {
  const tr = el(`
    <tr>
      <td><div class="t-id"><span class="tag"></span><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /></div></td>
      <td><time class="timer">00:00:00</time></td>
      <td><span class="status"></span></td>
      <td class="t-prog"><span class="region__count"></span></td>
      <td><span class="t-step"></span></td>
      <td class="t-act"><button class="key key--pause key--icon key--sm js-pause" type="button" aria-label="Pause"><span class="js-pause-ico">⏸</span></button><button class="key key--finish key--sm js-finish" type="button"><span class="key__ico">✓</span> Terminé</button><button class="card__del" type="button" aria-label="Supprimer ce PC" title="Supprimer">×</button></td>
    </tr>`);
  applyAccent(tr, pc); wireName(tr, pc); wireButtons(tr, pc);
  const { wrap, segs } = segsFor(pc);
  tr.querySelector('.t-prog').appendChild(wrap);
  register(pc, tr, { segs, timeEl: tr.querySelector('.timer'), statusEl: tr.querySelector('.status'), stepEl: tr.querySelector('.t-step'), countEl: tr.querySelector('.region__count'), countSuffix: true });
  return tr;
}

// ── rendu du tableau de bord ───────────────────────────────────
function renderBoard() {
  cards.clear();
  board.className = 'board board--' + store.view;
  board.innerHTML = '';
  emptyEl.hidden = store.pcs.length > 0;
  board.hidden = store.pcs.length === 0;
  if (store.pcs.length === 0) return;

  if (store.view === 'table') {
    const wrap = el(`<table class="tbl"><thead><tr><th>Poste</th><th>Chrono</th><th>Statut</th><th>Progression</th><th>Étape en cours</th><th class="th-right">Action</th></tr></thead><tbody></tbody></table>`);
    board.appendChild(wrap);
    const tb = wrap.querySelector('tbody');
    store.pcs.forEach((pc) => tb.appendChild(buildTableRow(pc)));
  } else {
    const builder = store.view === 'mini' ? buildMini : buildRow;
    store.pcs.forEach((pc) => board.appendChild(builder(pc)));
  }
}

// ── actions ────────────────────────────────────────────────────
function addPc() {
  const accent = PALETTE[store.seed % PALETTE.length]; store.seed++;
  const pc = { id: uid(), name: 'PCP26', status: 'idle', acc: 0, startedAt: null, accent, steps: STEPS.map((label) => ({ label, done: false })), createdAt: Date.now() };
  store.pcs.push(pc); persist();
  renderBoard(); refreshChrome();
  const e = cards.get(pc.id);
  if (e) { const i = e.node.querySelector('.card__name'); if (i) { i.focus(); const n = i.value.length; i.setSelectionRange(n, n); } }
}

function toggleStep(pc, idx) {
  pc.steps[idx].done = !pc.steps[idx].done;
  if (pc.steps[idx].done && pc.status === 'idle') { pc.status = 'running'; pc.startedAt = Date.now(); if (!pc.firstStartedAt) pc.firstStartedAt = pc.startedAt; } // démarrage AUTO
  persist();
  const e = cards.get(pc.id); if (e) e.sync();
  refreshChrome();
}

function pauseToggle(pc) {
  if (pc.status === 'running') { pc.acc += Date.now() - pc.startedAt; pc.startedAt = null; pc.status = 'paused'; }
  else if (pc.status === 'paused') { pc.startedAt = Date.now(); pc.status = 'running'; }
  else return;
  persist();
  const e = cards.get(pc.id); if (e) e.sync();
  refreshChrome();
}

function finishPc(pc) {
  store.history.unshift({ name: pc.name.trim() || 'PC sans nom', totalMs: elapsed(pc), stepsDone: pc.steps.filter((s) => s.done).length, stepsTotal: pc.steps.length, startedAt: pc.firstStartedAt || (Date.now() - elapsed(pc)), finishedAt: Date.now(), accent: pc.accent });
  store.pcs = store.pcs.filter((p) => p.id !== pc.id);
  persist();
  renderBoard(); renderHistory(); refreshChrome();
}

function deletePc(pc) {
  if (pc.status === 'running' && elapsed(pc) > 4000 && !confirm(`Supprimer « ${pc.name.trim() || 'ce PC'} » ? Le chrono en cours sera perdu.`)) return;
  store.pcs = store.pcs.filter((p) => p.id !== pc.id);
  persist();
  renderBoard(); refreshChrome();
}

function setView(v) {
  if (!VIEWS.includes(v) || v === store.view) return;
  store.view = v; persist();
  switchBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  renderBoard();
}

// ── historique ─────────────────────────────────────────────────
function renderHistory() {
  const today = store.history.filter((h) => isToday(h.finishedAt));
  histSec.hidden = today.length === 0;
  histSummary.innerHTML = '';
  if (today.length) {
    const totalMs = today.reduce((s, h) => s + h.totalMs, 0);
    histSummary.appendChild(el(`<div class="hstat"><span class="hstat__num">${today.length}</span><span class="hstat__lab">terminés</span></div>`));
    histSummary.appendChild(el(`<div class="hstat"><span class="hstat__num mono">${fmt(totalMs)}</span><span class="hstat__lab">temps total</span></div>`));
    histSummary.appendChild(el(`<div class="hstat"><span class="hstat__num mono">${fmt(totalMs / today.length)}</span><span class="hstat__lab">temps moyen</span></div>`));
  }
  histList.innerHTML = '';
  for (const h of today) {
    const start = h.startedAt || (h.finishedAt - h.totalMs);
    const li = el(`<li class="hist">
      <span class="hist__dot"></span>
      <span class="hist__name"></span>
      <span class="hist__times"><span class="hist__t">${clk(start)}</span><span class="hist__arrow">→</span><span class="hist__t">${clk(h.finishedAt)}</span></span>
      <span class="hist__chip">${h.stepsDone}/${h.stepsTotal}</span>
      <span class="hist__dur">${fmt(h.totalMs)}</span>
      <button class="hist__del" type="button" aria-label="Retirer">×</button>
    </li>`);
    if (h.accent) li.querySelector('.hist__dot').style.background = `linear-gradient(150deg, ${h.accent[0]}, ${h.accent[1]})`;
    li.querySelector('.hist__name').textContent = h.name;
    li.querySelector('.hist__del').addEventListener('click', () => { store.history = store.history.filter((x) => x !== h); persist(); renderHistory(); });
    histList.appendChild(li);
  }
}

function refreshChrome() {
  const running = store.pcs.filter((p) => p.status === 'running').length;
  counterNum.textContent = String(running);
  counterTotal.textContent = String(store.pcs.length);
  counter.classList.toggle('is-live', running > 0);
}

// ── horloge d'atelier ──────────────────────────────────────────
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');
function tickClock() {
  const n = new Date();
  clockTime.textContent = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  clockDate.textContent = n.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
}
tickClock();
setInterval(tickClock, 15000);

// ── tick global ────────────────────────────────────────────────
setInterval(() => {
  for (const pc of store.pcs) {
    if (pc.status === 'running') { const e = cards.get(pc.id); if (e) e.timeEl.textContent = fmt(elapsed(pc)); }
  }
}, 1000);

// ── init ───────────────────────────────────────────────────────
switchBtns.forEach((b) => { b.classList.toggle('active', b.dataset.view === store.view); b.addEventListener('click', () => setView(b.dataset.view)); });
renderBoard();
renderHistory();
refreshChrome();
document.getElementById('addPc').addEventListener('click', addPc);
document.getElementById('clearHistory').addEventListener('click', () => { if (store.history.some((h) => isToday(h.finishedAt)) && confirm("Retirer les postes terminés aujourd'hui de cette liste ?")) { store.history = store.history.filter((h) => !isToday(h.finishedAt)); persist(); renderHistory(); } });
