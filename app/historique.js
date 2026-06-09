'use strict';

/* Page Historique — stats utiles + journal groupé par jour.
   Lit le même localStorage que l'app. */

const KEY = 'mastering.app.v7';
let store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
let H = (store.history || []).slice().sort((a, b) => b.finishedAt - a.finishedAt);

const PALETTE = [
  ['#f0b54a', '#f7cd7a'], ['#f07d6a', '#f6a08f'], ['#3fd0bf', '#6fe0d2'], ['#7fb0f5', '#a3c8f8'],
  ['#f08ab0', '#f6abc7'], ['#b59cf2', '#cbb8f6'], ['#5fd699', '#85e2b1'], ['#e6c84a', '#f0d877'],
];
const STEP_COUNT = 4; // nb d'étapes affiché pour un poste ajouté manuellement

function fmt(ms) { const t = Math.max(0, Math.floor(ms / 1000)); const p = (n) => String(n).padStart(2, '0'); return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`; }
function fmtShort(ms) { const h = Math.floor(ms / 3600000); const m = Math.round((ms % 3600000) / 60000); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`; }
function clk(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`; }
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function sameDay(a, b) { return dayKey(a) === dayKey(b); }
function shortDate(ts) { return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', ''); }
function dayLabel(ts) {
  const now = Date.now(), y = now - 86400000;
  if (sameDay(ts, now)) return "Aujourd'hui";
  if (sameDay(ts, y)) return 'Hier';
  return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function save() { store.history = H; localStorage.setItem(KEY, JSON.stringify(store)); }

const COLORS = ['#46cf94', '#7fb0f5', '#f0b54a', '#b59cf2', '#f07d6a', '#3fd0bf', '#f08ab0'];

function mk(grid, num, lab, sub, big, acc, color) {
  const c = el(`<div class="statcard${acc ? ' statcard--acc' : ''}"><span class="statcard__num ${big ? 'big' : ''}"></span><span class="statcard__lab"></span>${sub != null ? '<span class="statcard__sub"></span>' : ''}</div>`);
  const numEl = c.querySelector('.statcard__num');
  numEl.textContent = num;
  if (color) numEl.style.color = color;
  c.querySelector('.statcard__lab').textContent = lab;
  if (sub != null) c.querySelector('.statcard__sub').textContent = sub;
  grid.appendChild(c);
}

function render() {
  const has = H.length > 0;
  document.getElementById('empty').hidden = has;
  document.getElementById('statsWrap').hidden = !has;
  document.getElementById('logSection').hidden = !has;
  if (!has) return;

  // ── calculs ──
  // Volume : tous les postes. Temps : on exclut les postes « manuels » (temps saisi à la main).
  const total = H.length;
  const T = H.filter((h) => !h.manual); // postes chronométrés réellement
  const today = H.filter((h) => sameDay(h.finishedAt, Date.now()));
  const todMs = today.filter((h) => !h.manual).reduce((s, h) => s + h.totalMs, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = H.filter((h) => h.finishedAt >= weekAgo);
  const weekMs = week.filter((h) => !h.manual).reduce((s, h) => s + h.totalMs, 0);
  const dmap = new Map();
  for (const h of H) { const k = dayKey(h.finishedAt); const e = dmap.get(k) || { c: 0, ts: h.finishedAt }; e.c++; e.ts = Math.max(e.ts, h.finishedAt); dmap.set(k, e); }
  const activeDays = dmap.size;
  const best = [...dmap.values()].reduce((a, d) => (d.c > a.c ? d : a));
  const first = H.reduce((a, h) => (h.finishedAt < a.finishedAt ? h : a));
  const perDay = (total / activeDays).toFixed(1).replace(/\.0$/, '');

  // ── volume ──
  const gv = document.getElementById('statsVolume'); gv.innerHTML = '';
  mk(gv, String(today.length), "Terminés aujourd'hui", fmtShort(todMs) + ' de mastering', true, true);
  mk(gv, String(week.length), 'Cette semaine', fmtShort(weekMs) + ' au total', true);
  mk(gv, perDay, 'Postes / jour actif', 'sur ' + activeDays + ' jour' + (activeDays > 1 ? 's' : ''), true);
  mk(gv, String(best.c), 'Meilleure journée', shortDate(best.ts), true);
  mk(gv, String(total), 'Total terminés', 'depuis le ' + shortDate(first.finishedAt), true);

  // ── temps & efficacité (postes chronométrés seulement) ──
  const gt = document.getElementById('statsTime'); gt.innerHTML = '';
  if (T.length) {
    const durs = T.map((h) => h.totalMs).slice().sort((a, b) => a - b);
    const totalMs = durs.reduce((s, x) => s + x, 0);
    const n = durs.length;
    const median = n % 2 ? durs[(n - 1) / 2] : (durs[n / 2 - 1] + durs[n / 2]) / 2;
    const longest = T.reduce((a, h) => (h.totalMs > a.totalMs ? h : a));
    const shortest = T.reduce((a, h) => (h.totalMs < a.totalMs ? h : a));
    mk(gt, fmt(totalMs / n), 'Temps moyen / poste');
    mk(gt, fmt(median), 'Temps médian / poste');
    mk(gt, fmt(shortest.totalMs), 'Le plus rapide', shortest.name);
    mk(gt, fmt(longest.totalMs), 'Le plus long', longest.name);
    mk(gt, fmt(totalMs), 'Temps total cumulé');
    if (total > T.length) mk(gt, String(total - T.length), 'Saisis manuellement', 'exclus des moyennes');
  } else {
    mk(gt, '—', 'Aucun temps chronométré', 'tous les postes sont manuels');
  }

  // ── temps moyen par étape ──
  const stepAgg = new Map();
  for (const h of H) {
    if (h.manual || !Array.isArray(h.stepTimes)) continue;
    for (const st of h.stepTimes) {
      if (!st || typeof st.ms !== 'number') continue;
      const e = stepAgg.get(st.label) || { sum: 0, n: 0 };
      e.sum += st.ms; e.n++; stepAgg.set(st.label, e);
    }
  }
  const stepsWrap = document.getElementById('stepsWrap');
  const ss = document.getElementById('statsSteps'); ss.innerHTML = '';
  if (stepAgg.size) {
    stepsWrap.hidden = false;
    const rows = [...stepAgg.entries()].map(([label, e]) => ({ label, avg: e.sum / e.n, n: e.n }));
    const max = Math.max(...rows.map((r) => r.avg)) || 1;
    rows.forEach((r, i) => {
      const row = el(`<div class="stepbar"><span class="stepbar__lab"></span><span class="stepbar__track"><span class="stepbar__fill"></span></span><span class="stepbar__val"></span></div>`);
      row.querySelector('.stepbar__lab').textContent = r.label;
      const fill = row.querySelector('.stepbar__fill');
      fill.style.width = Math.max(4, (r.avg / max) * 100) + '%';
      fill.style.background = COLORS[i % COLORS.length];
      row.querySelector('.stepbar__val').textContent = fmtShort(r.avg);
      row.title = `${r.label} · moyenne sur ${r.n} poste${r.n > 1 ? 's' : ''}`;
      ss.appendChild(row);
    });
  } else {
    stepsWrap.hidden = true;
  }

  // ── activité sur 14 jours ──
  const trend = document.getElementById('statsTrend'); trend.innerHTML = '';
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const counts = [];
  for (let i = 13; i >= 0; i--) { const start = today0.getTime() - i * 86400000; const c = H.filter((h) => h.finishedAt >= start && h.finishedAt < start + 86400000).length; counts.push({ ts: start, c }); }
  const maxC = Math.max(1, ...counts.map((d) => d.c));
  for (const d of counts) {
    const bar = el(`<div class="tbar"><span class="tbar__col"><span class="tbar__fill"></span></span><span class="tbar__n"></span><span class="tbar__day"></span></div>`);
    const fill = bar.querySelector('.tbar__fill');
    fill.style.height = (d.c / maxC * 100) + '%';
    if (d.c) fill.classList.add('has');
    bar.querySelector('.tbar__n').textContent = d.c || '';
    bar.querySelector('.tbar__day').textContent = new Date(d.ts).toLocaleDateString('fr-FR', { day: 'numeric' });
    bar.title = `${shortDate(d.ts)} · ${d.c} poste${d.c > 1 ? 's' : ''}`;
    trend.appendChild(bar);
  }

  // ── journal groupé par jour ──
  const log = document.getElementById('log'); log.innerHTML = '';
  let curKey = null, curList = null;
  for (const h of H) {
    const k = dayKey(h.finishedAt);
    if (k !== curKey) {
      curKey = k;
      const items = H.filter((x) => dayKey(x.finishedAt) === k);
      const dayMs = items.reduce((s, x) => s + x.totalMs, 0);
      const wrap = el(`<div class="day"><div class="day__head"><span class="day__date"></span><span class="day__meta"></span></div><ul class="day__list"></ul></div>`);
      wrap.querySelector('.day__date').textContent = dayLabel(h.finishedAt);
      wrap.querySelector('.day__meta').textContent = `${items.length} poste${items.length > 1 ? 's' : ''} · ${fmt(dayMs)}`;
      log.appendChild(wrap);
      curList = wrap.querySelector('.day__list');
    }
    const start = h.startedAt || (h.finishedAt - h.totalMs);
    const li = el(`<li class="hentry">
      <span class="hentry__dot"></span>
      <div class="hentry__id"><span class="hentry__name"></span><span class="hentry__meta"></span></div>
      <span class="hentry__times"><time class="hentry__t">${clk(start)}</time><span class="hentry__arrow">→</span><time class="hentry__t">${clk(h.finishedAt)}</time></span>
      ${h.manual ? '<span class="hentry__steps hentry__steps--manual" title="Temps saisi manuellement — exclu des moyennes">manuel</span>' : `<span class="hentry__steps">${h.stepsDone}/${h.stepsTotal}</span>`}
      <button class="hentry__dur hentry__dur--edit${h.manual ? ' hentry__dur--manual' : ''}" type="button" title="Modifier le temps de mastering">${fmt(h.totalMs)}</button>
      <button class="hentry__del" type="button" aria-label="Retirer">×</button>
    </li>`);
    if (h.accent) li.querySelector('.hentry__dot').style.background = h.accent[0];
    li.querySelector('.hentry__name').textContent = h.name;
    const meta = [h.srName, h.size ? h.size + '"' : ''].filter(Boolean).join(' · ');
    const metaEl = li.querySelector('.hentry__meta'); if (meta) metaEl.textContent = meta; else metaEl.remove();
    li.querySelector('.hentry__dur').addEventListener('click', () => openEditTime(h));
    li.querySelector('.hentry__del').addEventListener('click', () => { H = H.filter((x) => x !== h); save(); render(); });
    curList.appendChild(li);
  }
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
  return { close };
}

function clampInt(v, lo, hi) { v = parseInt(v, 10); if (isNaN(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
function dtLocal(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function suggestName() {
  let best = null;
  for (const h of H) { const m = /^(.*?)(\d+)\s*$/.exec(h.name || ''); if (!m) continue; const num = parseInt(m[2], 10); if (!best || num >= best.num) best = { prefix: m[1], num, len: m[2].length }; }
  return best ? best.prefix + String(best.num + 1).padStart(best.len, '0') : '';
}

// ── ajouter un poste déjà masterisé ────────────────────────────
function openAddDone() {
  const body = el(`<form class="mform">
    <label class="mfield"><span>Nom du poste</span><input name="name" type="text" maxlength="40" autocomplete="off" /></label>
    <div class="mrow">
      <label class="mfield"><span>Heures</span><input name="h" type="number" min="0" max="99" value="0" /></label>
      <label class="mfield"><span>Minutes</span><input name="m" type="number" min="0" max="59" value="45" /></label>
    </div>
    <label class="mfield"><span>Terminé le</span><input name="when" type="datetime-local" /></label>
    <p class="mform__hint">Marqué « manuel » : compté en volume mais exclu des moyennes de temps.</p>
    <div class="mform__actions"><button type="button" class="key key--sm js-cancel">Annuler</button><button type="submit" class="key key--brand key--sm">Ajouter</button></div>
  </form>`);
  body.querySelector('[name=name]').value = suggestName();
  body.querySelector('[name=when]').value = dtLocal(Date.now());
  const m = openModal('Ajouter un poste terminé', body);
  body.querySelector('.js-cancel').addEventListener('click', m.close);
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = body.querySelector('[name=name]').value.trim() || 'Poste';
    const ms = (clampInt(body.querySelector('[name=h]').value, 0, 99) * 3600 + clampInt(body.querySelector('[name=m]').value, 0, 59) * 60) * 1000;
    const whenV = body.querySelector('[name=when]').value;
    const finishedAt = whenV ? new Date(whenV).getTime() : Date.now();
    H.unshift({ name, totalMs: ms, stepsDone: STEP_COUNT, stepsTotal: STEP_COUNT, startedAt: finishedAt - ms, finishedAt, accent: PALETTE[H.length % PALETTE.length], manual: true });
    H.sort((a, b) => b.finishedAt - a.finishedAt);
    save(); render(); m.close();
  });
  body.querySelector('[name=name]').focus();
}

// ── modifier le temps d'un poste (le passe en « manuel ») ──────
function openEditTime(h) {
  const body = el(`<form class="mform">
    <div class="mrow">
      <label class="mfield"><span>Heures</span><input name="h" type="number" min="0" max="99" /></label>
      <label class="mfield"><span>Minutes</span><input name="m" type="number" min="0" max="59" /></label>
    </div>
    <p class="mform__hint">En modifiant le temps, ce poste ne comptera plus dans les moyennes.</p>
    <div class="mform__actions"><button type="button" class="key key--sm js-cancel">Annuler</button><button type="submit" class="key key--brand key--sm">Enregistrer</button></div>
  </form>`);
  body.querySelector('[name=h]').value = Math.floor(h.totalMs / 3600000);
  body.querySelector('[name=m]').value = Math.round((h.totalMs % 3600000) / 60000);
  const m = openModal(`Temps de « ${h.name} »`, body);
  body.querySelector('.js-cancel').addEventListener('click', m.close);
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    const ms = (clampInt(body.querySelector('[name=h]').value, 0, 99) * 3600 + clampInt(body.querySelector('[name=m]').value, 0, 59) * 60) * 1000;
    h.totalMs = ms; h.startedAt = h.finishedAt - ms; h.manual = true;
    save(); render(); m.close();
  });
}

render();

document.getElementById('addDone').addEventListener('click', openAddDone);
document.getElementById('clearAll').addEventListener('click', () => {
  if (H.length && confirm("Vider TOUT l'historique ? Cette action est irréversible.")) { H = []; save(); render(); }
});

function tickClock() {
  const n = new Date();
  document.getElementById('clockTime').textContent = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  document.getElementById('clockDate').textContent = n.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
}
tickClock(); setInterval(tickClock, 15000);
