'use strict';

/* ════════════════════════════════════════════════════════════
   MASTERING PC — moteur (3 dispositions + jauge à segments)
   • Vue au choix : Rangées / Mini-cartes / Tableau (mémorisée)
   • Chrono AUTO au 1er segment validé, stop au « Terminé »
   • Multi-PC en parallèle, historique, persistance localStorage
   ════════════════════════════════════════════════════════════ */

const STEPS = [
  'Hash', 'Pré-approvisionnement / Resceller',
  'Rename / Synchro', 'Windows Update / MAJ BIOS',
];

const PALETTE = [
  ['#f0b54a', '#f7cd7a'], ['#f07d6a', '#f6a08f'], ['#3fd0bf', '#6fe0d2'], ['#7fb0f5', '#a3c8f8'],
  ['#f08ab0', '#f6abc7'], ['#b59cf2', '#cbb8f6'], ['#5fd699', '#85e2b1'], ['#e6c84a', '#f0d877'],
];

const VIEWS = ['rows', 'mini', 'table', 'bench'];
const KEY = 'mastering.app.v7';

// ── persistance ────────────────────────────────────────────────
function load() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {} return null; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

// ── helpers ────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function fmt(ms) { const t = Math.max(0, Math.floor(ms / 1000)); const p = (n) => String(n).padStart(2, '0'); return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`; }
function fmtMin(ms) { const t = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; if (h) return `${h}h${String(m).padStart(2, '0')}`; if (m) return `${m} min`; return `${s} s`; }
function clampInt(v, lo, hi) { v = parseInt(v, 10); if (isNaN(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
function elapsed(pc) { const live = (pc.status === 'running' && pc.startedAt) ? Date.now() - pc.startedAt : 0; return pc.acc + live; }
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function meta(pc) { return { cur: pc.steps.findIndex((s) => !s.done), d: pc.steps.filter((s) => s.done).length }; }
function stepText(pc) { const { cur } = meta(pc); return cur === -1 ? '✓ Toutes les étapes faites' : `Étape ${cur + 1} · ${pc.steps[cur].label}`; }
// Durée travaillée de chaque étape (basée sur le temps écoulé, pauses exclues). Renvoie un tableau ms|null aligné sur pc.steps.
function computeStepTimes(pc) {
  const timed = pc.steps.map((s, i) => ({ i, atMs: typeof s.atMs === 'number' ? s.atMs : null }))
    .filter((s) => pc.steps[s.i].done && s.atMs != null)
    .sort((a, b) => a.atMs - b.atMs);
  const out = pc.steps.map(() => null);
  let prev = 0;
  for (const s of timed) { out[s.i] = Math.max(0, s.atMs - prev); prev = s.atMs; }
  return out;
}
// Génère n noms à partir d'un nom de départ (incrémente la partie numérique).
function genNames(start, n) {
  const m = /^(.*?)(\d+)\s*$/.exec(start || '');
  const out = [];
  if (!m) { for (let i = 0; i < n; i++) out.push(i === 0 ? (start || 'PC') : `${start} ${i + 1}`); return out; }
  const prefix = m[1], len = m[2].length, base = parseInt(m[2], 10);
  for (let i = 0; i < n; i++) out.push(prefix + String(base + i).padStart(len, '0'));
  return out;
}
function isToday(ts) { const d = new Date(ts), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); }
function clk(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`; }

// ── état initial (1re visite : page vierge) ────────────────────
function seed() {
  return { seed: 0, view: 'rows', pcs: [], history: [] };
}

let store = load() || seed();
if (!VIEWS.includes(store.view)) store.view = 'rows';
if (!Array.isArray(store.srs)) store.srs = [];
// Identité couleur par lot SR, propagée à ses PC (différencier les lots + relier cartes ↔ section).
store.srs.forEach((sr, i) => { if (!Array.isArray(sr.accent)) sr.accent = PALETTE[i % PALETTE.length]; });
for (const _pc of store.pcs) { if (_pc.srId) { const _sr = store.srs.find((s) => s.id === _pc.srId); if (_sr) _pc.accent = _sr.accent; } }

// Fiabilise le chrono : si l'appli a été fermée / en veille > 20 min, on ne compte pas ce temps mort
// (on avance startedAt des PC en cours d'autant) — sinon une nuit fermé gonflerait les durées et fausserait l'estimation.
(function fixClocks() {
  const now = Date.now();
  const gap = now - (typeof store.lastSeen === 'number' ? store.lastSeen : now);
  if (gap > 20 * 60000) {
    for (const pc of store.pcs) { if (pc.status === 'running' && pc.startedAt) pc.startedAt += gap; }
  }
  store.lastSeen = now;
})();
persist();
function heartbeat() { store.lastSeen = Date.now(); persist(); }

// ── lots SR : dates, charge, urgence ───────────────────────────
const DAY = 86400000;
const LEVEL_RANK = { late: 0, tight: 1, soon: 2, ok: 3, ahead: 4, none: 5, done: 6 };
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function daysUntil(ts) { return Math.round((startOfDay(ts) - startOfDay(Date.now())) / DAY); }
// Durée moyenne d'un poste (historique ; défaut 40 min faute de données).
// Temps actif médian par PC (robuste aux extrêmes ; défaut 40 min faute de données).
function avgPerPc() {
  const v = store.history.map((h) => h.totalMs).filter((m) => m > 0).sort((a, b) => a - b);
  if (!v.length) return 40 * 60000;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
// Parallélisme réel : nb moyen de PC menés en même temps = travail total ÷ temps réellement occupé
// (union des créneaux début→fin de l'historique). 1 si pas assez de données ; plafonné à 12 (gros lots).
function parallelism() {
  const iv = store.history.filter((h) => h.startedAt && h.finishedAt && h.finishedAt > h.startedAt).map((h) => [h.startedAt, h.finishedAt]);
  if (iv.length < 3) return 1;
  iv.sort((a, b) => a[0] - b[0]);
  let work = 0, union = 0, s = iv[0][0], e = iv[0][1];
  for (const [a, b] of iv) work += b - a;
  for (let i = 1; i < iv.length; i++) { const [a, b] = iv[i]; if (a > e) { union += e - s; s = a; e = b; } else if (b > e) e = b; }
  union += e - s;
  return union > 0 ? Math.min(12, Math.max(1, work / union)) : 1;
}
// Estimation « intelligente » du temps mur pour n PC : temps/PC ÷ parallélisme.
function estimateMs(n) { return n * avgPerPc() / parallelism(); }
// Cadence : postes terminés par jour actif (historique ; défaut 8).
function pacePerDay() { const days = new Set(store.history.map((h) => startOfDay(h.finishedAt))); return days.size ? store.history.length / days.size : 8; }
function srPcs(sr) { return store.pcs.filter((p) => p.srId === sr.id); }
// Bilan d'un lot : reste / faits / jours restants / charge / statut + niveau d'urgence.
function srStat(sr) {
  const remaining = srPcs(sr).length;
  const total = sr.total || remaining;
  const done = Math.max(0, total - remaining);
  const dleft = sr.dueAt ? daysUntil(sr.dueAt) : null;
  const workMs = estimateMs(remaining);   // temps mur estimé (tient compte du parallélisme)
  const needed = remaining ? Math.max(1, Math.ceil(remaining / pacePerDay())) : 0;
  let status, level;
  if (remaining === 0) { status = 'Terminé'; level = 'done'; }
  else if (dleft === null) { status = 'Sans échéance'; level = 'none'; }
  else if (dleft < 0) { status = `En retard de ${-dleft} j`; level = 'late'; }
  else {
    const slack = dleft - needed;
    if (slack < 0) { status = 'À commencer'; level = 'late'; }
    else if (slack < 1) { status = 'Tendu'; level = 'tight'; }
    else if (slack < 3) { status = 'Dans les temps'; level = 'soon'; }
    else { status = 'En avance'; level = 'ahead'; }
  }
  return { remaining, done, total, dleft, workMs, needed, status, level };
}
function byUrgency(a, b) {
  const sa = srStat(a), sb = srStat(b);
  const r = LEVEL_RANK[sa.level] - LEVEL_RANK[sb.level];
  return r || ((sa.dleft == null ? 1e9 : sa.dleft) - (sb.dleft == null ? 1e9 : sb.dleft));
}
function countdown(dleft) {
  if (dleft == null) return 'sans échéance';
  if (dleft < 0) return `retard ${-dleft} j`;
  if (dleft === 0) return "aujourd'hui";
  if (dleft === 1) return 'demain';
  return `dans ${dleft} j`;
}
function dueDateLabel(ts) { return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''); }

// ── onglets (À faire / En cours) + tailles d'écran ─────────────
if (!['todo', 'active'].includes(store.tab)) store.tab = 'todo';
function activePcs() { return store.pcs.filter((p) => p.status !== 'idle'); }   // démarrés (en cours / pause)
function todoPcs() { return store.pcs.filter((p) => p.status === 'idle'); }     // backlog « à faire »
function sizeSplit(pcs) { let s16 = 0, s13 = 0; for (const p of pcs) (sizeOf(p) === '13' ? s13++ : s16++); return { s16, s13 }; }
function splitLabel(pcs) { const s = sizeSplit(pcs); const out = []; if (s.s16) out.push(`${s.s16}×16"`); if (s.s13) out.push(`${s.s13}×13"`); return out.join(' · '); }

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
const tabBtns = Array.from(document.querySelectorAll('.tabs button'));
const tabTodoN = document.getElementById('tabTodoN');
const tabActiveN = document.getElementById('tabActiveN');
const planningSec = document.getElementById('planning');
const planningList = document.getElementById('planningList');
const planningSuggest = document.getElementById('planningSuggest');
const planningSizes = document.getElementById('planningSizes');
const clearDoneBtn = document.getElementById('clearDoneSrs');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const wallEl = document.getElementById('wall');

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
function sizeOf(pc) { return pc.size === '13' ? '13' : '16'; }
function sizeLabel(pc) { return sizeOf(pc) + '"'; }
function toggleSize(pc) { pc.size = sizeOf(pc) === '13' ? '16' : '13'; persist(); renderAll(); }
// Renommage via crayon (champ en lecture seule par défaut) + bascule de taille 13"/16".
function wireName(node, pc) {
  const i = node.querySelector('.card__name');
  i.value = pc.name; i.setAttribute('value', pc.name); i.readOnly = true;
  i.addEventListener('input', () => { pc.name = i.value; i.setAttribute('value', pc.name); persist(); });
  i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } });
  i.addEventListener('blur', () => { i.readOnly = true; });
  const edit = node.querySelector('.card__edit');
  if (edit) edit.addEventListener('click', () => { i.readOnly = false; i.focus(); const n = i.value.length; i.setSelectionRange(n, n); });
  const size = node.querySelector('.card__size');
  if (size) { size.textContent = sizeLabel(pc); size.dataset.size = sizeOf(pc); size.addEventListener('click', () => toggleSize(pc)); }
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
    const stimes = computeStepTimes(pc);
    refs.segs.forEach((b, i) => {
      b.classList.toggle('done', pc.steps[i].done);
      b.title = stimes[i] != null ? `${pc.steps[i].label} · ${fmtMin(stimes[i])}` : pc.steps[i].label;
    });
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
      <div class="row__id"><span class="tag"></span><button class="card__size" type="button" title="Basculer 13&quot;/16&quot;"></button><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /><button class="card__edit" type="button" aria-label="Renommer" title="Renommer">✎</button></div>
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
      <div class="mini__head"><span class="tag"></span><button class="card__size" type="button" title="Basculer 13&quot;/16&quot;"></button><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /><button class="card__edit" type="button" aria-label="Renommer" title="Renommer">✎</button><button class="card__del" type="button" aria-label="Supprimer ce PC" title="Supprimer">×</button></div>
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
      <td><div class="t-id"><span class="tag"></span><button class="card__size" type="button" title="Basculer 13&quot;/16&quot;"></button><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /><button class="card__edit" type="button" aria-label="Renommer" title="Renommer">✎</button></div></td>
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

// ── mode établi (6 emplacements, glisser-déposer) ──────────────
let dragSrcSlot = null;

// Range les PC EN COURS dans 6 emplacements (ou plus). Renvoie un tableau slot→pc.
function normalizeSlots() {
  const list = activePcs();
  const n = Math.max(6, Math.ceil(list.length / 6) * 6);
  const occ = new Array(n).fill(null);
  for (const pc of list) {
    if (Number.isInteger(pc.slot) && pc.slot >= 0 && pc.slot < n && occ[pc.slot] === null) occ[pc.slot] = pc;
    else pc.slot = null;
  }
  for (const pc of list) { if (pc.slot === null) { const f = occ.indexOf(null); if (f >= 0) { occ[f] = pc; pc.slot = f; } } }
  persist();
  return occ;
}

// Déplace / permute un PC d'un emplacement à un autre.
function moveSlot(a, b) {
  if (a === b) return;
  const pa = store.pcs.find((p) => p.slot === a);
  const pb = store.pcs.find((p) => p.slot === b);
  if (!pa) return;
  pa.slot = b; if (pb) pb.slot = a;
  persist(); renderBoard();
}

// Glisser-déposer sur une baie (remplie = draggable ; toutes = zone de dépôt).
function wireBenchDrag(node, i, filled) {
  node.dataset.slot = i;
  if (filled) {
    node.setAttribute('draggable', 'true');
    node.addEventListener('dragstart', (e) => { dragSrcSlot = i; node.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (x) {} });
    node.addEventListener('dragend', () => { dragSrcSlot = null; node.classList.remove('dragging'); document.querySelectorAll('.bslot.drag-over').forEach((x) => x.classList.remove('drag-over')); });
  }
  node.addEventListener('dragover', (e) => { if (dragSrcSlot === null) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; node.classList.add('drag-over'); });
  node.addEventListener('dragleave', () => node.classList.remove('drag-over'));
  node.addEventListener('drop', (e) => { e.preventDefault(); node.classList.remove('drag-over'); if (dragSrcSlot === null) return; moveSlot(dragSrcSlot, Number(node.dataset.slot)); });
}

// Une baie occupée.
function buildBench(pc, no) {
  const node = el(`
    <div class="bslot">
      <div class="bslot__top"><span class="bslot__grip" aria-hidden="true">⋮⋮</span><span class="bslot__no">${no}</span><span class="tag"></span><button class="card__size" type="button" title="Basculer 13&quot;/16&quot;"></button><input class="card__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /><button class="card__edit" type="button" aria-label="Renommer" title="Renommer">✎</button><button class="card__del" type="button" aria-label="Supprimer ce PC" title="Supprimer">×</button></div>
      <div class="bslot__meter"><time class="timer">00:00:00</time><span class="status"></span></div>
      <div class="mini__step"><span class="gauge__step"></span><span class="region__count"></span></div>
      <div class="bslot__actions"><button class="key key--pause key--icon key--sm js-pause" type="button" aria-label="Pause"><span class="js-pause-ico">⏸</span></button><button class="key key--finish key--sm js-finish" type="button"><span class="key__ico">✓</span> Terminé</button></div>
    </div>`);
  applyAccent(node, pc); wireName(node, pc); wireButtons(node, pc);
  const { wrap, segs } = segsFor(pc);
  node.querySelector('.mini__step').after(wrap);
  register(pc, node, { segs, timeEl: node.querySelector('.timer'), statusEl: node.querySelector('.status'), stepEl: node.querySelector('.gauge__step'), countEl: node.querySelector('.region__count') });
  return node;
}

// Une baie vide.
function emptySlot(no) {
  return el(`<div class="bslot bslot--empty"><span class="bslot__no">${no}</span><div class="bslot__empty"><span class="bslot__dock"></span>Emplacement libre</div></div>`);
}

// ── rendu du tableau de bord ───────────────────────────────────
// Groupes ordonnés (lots SR par urgence, puis « hors lot »), restreints à `pool`.
function orderedGroups(pool) {
  const groups = [];
  for (const sr of store.srs.slice().sort(byUrgency)) { const pcs = pool.filter((p) => p.srId === sr.id); if (pcs.length) groups.push({ sr, pcs }); }
  const loose = pool.filter((p) => !p.srId || !store.srs.some((s) => s.id === p.srId));
  if (loose.length) groups.push({ sr: null, pcs: loose });
  return groups;
}

// Conteneur d'un groupe selon la vue active (porte sa propre classe board--xxx).
function groupBody(pcs) {
  if (store.view === 'table') {
    const wrap = el(`<div class="board--table"><table class="tbl"><thead><tr><th>Poste</th><th>Chrono</th><th>Statut</th><th>Progression</th><th>Étape en cours</th><th class="th-right">Action</th></tr></thead><tbody></tbody></table></div>`);
    const tb = wrap.querySelector('tbody');
    pcs.forEach((pc) => tb.appendChild(buildTableRow(pc)));
    return wrap;
  }
  const wrap = el(`<div class="board--${store.view === 'mini' ? 'mini' : 'rows'}"></div>`);
  const builder = store.view === 'mini' ? buildMini : buildRow;
  pcs.forEach((pc) => wrap.appendChild(builder(pc)));
  return wrap;
}

// En-tête d'un groupe : nom, échéance, progression, statut, charge restante.
// petites icônes vectorielles (jamais d'emoji comme icône structurelle)
const ICO = {
  cal: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.2" y="3.4" width="11.6" height="10.4" rx="2"/><path d="M2.2 6.6h11.6M5.4 1.6v3M10.6 1.6v3"/></svg>',
  clock: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8.4" r="5.7"/><path d="M8 5.2v3.2l2.3 1.4"/></svg>',
  screen: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="2.6" width="12.4" height="8.4" rx="1.4"/><path d="M5.6 13.6h4.8M8 11v2.6"/></svg>',
  play: '<svg class="pico" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.3v9.4l7.6-4.7z"/></svg>',
  check: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.4 8.4l3 3 6.2-6.8"/></svg>',
};

// PC d'un lot répartis par état : à faire (idle), en cours (running/paused), terminés (historique).
function lotParts(sr) {
  const idle = [], running = [];
  for (const p of store.pcs) { if (p.srId !== sr.id) continue; (p.status === 'idle' ? idle : running).push(p); }
  const done = store.history.filter((h) => h.srId === sr.id);
  return { idle, running, done };
}

// Chip « terminé » (depuis l'historique).
function doneChip(h) {
  const node = el(`<div class="pchip pchip--done"><span class="pchip__ic">${ICO.check}</span><div class="pchip__id"><span class="pchip__name"></span><span class="pchip__state">Terminé · ${fmt(h.totalMs)}</span></div><span class="pchip__size" data-size="${h.size === '13' ? '13' : '16'}">${h.size === '13' ? '13' : '16'}"</span></div>`);
  node.querySelector('.pchip__name').textContent = h.name;
  return node;
}

// Chip « en cours / en pause ».
function runChip(pc) {
  const d = pc.steps.filter((s) => s.done).length;
  const node = el(`<div class="pchip pchip--run"><span class="pchip__ic">${ICO.play}</span><div class="pchip__id"><span class="pchip__name"></span><span class="pchip__state"></span></div><button class="card__size" type="button" title="Basculer 13&quot;/16&quot;"></button></div>`);
  applyAccent(node, pc);
  node.querySelector('.pchip__name').textContent = pc.name;
  node.querySelector('.pchip__state').textContent = (pc.status === 'paused' ? 'En pause' : 'En cours') + ` · ${d}/${pc.steps.length}`;
  const size = node.querySelector('.card__size'); size.textContent = sizeLabel(pc); size.dataset.size = sizeOf(pc); size.addEventListener('click', () => toggleSize(pc));
  node.addEventListener('click', (e) => { if (e.target.closest('.card__size')) return; if (store.tab !== 'active') { store.tab = 'active'; syncTabs(); renderAll(); } });
  return node;
}

// Chip « à démarrer » (sélectionnable pour démarrage en lot) + crayon/×.
function idleChip(pc, sel, onSel) {
  const node = el(`<div class="pchip pchip--idle">
    <button class="pchip__box" type="button" aria-label="Sélectionner"></button>
    <div class="pchip__id"><input class="card__name pchip__name" type="text" maxlength="40" placeholder="Nom du PC…" aria-label="Nom du PC" /><span class="pchip__state">À démarrer</span></div>
    <button class="card__size" type="button" title="Basculer 13&quot;/16&quot;"></button>
    <div class="pchip__acts"><button class="card__edit" type="button" aria-label="Renommer" title="Renommer">✎</button><button class="card__del" type="button" aria-label="Supprimer ce PC" title="Supprimer">×</button></div>
  </div>`);
  node.dataset.id = pc.id;
  applyAccent(node, pc); wireName(node, pc);
  node.querySelector('.card__del').addEventListener('click', () => deletePc(pc));
  // Tout le chip est cliquable pour sélectionner (sauf le nom, la taille, le crayon et la ×).
  node.addEventListener('click', (e) => {
    if (e.target.closest('.card__name, .card__edit, .card__del, .card__size')) return;
    if (sel.has(pc.id)) { sel.delete(pc.id); node.classList.remove('is-sel'); }
    else { sel.add(pc.id); node.classList.add('is-sel'); }
    onSel();
  });
  return node;
}

// Carte de lot (vue « À faire ») inspirée du modèle : en-tête + meta + progression multi-états + chips + action.
function buildLotCard(sr) {
  const st = srStat(sr);
  const { idle, running, done } = lotParts(sr);
  const doneN = Math.max(0, st.total - idle.length - running.length);
  const idleN = Math.max(0, st.total - doneN - running.length);
  const card = el(`<section class="lot lot--${st.level}"></section>`);
  card.dataset.sr = sr.id;
  if (Array.isArray(sr.accent)) card.style.setProperty('--sr', sr.accent[0]);

  const head = el(`<header class="lot__head">
    <span class="lot__dot"></span>
    <span class="lot__name"></span>
    <span class="lot__city"></span>
    <span class="lot__cd">${st.dleft == null ? 'sans échéance' : countdown(st.dleft)}</span>
    <span class="lot__spacer"></span>
    <span class="lot__due"><span class="lot__due-k">échéance</span><span class="lot__due-v">${sr.dueAt ? dueDateLabel(sr.dueAt) : '—'}</span></span>
    <button class="lot__edit" type="button" title="Modifier le SR" aria-label="Modifier le SR">✎</button>
    <button class="lot__del" type="button" title="Supprimer le SR" aria-label="Supprimer le SR">×</button>
  </header>`);
  head.querySelector('.lot__name').textContent = sr.name;
  const cityEl = head.querySelector('.lot__city');
  if (sr.ville) cityEl.textContent = sr.ville; else cityEl.remove();
  head.querySelector('.lot__edit').addEventListener('click', () => openEditSr(sr));
  head.querySelector('.lot__del').addEventListener('click', () => deleteSr(sr));
  card.appendChild(head);

  card.appendChild(el(`<div class="lot__meta">
    <span class="lot__chip">${ICO.screen}${splitLabel([...srPcs(sr), ...done]) || '—'}</span>
    <span class="lot__chip" title="≈ ${fmtMin(avgPerPc())} par PC · ~${parallelism().toFixed(1).replace(/\.0$/, '')} PC en parallèle (d'après ton historique)">${ICO.clock}≈ ${fmtMin(st.workMs)} restant</span>
  </div>`));

  card.appendChild(el(`<div class="lot__progress">
    <span class="lot__bar"><span class="lot__seg lot__seg--done" style="flex:${doneN}"></span><span class="lot__seg lot__seg--run" style="flex:${running.length}"></span><span class="lot__seg lot__seg--idle" style="flex:${idleN}"></span></span>
    <span class="lot__count">${doneN} / ${st.total} PC</span>
  </div>`));

  const sel = new Set();
  let onSel = () => {};
  const chips = el('<div class="lot__pcs"></div>');
  done.forEach((h) => chips.appendChild(doneChip(h)));
  running.forEach((pc) => chips.appendChild(runChip(pc)));
  idle.forEach((pc) => chips.appendChild(idleChip(pc, sel, () => onSel())));
  card.appendChild(chips);

  if (idle.length) {
    const act = el(`<div class="lot__act"><span class="lot__act-hint"></span><button class="lot__go" type="button" disabled>Démarrer la sélection</button></div>`);
    const hint = act.querySelector('.lot__act-hint'), go = act.querySelector('.lot__go');
    onSel = () => { const n = sel.size; go.disabled = n === 0; go.textContent = n ? `Démarrer ${n} PC` : 'Démarrer la sélection'; hint.textContent = n ? `${n} sélectionné${n > 1 ? 's' : ''}` : 'Sélectionne les PC à démarrer'; };
    onSel();
    go.addEventListener('click', () => {
      if (!sel.size) return;
      for (const id of sel) { const pc = store.pcs.find((p) => p.id === id); if (pc && pc.status === 'idle') { pc.status = 'running'; pc.startedAt = Date.now(); pc.firstStartedAt = pc.firstStartedAt || pc.startedAt; } }
      persist(); renderAll();
    });
    card.appendChild(act);
  }
  return card;
}

// Carte simple pour les PC hors lot.
function buildLooseCard(pcs) {
  const card = el(`<section class="lot lot--loose"><header class="lot__head"><span class="lot__name lot__name--static">Hors SR</span><span class="lot__spacer"></span><span class="lot__chip">${ICO.screen}${splitLabel(pcs) || '—'}</span></header></section>`);
  const sel = new Set();
  let onSel = () => {};
  const chips = el('<div class="lot__pcs"></div>');
  pcs.forEach((pc) => chips.appendChild(idleChip(pc, sel, () => onSel())));
  card.appendChild(chips);
  const act = el(`<div class="lot__act"><span class="lot__act-hint">Sélectionne les PC à démarrer</span><button class="lot__go" type="button" disabled>Démarrer la sélection</button></div>`);
  const hint = act.querySelector('.lot__act-hint'), go = act.querySelector('.lot__go');
  onSel = () => { const n = sel.size; go.disabled = n === 0; go.textContent = n ? `Démarrer ${n} PC` : 'Démarrer la sélection'; hint.textContent = n ? `${n} sélectionné${n > 1 ? 's' : ''}` : 'Sélectionne les PC à démarrer'; };
  go.addEventListener('click', () => { if (!sel.size) return; for (const id of sel) { const pc = store.pcs.find((p) => p.id === id); if (pc && pc.status === 'idle') { pc.status = 'running'; pc.startedAt = Date.now(); pc.firstStartedAt = pc.firstStartedAt || pc.startedAt; } } persist(); renderAll(); });
  card.appendChild(act);
  return card;
}

function groupHead(g) {
  if (!g.sr) return el(`<div class="srhead srhead--none">
    <span class="srhead__dot"></span>
    <span class="srhead__name srhead__name--static">Hors SR</span>
    <span class="srhead__rule"></span>
    <span class="srhead__chip">${ICO.screen}${splitLabel(g.pcs) || '—'}</span>
    <span class="srhead__badge">${g.pcs.length} PC</span>
  </div>`);
  const sr = g.sr, st = srStat(sr);
  const pct = st.total ? Math.round(st.done / st.total * 100) : 0;
  const node = el(`<div class="srhead srhead--${st.level}">
    <button class="srhead__caret" type="button" aria-label="Replier le SR"></button>
    <span class="srhead__dot"></span>
    <span class="srhead__name"></span>
    <span class="srhead__sub">${ICO.cal}<span class="srhead__subtxt"></span></span>
    <span class="srhead__rule"></span>
    <span class="srhead__progress"><span class="srhead__bar"><span class="srhead__fill"></span></span><span class="srhead__count">${st.done}<i>/${st.total}</i> · <b>${pct}%</b></span></span>
    <span class="srhead__chip">${ICO.screen}${splitLabel(srPcs(sr)) || '—'}</span>
    <span class="srhead__chip">${ICO.clock}${st.remaining ? '≈ ' + fmtMin(st.workMs) : 'fini'}</span>
    <span class="srhead__status">${st.status}</span>
    <div class="srhead__acts">
      <button class="srhead__edit" type="button" aria-label="Modifier le SR" title="Modifier le SR">✎</button>
      <button class="srhead__del" type="button" aria-label="Supprimer le SR" title="Supprimer le SR">×</button>
    </div>
  </div>`);
  if (Array.isArray(sr.accent)) node.style.setProperty('--sr', sr.accent[0]);
  node.querySelector('.srhead__name').textContent = sr.name;
  node.querySelector('.srhead__subtxt').textContent = sr.dueAt ? `${dueDateLabel(sr.dueAt)} · ${countdown(st.dleft)}` : 'sans échéance';
  node.querySelector('.srhead__fill').style.width = pct + '%';
  const caret = node.querySelector('.srhead__caret');
  caret.classList.toggle('collapsed', !!sr.collapsed);
  caret.addEventListener('click', () => { sr.collapsed = !sr.collapsed; persist(); renderBoard(); });
  node.querySelector('.srhead__edit').addEventListener('click', () => openEditSr(sr));
  node.querySelector('.srhead__del').addEventListener('click', () => deleteSr(sr));
  return node;
}

// Rend les PC « en cours » groupés par SR (en-tête + cartes complètes).
function renderGroups(pool) {
  const groups = orderedGroups(pool);
  const hasSr = groups.some((g) => g.sr);
  board.className = 'board' + (hasSr ? ' board--grouped' : '');
  for (const g of groups) {
    const body = groupBody(g.pcs);
    if (!hasSr) { board.appendChild(body); continue; }
    const sec = el('<section class="srgroup"></section>');
    sec.dataset.sr = g.sr ? g.sr.id : 'loose';
    sec.appendChild(groupHead(g));
    if (!(g.sr && g.sr.collapsed)) sec.appendChild(body);
    board.appendChild(sec);
  }
}

function setEmpty(tab) {
  const t = emptyEl.querySelector('.empty__title'), x = emptyEl.querySelector('.empty__text');
  if (tab === 'todo') { t.textContent = 'Aucun PC à faire'; x.textContent = 'Crée un service régional pour remplir la liste.'; }
  else { t.textContent = 'Aucun poste en cours'; x.textContent = "Démarre un PC depuis l'onglet « À faire »."; }
}

function renderTodo() {
  const srsToShow = store.srs.filter((sr) => srPcs(sr).length > 0).sort(byUrgency);
  const loose = store.pcs.filter((p) => p.status === 'idle' && (!p.srId || !store.srs.some((s) => s.id === p.srId)));
  const has = srsToShow.length > 0 || loose.length > 0;
  emptyEl.hidden = has;
  board.hidden = !has;
  if (!has) { setEmpty('todo'); board.className = 'board'; return; }
  board.className = 'board board--lots';
  for (const sr of srsToShow) board.appendChild(buildLotCard(sr));
  if (loose.length) board.appendChild(buildLooseCard(loose));
}

function renderActive() {
  const pool = activePcs();
  const bench = store.view === 'bench';
  emptyEl.hidden = bench || pool.length > 0;
  board.hidden = !bench && pool.length === 0;
  if (!bench && pool.length === 0) { setEmpty('active'); board.className = 'board'; return; }
  if (bench) {
    board.className = 'board board--benchwrap';
    const occ = normalizeSlots();
    const groups = Math.ceil(occ.length / 6);
    store.benchNames = store.benchNames || {};
    for (let g = 0; g < groups; g++) {
      const title = el(`<input class="bench-title" maxlength="24" autocomplete="off" aria-label="Nom de l'établi" />`);
      title.value = store.benchNames[g] || `Établi ${g + 1}`;
      title.addEventListener('input', () => { store.benchNames[g] = title.value; persist(); });
      board.appendChild(title);
      const grid = el('<div class="board--bench"></div>');
      occ.slice(g * 6, g * 6 + 6).forEach((pc, j) => {
        const i = g * 6 + j;
        const node = pc ? buildBench(pc, i + 1) : emptySlot(i + 1);
        wireBenchDrag(node, i, !!pc);
        grid.appendChild(node);
      });
      board.appendChild(grid);
    }
    return;
  }
  renderGroups(pool);
}

function renderBoard() {
  cards.clear();
  board.innerHTML = '';
  if (store.tab === 'todo') renderTodo();
  else renderActive();
}

// ── actions ────────────────────────────────────────────────────
function mkBlank(name, size) {
  const accent = PALETTE[store.seed % PALETTE.length]; store.seed++;
  return { id: uid(), name, size: size === '13' ? '13' : '16', status: 'idle', acc: 0, startedAt: null, accent, steps: STEPS.map((label) => ({ label, done: false })), createdAt: Date.now() };
}

// Bascule un PC du backlog vers « en cours ».
function startPc(pc) {
  if (pc.status !== 'idle') return;
  pc.status = 'running'; pc.startedAt = Date.now(); pc.firstStartedAt = pc.firstStartedAt || pc.startedAt;
  persist(); renderAll();
}

// ── lots SR ────────────────────────────────────────────────────
function renderAll() { renderPlanning(); renderBoard(); renderHistory(); refreshChrome(); }

function createSr(name, ville, n16, n13, dueAt, start16, start13) {
  const total = n16 + n13;
  const accent = PALETTE[store.srs.length % PALETTE.length];   // couleur d'identité du SR
  const sr = { id: uid(), name: name || 'SR', ville: (ville || '').trim(), dueAt: dueAt || null, total, accent, createdAt: Date.now(), collapsed: false };
  store.srs.push(sr);
  // Noms : numérotation propre au 16″ et au 13″ ; si pas de départ 13″, on continue la série du 16″.
  const names16 = n16 ? genNames(start16, n16) : [];
  const names13 = n13 ? genNames(start13 || genNames(start16, total)[n16] || start16, n13) : [];
  for (const nm of names16) { const pc = mkBlank(nm, '16'); pc.srId = sr.id; pc.accent = accent; store.pcs.push(pc); }
  for (const nm of names13) { const pc = mkBlank(nm, '13'); pc.srId = sr.id; pc.accent = accent; store.pcs.push(pc); }
  if (store.tab !== 'todo') { store.tab = 'todo'; syncTabs(); }
  persist(); renderAll();
}

function deleteSr(sr) {
  const pcs = srPcs(sr);
  if (pcs.length && !confirm(`Supprimer le SR « ${sr.name} » et ses ${pcs.length} PC en cours ?\n(les PC déjà terminés restent dans l'historique)`)) return;
  store.pcs = store.pcs.filter((p) => p.srId !== sr.id);
  store.srs = store.srs.filter((s) => s.id !== sr.id);
  persist(); renderAll();
}

// Retire d'un coup tous les lots terminés (0 PC restant).
function clearDoneSrs() {
  const done = store.srs.filter((sr) => srStat(sr).remaining === 0);
  if (!done.length) return;
  if (!confirm(`Supprimer ${done.length} SR terminé${done.length > 1 ? 's' : ''} ?`)) return;
  const ids = new Set(done.map((s) => s.id));
  store.srs = store.srs.filter((s) => !ids.has(s.id));
  persist(); renderAll();
}

function toDateInput(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

// Modifier un SR : nom + ville + échéance.
function openEditSr(sr) {
  const body = el(`<form class="mform">
    <div class="mfield mfield--row">
      <label class="mfield"><span>Service régional</span><input name="name" type="text" maxlength="30" autocomplete="off" /></label>
      <label class="mfield"><span>Ville</span><input name="ville" type="text" maxlength="40" autocomplete="off" placeholder="Paris" /></label>
    </div>
    <label class="mfield"><span>À livrer pour le</span><input name="due" type="date" /></label>
    <p class="mform__hint"></p>
    <div class="mform__actions"><button type="button" class="key key--sm js-cancel">Annuler</button><button type="submit" class="key key--brand key--sm">Enregistrer</button></div>
  </form>`);
  const nameI = body.querySelector('[name=name]'); nameI.value = sr.name;
  const villeI = body.querySelector('[name=ville]'); villeI.value = sr.ville || '';
  const dueI = body.querySelector('[name=due]'); if (sr.dueAt) dueI.value = toDateInput(sr.dueAt);
  const hint = body.querySelector('.mform__hint');
  hint.textContent = `${srPcs(sr).length} PC dans ce SR (${splitLabel(srPcs(sr)) || '—'})`;
  const m = openModal('Modifier le service régional', body);
  body.querySelector('.js-cancel').addEventListener('click', m.close);
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    sr.name = nameI.value.trim() || sr.name;
    sr.ville = villeI.value.trim();
    sr.dueAt = dueI.value ? new Date(dueI.value + 'T00:00:00').getTime() : null;
    persist(); renderAll(); m.close();
  });
  nameI.focus(); nameI.select();
}

function openAddSr() {
  const body = el(`<form class="mform">
    <div class="mfield mfield--row">
      <label class="mfield"><span>Service régional</span><input name="name" type="text" maxlength="30" autocomplete="off" placeholder="SR 75" /></label>
      <label class="mfield"><span>Ville</span><input name="ville" type="text" maxlength="40" autocomplete="off" placeholder="Paris" /></label>
    </div>
    <div class="mfield">
      <span>Postes par taille d'écran</span>
      <div class="mtbl">
        <div class="mtbl__head"><span>Écran</span><span>Nombre</span><span>N° de départ</span></div>
        <div class="msize">
          <span class="msize__tag" data-size="16">16″</span>
          <input name="n16" type="number" class="msize__n" min="0" max="60" value="0" aria-label="Nombre de 16 pouces" />
          <input name="start16" type="text" class="msize__start" maxlength="40" autocomplete="off" placeholder="PCP26…" aria-label="N° de départ 16 pouces" />
        </div>
        <div class="msize">
          <span class="msize__tag" data-size="13">13″</span>
          <input name="n13" type="number" class="msize__n" min="0" max="60" value="0" aria-label="Nombre de 13 pouces" />
          <input name="start13" type="text" class="msize__start" maxlength="40" autocomplete="off" placeholder="PCP26…" aria-label="N° de départ 13 pouces" />
        </div>
      </div>
    </div>
    <label class="mfield"><span>À livrer pour le</span><input name="due" type="date" /></label>
    <p class="mform__hint"></p>
    <div class="mform__actions"><button type="button" class="key key--sm js-cancel">Annuler</button><button type="submit" class="key key--brand key--sm">Créer le SR</button></div>
  </form>`);
  const nameI = body.querySelector('[name=name]');
  const villeI = body.querySelector('[name=ville]');
  const n16I = body.querySelector('[name=n16]');
  const n13I = body.querySelector('[name=n13]');
  const start16I = body.querySelector('[name=start16]');
  const start13I = body.querySelector('[name=start13]');
  const dueI = body.querySelector('[name=due]');
  const hint = body.querySelector('.mform__hint');
  nameI.value = 'SR '; start16I.value = 'PCP26'; start13I.value = 'PCP26';   // bases pré-remplies, à compléter
  function vals() {
    const n16 = clampInt(n16I.value, 0, 60), n13 = clampInt(n13I.value, 0, 60);
    const s16 = start16I.value.trim() || 'PCP2601';
    const s13 = start13I.value.trim() || 'PCP2601';
    return { n16, n13, s16, s13, total: Math.max(1, n16 + n13) };
  }
  function preview() {
    const { n16, n13, s16, s13 } = vals();
    const sr = (nameI.value.trim() || 'SR') + (villeI.value.trim() ? ' · ' + villeI.value.trim() : '');
    const parts = [];
    if (n16) { const a = genNames(s16, n16); parts.push(`${n16}×16″ (${a[0]}${n16 > 1 ? '→' + a[n16 - 1] : ''})`); }
    if (n13) { const b = genNames(s13, n13); parts.push(`${n13}×13″ (${b[0]}${n13 > 1 ? '→' + b[n13 - 1] : ''})`); }
    const when = dueI.value ? ' · à livrer le ' + dueDateLabel(new Date(dueI.value + 'T00:00:00').getTime()) : '';
    hint.textContent = `${sr} : ${parts.join(' · ') || '0 PC'}${when}`;
  }
  [nameI, villeI, n16I, n13I, start16I, start13I, dueI].forEach((i) => i.addEventListener('input', preview)); preview();
  const m = openModal('Nouveau service régional', body);
  body.querySelector('.js-cancel').addEventListener('click', m.close);
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    const { n16, n13, s16, s13 } = vals();
    if (n16 + n13 < 1) return;
    const dueAt = dueI.value ? new Date(dueI.value + 'T00:00:00').getTime() : null;
    createSr(nameI.value.trim(), villeI.value.trim(), n16, n13, dueAt, s16, s13);
    m.close();
  });
  nameI.focus(); nameI.setSelectionRange(nameI.value.length, nameI.value.length);
}

// Panneau « Lots à préparer » : suggestion du jour + cartes triées par urgence.
function renderPlanning() {
  if (!planningSec) return;
  planningSec.hidden = store.tab !== 'todo' || store.srs.length === 0;
  planningList.innerHTML = '';
  if (planningSizes) { const lab = splitLabel(store.pcs); planningSizes.textContent = lab ? 'Total : ' + lab : ''; }
  if (clearDoneBtn) { const n = store.srs.filter((sr) => srStat(sr).remaining === 0).length; clearDoneBtn.hidden = n === 0; clearDoneBtn.textContent = `Nettoyer ${n} SR terminé${n > 1 ? 's' : ''}`; }
  if (!store.srs.length) { planningSuggest.textContent = ''; return; }
  const totalRemaining = store.srs.reduce((s, sr) => s + srStat(sr).remaining, 0);
  const late = store.srs.filter((sr) => srStat(sr).level === 'late').length;
  if (totalRemaining === 0) planningSuggest.textContent = 'Tous les SR sont terminés';
  else if (late) planningSuggest.textContent = `${late} SR à traiter en priorité · ${totalRemaining} PC en attente`;
  else planningSuggest.textContent = `${totalRemaining} PC en attente`;

  // Les cartes de lot (sous le bandeau) servent de récap détaillé ; ici on garde juste l'en-tête + l'objectif global.
}

// ── modal générique ────────────────────────────────────────────
function openModal(title, contentNode) {
  const back = el(`<div class="modal-back"><div class="modal" role="dialog" aria-modal="true"><div class="modal__head"><h2 class="modal__title"></h2><button class="modal__x" type="button" aria-label="Fermer">×</button></div><div class="modal__body"></div></div></div>`);
  back.querySelector('.modal__title').textContent = title;
  back.querySelector('.modal__body').appendChild(contentNode);
  function close() { back.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  back.querySelector('.modal__x').addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  return { close, root: back };
}

// ── outils : sauvegarde / restauration / migration ─────────────
function openTools() {
  const body = el(`<div class="tools">
    <button class="tool js-export" type="button"><strong>↧ Sauvegarder</strong><span>Télécharger un fichier de sauvegarde (.json)</span></button>
    <button class="tool js-import" type="button"><strong>↥ Restaurer</strong><span>Charger une sauvegarde — remplace les données actuelles</span></button>
    <button class="tool js-migrate" type="button"><strong>⟳ Migrer les étapes</strong><span>Appliquer la liste d'étapes actuelle aux PC en cours</span></button>
    <input type="file" accept="application/json,.json" class="js-file" hidden />
  </div>`);
  const m = openModal('Outils', body);
  const file = body.querySelector('.js-file');
  body.querySelector('.js-export').addEventListener('click', exportData);
  body.querySelector('.js-import').addEventListener('click', () => file.click());
  file.addEventListener('change', () => importData(file.files[0], m.close));
  body.querySelector('.js-migrate').addEventListener('click', () => { migrateSteps(); m.close(); });
}

function exportData() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  const a = document.createElement('a'); a.href = url; a.download = `mastering-sauvegarde-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function importData(fileObj, done) {
  if (!fileObj) return;
  const r = new FileReader();
  r.onload = () => {
    let data; try { data = JSON.parse(r.result); } catch (e) { alert('Fichier illisible : JSON invalide.'); return; }
    if (!data || !Array.isArray(data.pcs) || !Array.isArray(data.history)) { alert('Fichier non reconnu (il manque « pcs » ou « history »).'); return; }
    if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
    store = data;
    if (!VIEWS.includes(store.view)) store.view = 'rows';
    if (typeof store.seed !== 'number') store.seed = store.pcs.length;
    if (!Array.isArray(store.srs)) store.srs = [];
    if (!['todo', 'active'].includes(store.tab)) store.tab = 'todo';
    persist();
    switchBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === store.view));
    syncTabs();
    renderAll();
    if (done) done();
  };
  r.readAsText(fileObj);
}

function migrateSteps() {
  if (!store.pcs.length) { alert('Aucun PC en cours à migrer.'); return; }
  if (!confirm(`Appliquer la liste d'étapes actuelle aux ${store.pcs.length} PC en cours ?\nLes étapes cochées portant le même nom restent cochées.`)) return;
  for (const pc of store.pcs) {
    const prev = new Map(pc.steps.map((s) => [s.label, s]));
    pc.steps = STEPS.map((label) => { const old = prev.get(label); const step = { label, done: old ? !!old.done : false }; if (old && typeof old.atMs === 'number') step.atMs = old.atMs; return step; });
  }
  persist(); renderBoard(); refreshChrome();
}

function toggleStep(pc, idx) {
  pc.steps[idx].done = !pc.steps[idx].done;
  if (pc.steps[idx].done) {
    if (pc.status === 'idle') { pc.status = 'running'; pc.startedAt = Date.now(); if (!pc.firstStartedAt) pc.firstStartedAt = pc.startedAt; } // démarrage AUTO
    pc.steps[idx].atMs = elapsed(pc); // horodatage (temps travaillé) pour le temps par étape
  } else { delete pc.steps[idx].atMs; }
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
  const stepTimes = computeStepTimes(pc).map((ms, i) => ({ label: pc.steps[i].label, ms }));
  const sr = store.srs.find((s) => s.id === pc.srId);
  store.history.unshift({ name: pc.name.trim() || 'PC sans nom', totalMs: elapsed(pc), stepsDone: pc.steps.filter((s) => s.done).length, stepsTotal: pc.steps.length, startedAt: pc.firstStartedAt || (Date.now() - elapsed(pc)), finishedAt: Date.now(), accent: pc.accent, stepTimes, srId: pc.srId || null, srName: sr ? sr.name : null, size: sizeOf(pc) });
  store.pcs = store.pcs.filter((p) => p.id !== pc.id);
  persist();
  renderAll();
}

function deletePc(pc) {
  if (pc.status === 'running' && elapsed(pc) > 4000 && !confirm(`Supprimer « ${pc.name.trim() || 'ce PC'} » ? Le chrono en cours sera perdu.`)) return;
  store.pcs = store.pcs.filter((p) => p.id !== pc.id);
  persist();
  renderPlanning(); renderBoard(); refreshChrome();
}

function setView(v) {
  if (!VIEWS.includes(v) || v === store.view) return;
  store.view = v; persist();
  switchBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  renderBoard();
}

// ── historique ─────────────────────────────────────────────────
function renderHistory() {
  if (store.tab !== 'active') { histSec.hidden = true; return; }
  const today = store.history.filter((h) => isToday(h.finishedAt));
  histSec.hidden = today.length === 0;
  histSummary.innerHTML = '';
  if (today.length) {
    const timed = today.filter((h) => !h.manual); // les postes manuels comptent en volume, pas en temps
    const totalMs = timed.reduce((s, h) => s + h.totalMs, 0);
    histSummary.appendChild(el(`<div class="hstat"><span class="hstat__num">${today.length}</span><span class="hstat__lab">terminés</span></div>`));
    histSummary.appendChild(el(`<div class="hstat"><span class="hstat__num mono">${timed.length ? fmt(totalMs) : '—'}</span><span class="hstat__lab">temps total</span></div>`));
    histSummary.appendChild(el(`<div class="hstat"><span class="hstat__num mono">${timed.length ? fmt(totalMs / timed.length) : '—'}</span><span class="hstat__lab">temps moyen</span></div>`));
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
  if (tabTodoN) tabTodoN.textContent = String(todoPcs().length);
  if (tabActiveN) tabActiveN.textContent = String(activePcs().length);
}

// ── onglets ────────────────────────────────────────────────────
function syncTabs() {
  tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === store.tab));
  const vs = document.querySelector('.viewswitch');
  if (vs) vs.style.display = store.tab === 'active' ? '' : 'none';
}
function setTab(t) {
  if (!['todo', 'active'].includes(t) || t === store.tab) return;
  store.tab = t; persist();
  syncTabs();
  renderAll();
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

// ── recherche globale ──────────────────────────────────────────
function flash(node) { if (!node) return; node.classList.add('is-flash'); setTimeout(() => node.classList.remove('is-flash'), 1500); }
function focusPc(pc) {
  if (pc.status === 'idle') {
    if (store.tab !== 'todo') setTab('todo');
    const chip = board.querySelector(`.pchip[data-id="${pc.id}"]`);
    const host = chip || board.querySelector(`.lot[data-sr="${pc.srId}"]`);
    if (host) { host.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(chip || host); }
  } else {
    if (store.tab !== 'active') setTab('active');
    const e = cards.get(pc.id);
    if (e) { e.node.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(e.node); }
  }
}
function closeSearch() { if (searchResults) searchResults.hidden = true; if (searchInput) searchInput.value = ''; }
function runSearch() {
  if (!searchInput) return;
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (!q) { searchResults.hidden = true; return; }
  const rows = [];
  for (const pc of store.pcs) {
    if (!(pc.name || '').toLowerCase().includes(q)) continue;
    const sr = store.srs.find((s) => s.id === pc.srId);
    const state = pc.status === 'idle' ? { lab: 'À faire', cls: 'todo' } : { lab: pc.status === 'paused' ? 'En pause' : 'En cours', cls: 'run' };
    rows.push({ name: pc.name, srName: sr ? sr.name : '', size: sizeOf(pc), state, onClick: () => { closeSearch(); focusPc(pc); } });
  }
  for (const h of store.history) {
    if (!(h.name || '').toLowerCase().includes(q)) continue;
    rows.push({ name: h.name, srName: h.srName || '', size: h.size, state: { lab: 'Terminé', cls: 'done' }, onClick: () => { window.location.href = 'Historique.html'; } });
  }
  if (!rows.length) { searchResults.innerHTML = '<div class="search__none">Aucun PC trouvé</div>'; searchResults.hidden = false; return; }
  for (const r of rows.slice(0, 12)) {
    const item = el(`<button class="search__item" type="button"><span class="search__name"></span><span class="search__sub"></span><span class="search__state search__state--${r.state.cls}">${r.state.lab}</span></button>`);
    item.querySelector('.search__name').textContent = r.name;
    item.querySelector('.search__sub').textContent = [r.srName, r.size ? r.size + '"' : ''].filter(Boolean).join(' · ');
    item.addEventListener('click', r.onClick);
    searchResults.appendChild(item);
  }
  searchResults.hidden = false;
}

// ── affichage mural plein écran ────────────────────────────────
let wallTimer = null, wallClockTimer = null;
function wallDots(idleN, runN, doneN) {
  let s = '';
  for (let i = 0; i < doneN; i++) s += '<span class="wd wd--done"></span>';
  for (let i = 0; i < runN; i++) s += '<span class="wd wd--run"></span>';
  for (let i = 0; i < idleN; i++) s += '<span class="wd wd--idle"></span>';
  return s;
}
function wallClock() {
  const n = new Date();
  const wc = document.getElementById('wallClock');
  if (wc) wc.textContent = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`;
  const wd = document.getElementById('wallDate');
  if (wd) wd.textContent = n.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function renderWall() {
  const grid = document.getElementById('wallGrid'), stats = document.getElementById('wallStats'), wEmpty = document.getElementById('wallEmpty');
  const srs = store.srs.filter((sr) => srPcs(sr).length > 0).sort(byUrgency);
  wEmpty.hidden = srs.length > 0;
  grid.classList.toggle('wall__grid--dense', srs.length > 8);
  grid.innerHTML = '';
  const running = store.pcs.filter((p) => p.status !== 'idle').length;
  const idle = store.pcs.filter((p) => p.status === 'idle').length;
  const doneToday = store.history.filter((h) => isToday(h.finishedAt)).length;
  const late = srs.filter((sr) => srStat(sr).level === 'late').length;
  stats.innerHTML =
    `<span class="wk"><b>${idle}</b>à faire</span>` +
    `<span class="wk wk--run"><b>${running}</b>en cours</span>` +
    `<span class="wk wk--done"><b>${doneToday}</b>finis aujourd'hui</span>` +
    (late ? `<span class="wk wk--late"><b>${late}</b>en retard</span>` : '');
  for (const sr of srs) {
    const st = srStat(sr), pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    const { idle: id2, running: run2 } = lotParts(sr);
    const doneN = Math.max(0, st.total - id2.length - run2.length);
    const idleN = Math.max(0, st.total - doneN - run2.length);
    const tile = el(`<div class="walltile walltile--${st.level}"></div>`);
    if (Array.isArray(sr.accent)) tile.style.setProperty('--sr', sr.accent[0]);
    tile.appendChild(el(`<div class="walltile__top"><div class="walltile__id"><span class="walltile__name"></span><span class="walltile__city"></span></div><span class="walltile__cd">${st.dleft == null ? 'sans échéance' : countdown(st.dleft)}</span></div>`));
    tile.appendChild(el(`<div class="walltile__mid"><span class="walltile__pct">${pct}<small>%</small></span><span class="walltile__count"><span class="walltile__cnum">${doneN}<i>/${st.total}</i></span><span class="walltile__clab">PC faits</span></span></div>`));
    tile.appendChild(el(`<div class="walltile__bar"><span class="walltile__seg walltile__seg--done" style="width:${doneN / st.total * 100}%"></span><span class="walltile__seg walltile__seg--run" style="width:${run2.length / st.total * 100}%"></span></div>`));
    tile.appendChild(el(`<div class="walltile__dots">${wallDots(idleN, run2.length, doneN)}</div>`));
    tile.appendChild(el(`<div class="walltile__foot"><span>${run2.length} en cours · ${idleN} à faire</span><span>${st.remaining ? '≈ ' + fmtMin(st.workMs) : 'terminé'}</span></div>`));
    tile.querySelector('.walltile__name').textContent = sr.name;
    tile.querySelector('.walltile__city').textContent = sr.ville ? '· ' + sr.ville : '';
    grid.appendChild(tile);
  }
  wallClock();
}
function openWall() {
  renderWall();
  wallEl.hidden = false;
  if (wallEl.requestFullscreen) wallEl.requestFullscreen().catch(() => {});
  clearInterval(wallTimer); wallTimer = setInterval(renderWall, 5000);
  clearInterval(wallClockTimer); wallClockTimer = setInterval(wallClock, 1000);
}
function closeWall() {
  wallEl.hidden = true; clearInterval(wallTimer); clearInterval(wallClockTimer);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// ── init ───────────────────────────────────────────────────────
switchBtns.forEach((b) => { b.classList.toggle('active', b.dataset.view === store.view); b.addEventListener('click', () => setView(b.dataset.view)); });
tabBtns.forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
syncTabs();
renderPlanning();
renderBoard();
renderHistory();
refreshChrome();
document.getElementById('addSr').addEventListener('click', openAddSr);
if (clearDoneBtn) clearDoneBtn.addEventListener('click', clearDoneSrs);
document.getElementById('tools').addEventListener('click', openTools);
document.getElementById('clearHistory').addEventListener('click', () => { if (store.history.some((h) => isToday(h.finishedAt)) && confirm("Retirer les postes terminés aujourd'hui de cette liste ?")) { store.history = store.history.filter((h) => !isToday(h.finishedAt)); persist(); renderHistory(); } });

// recherche
if (searchInput) {
  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('focus', runSearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSearch(); searchInput.blur(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) searchResults.hidden = true; });
}
// mural
document.getElementById('wallBtn').addEventListener('click', openWall);
document.getElementById('wallClose').addEventListener('click', closeWall);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wallEl && !wallEl.hidden) closeWall(); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && wallEl && !wallEl.hidden) closeWall(); });

// chrono fiabilisé : heartbeat
setInterval(heartbeat, 30000);
document.addEventListener('visibilitychange', heartbeat);
window.addEventListener('beforeunload', heartbeat);
