'use strict';

/* ════════════════════════════════════════════════════════════
   ATELIER MASTERING — logique
   État persistant (localStorage), timers qui survivent au refresh,
   plusieurs PC en parallèle, check-list, historique + stats.
   ════════════════════════════════════════════════════════════ */

// ── Étapes par défaut (à peaufiner plus tard) ──────────────────
const DEFAULT_STEPS = [
  'Réception & inventaire',
  'Démarrage / BIOS-UEFI',
  'Déploiement image / Windows',
  'Pilotes & mises à jour',
  'Logiciels & configuration',
  'Tests & contrôle qualité',
  'Nettoyage & étiquetage',
];

// ── Palette d'accents tournante (un look par PC) ───────────────
const ACCENTS = [
  ['var(--coral)', 'var(--coral-deep)'],
  ['var(--peri)',  'var(--peri-deep)'],
  ['var(--mint)',  'var(--mint-deep)'],
  ['var(--lilac)', 'var(--lilac-deep)'],
  ['var(--sky)',   'var(--sky-deep)'],
  ['var(--butter)','var(--butter-deep)'],
];

const STORAGE_KEY = 'mastering.state.v1';

// ── État ───────────────────────────────────────────────────────
let state = load();
let accentSeed = state.accentSeed || 0;

// ── Refs DOM ───────────────────────────────────────────────────
const grid        = document.getElementById('pcGrid');
const emptyState  = document.getElementById('emptyState');
const tpl         = document.getElementById('pcTemplate');
const historySec  = document.getElementById('historySection');
const historyList = document.getElementById('historyList');

const els = {
  active: document.getElementById('statActive'),
  done:   document.getElementById('statDone'),
  avg:    document.getElementById('statAvg'),
  total:  document.getElementById('statTotal'),
};

// Map id → { node, timeEl } pour mises à jour ciblées (pas de re-render global)
const cards = new Map();

// ════════════════════════════════════════════════════════════
//  Persistance
// ════════════════════════════════════════════════════════════
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pcs: Array.isArray(parsed.pcs) ? parsed.pcs : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
        accentSeed: parsed.accentSeed || 0,
      };
    }
  } catch (e) { /* état corrompu → repart propre */ }
  return { pcs: [], history: [], accentSeed: 0 };
}

function save() {
  state.accentSeed = accentSeed;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

// ════════════════════════════════════════════════════════════
//  Helpers temps
// ════════════════════════════════════════════════════════════
function elapsed(pc) {
  const live = (pc.status === 'running' && pc.startedAt) ? Date.now() - pc.startedAt : 0;
  return pc.accumulatedMs + live;
}

function fmt(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function fmtShort(ms) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')}`;
  const s = t % 60;
  return m > 0 ? `${m} min` : `${s} s`;
}

function isToday(ts) {
  const d = new Date(ts), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ════════════════════════════════════════════════════════════
//  Actions sur les PC
// ════════════════════════════════════════════════════════════
function addPc() {
  const accent = ACCENTS[accentSeed % ACCENTS.length];
  accentSeed++;
  const pc = {
    id: uid(),
    name: '',
    status: 'idle',           // idle | running | paused
    accumulatedMs: 0,
    startedAt: null,
    accent,
    steps: DEFAULT_STEPS.map((label) => ({ label, done: false })),
    createdAt: Date.now(),
  };
  state.pcs.push(pc);
  save();
  const node = buildCard(pc);
  grid.appendChild(node);
  refreshChrome();
  node.querySelector('.pc-card__name').focus();
}

function startOrPause(pc) {
  if (pc.status === 'running') {
    pc.accumulatedMs += Date.now() - pc.startedAt;
    pc.startedAt = null;
    pc.status = 'paused';
  } else {
    pc.startedAt = Date.now();
    pc.status = 'running';
  }
  save();
  syncCard(pc);
}

function finishPc(pc) {
  const total = elapsed(pc);
  state.history.unshift({
    id: pc.id,
    name: pc.name.trim() || 'PC sans nom',
    totalMs: total,
    stepsDone: pc.steps.filter((s) => s.done).length,
    stepsTotal: pc.steps.length,
    finishedAt: Date.now(),
  });
  state.pcs = state.pcs.filter((p) => p.id !== pc.id);
  save();

  const entry = cards.get(pc.id);
  if (entry) {
    entry.node.style.animation = 'pop-in 0.3s reverse forwards';
    setTimeout(() => { entry.node.remove(); cards.delete(pc.id); refreshChrome(); }, 260);
  }
  renderHistory();
}

function deletePc(pc) {
  const running = pc.status === 'running' && elapsed(pc) > 3000;
  if (running && !confirm(`Supprimer « ${pc.name.trim() || 'ce PC'} » ? Le chrono en cours sera perdu.`)) return;
  state.pcs = state.pcs.filter((p) => p.id !== pc.id);
  save();
  const entry = cards.get(pc.id);
  if (entry) {
    entry.node.style.animation = 'pop-in 0.25s reverse forwards';
    setTimeout(() => { entry.node.remove(); cards.delete(pc.id); refreshChrome(); }, 220);
  }
}

function toggleStep(pc, idx) {
  pc.steps[idx].done = !pc.steps[idx].done;
  save();
  syncCard(pc);
}

// ════════════════════════════════════════════════════════════
//  Construction d'une carte
// ════════════════════════════════════════════════════════════
function buildCard(pc) {
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.style.setProperty('--accent', pc.accent[0]);
  node.style.setProperty('--accent-deep', pc.accent[1]);
  node.dataset.id = pc.id;

  // Nom
  const nameInput = node.querySelector('.pc-card__name');
  nameInput.value = pc.name;
  nameInput.addEventListener('input', () => { pc.name = nameInput.value; save(); });

  // Supprimer
  node.querySelector('.pc-card__del').addEventListener('click', () => deletePc(pc));

  // Étapes
  const stepsUl = node.querySelector('.pc-card__steps');
  pc.steps.forEach((step, idx) => {
    const li = document.createElement('li');
    li.className = 'step' + (step.done ? ' done' : '');
    li.setAttribute('role', 'checkbox');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-checked', step.done ? 'true' : 'false');
    li.innerHTML = `<span class="step__box" aria-hidden="true"></span><span class="step__label"></span>`;
    li.querySelector('.step__label').textContent = step.label;
    const fire = () => toggleStep(pc, idx);
    li.addEventListener('click', fire);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
    });
    stepsUl.appendChild(li);
  });

  // Boutons
  node.querySelector('.js-toggle').addEventListener('click', () => startOrPause(pc));
  node.querySelector('.js-finish').addEventListener('click', () => finishPc(pc));

  const entry = {
    node,
    timeEl:   node.querySelector('.pc-card__time'),
    statusEl: node.querySelector('.pc-card__status'),
    fillEl:   node.querySelector('.progress-fill'),
    countEl:  node.querySelector('.pc-card__count'),
    toggleEl: node.querySelector('.js-toggle'),
    stepsEls: Array.from(stepsUl.children),
  };
  cards.set(pc.id, entry);
  syncCard(pc);
  return node;
}

// Met à jour l'apparence d'une carte (hors tick chrono)
function syncCard(pc) {
  const e = cards.get(pc.id);
  if (!e) return;
  const { node } = e;

  node.classList.toggle('is-running', pc.status === 'running');
  node.classList.toggle('is-paused', pc.status === 'paused');

  // Statut texte
  const label = pc.status === 'running' ? 'En cours' : pc.status === 'paused' ? 'En pause' : 'À démarrer';
  e.statusEl.textContent = label;

  // Bouton démarrer/pause (toujours en menthe, le bouton Terminé reste l'unique ambre)
  e.toggleEl.textContent = pc.status === 'running' ? '⏸ Pause' : (pc.status === 'paused' ? '▶ Reprendre' : '▶ Démarrer');

  // Étapes + progress
  let done = 0;
  pc.steps.forEach((s, i) => {
    const li = e.stepsEls[i];
    li.classList.toggle('done', s.done);
    li.setAttribute('aria-checked', s.done ? 'true' : 'false');
    if (s.done) done++;
  });
  const pct = pc.steps.length ? Math.round((done / pc.steps.length) * 100) : 0;
  e.fillEl.style.width = pct + '%';
  e.countEl.textContent = `${done} / ${pc.steps.length} étapes`;
  node.classList.toggle('all-done', done === pc.steps.length && pc.steps.length > 0);

  e.timeEl.textContent = fmt(elapsed(pc));
}

// ════════════════════════════════════════════════════════════
//  Tick chrono (une seule horloge pour tous les PC actifs)
// ════════════════════════════════════════════════════════════
function tick() {
  for (const pc of state.pcs) {
    if (pc.status === 'running') {
      const e = cards.get(pc.id);
      if (e) e.timeEl.textContent = fmt(elapsed(pc));
    }
  }
}
setInterval(tick, 1000);

// ════════════════════════════════════════════════════════════
//  Historique + stats
// ════════════════════════════════════════════════════════════
function renderHistory() {
  historyList.innerHTML = '';
  historySec.hidden = state.history.length === 0;

  for (const h of state.history) {
    const li = document.createElement('li');
    li.className = 'hist-item';
    const date = new Date(h.finishedAt);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    li.innerHTML = `
      <span class="hist-item__dot" aria-hidden="true"></span>
      <span class="hist-item__name"></span>
      <span class="hist-item__meta">${h.stepsDone}/${h.stepsTotal} étapes · ${hh}h${mm}</span>
      <span class="hist-item__time">${fmt(h.totalMs)}</span>
      <button class="hist-item__del" type="button" aria-label="Retirer de l'historique" title="Retirer">×</button>`;
    li.querySelector('.hist-item__name').textContent = h.name;
    li.querySelector('.hist-item__del').addEventListener('click', () => {
      state.history = state.history.filter((x) => x !== h);
      save();
      renderHistory();
    });
    historyList.appendChild(li);
  }
  updateStats();
}

function updateStats() {
  els.active.textContent = state.pcs.length;

  const today = state.history.filter((h) => isToday(h.finishedAt));
  els.done.textContent = today.length;

  if (today.length) {
    const totalMs = today.reduce((sum, h) => sum + h.totalMs, 0);
    els.avg.textContent = fmtShort(totalMs / today.length);
    els.total.textContent = fmtShort(totalMs);
  } else {
    els.avg.textContent = '—';
    els.total.textContent = '—';
  }
}

function refreshChrome() {
  emptyState.hidden = state.pcs.length > 0;
  updateStats();
}

// ════════════════════════════════════════════════════════════
//  Init
// ════════════════════════════════════════════════════════════
function init() {
  // Reconstruit les cartes existantes (timers running continuent tout seuls)
  for (const pc of state.pcs) {
    if (!pc.accent) pc.accent = ACCENTS[(accentSeed++) % ACCENTS.length];
    grid.appendChild(buildCard(pc));
  }
  renderHistory();
  refreshChrome();

  document.getElementById('addPc').addEventListener('click', addPc);
  document.getElementById('clearHistory').addEventListener('click', () => {
    if (state.history.length && confirm('Vider tout l\'historique des PC terminés ?')) {
      state.history = [];
      save();
      renderHistory();
    }
  });
}

init();
