'use strict';

/* Page Historique — stats utiles + journal groupé par jour.
   Lit le même localStorage que l'app. */

const KEY = 'mastering.app.v6';
let store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
let H = (store.history || []).slice().sort((a, b) => b.finishedAt - a.finishedAt);

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

function mk(grid, num, lab, sub, big) {
  const c = el(`<div class="statcard"><span class="statcard__num ${big ? 'big' : ''}"></span><span class="statcard__lab"></span>${sub != null ? '<span class="statcard__sub"></span>' : ''}</div>`);
  c.querySelector('.statcard__num').textContent = num;
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
  const total = H.length;
  const durs = H.map((h) => h.totalMs).slice().sort((a, b) => a - b);
  const totalMs = durs.reduce((s, x) => s + x, 0);
  const avg = totalMs / total;
  const n = durs.length;
  const median = n % 2 ? durs[(n - 1) / 2] : (durs[n / 2 - 1] + durs[n / 2]) / 2;
  const longest = H.reduce((a, h) => (h.totalMs > a.totalMs ? h : a));
  const shortest = H.reduce((a, h) => (h.totalMs < a.totalMs ? h : a));
  const today = H.filter((h) => sameDay(h.finishedAt, Date.now()));
  const todMs = today.reduce((s, h) => s + h.totalMs, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = H.filter((h) => h.finishedAt >= weekAgo);
  const weekMs = week.reduce((s, h) => s + h.totalMs, 0);
  const dmap = new Map();
  for (const h of H) { const k = dayKey(h.finishedAt); const e = dmap.get(k) || { c: 0, ts: h.finishedAt }; e.c++; e.ts = Math.max(e.ts, h.finishedAt); dmap.set(k, e); }
  const activeDays = dmap.size;
  const best = [...dmap.values()].reduce((a, d) => (d.c > a.c ? d : a));
  const first = H.reduce((a, h) => (h.finishedAt < a.finishedAt ? h : a));
  const perDay = (total / activeDays).toFixed(1).replace(/\.0$/, '');

  // ── volume ──
  const gv = document.getElementById('statsVolume'); gv.innerHTML = '';
  mk(gv, String(today.length), "Terminés aujourd'hui", fmtShort(todMs) + ' de mastering', true);
  mk(gv, String(week.length), 'Cette semaine', fmtShort(weekMs) + ' au total', true);
  mk(gv, perDay, 'Postes / jour actif', 'sur ' + activeDays + ' jour' + (activeDays > 1 ? 's' : ''), true);
  mk(gv, String(best.c), 'Meilleure journée', shortDate(best.ts), true);
  mk(gv, String(total), 'Total terminés', 'depuis le ' + shortDate(first.finishedAt), true);

  // ── temps & efficacité ──
  const gt = document.getElementById('statsTime'); gt.innerHTML = '';
  mk(gt, fmt(avg), 'Temps moyen / poste');
  mk(gt, fmt(median), 'Temps médian / poste');
  mk(gt, fmt(shortest.totalMs), 'Le plus rapide', shortest.name);
  mk(gt, fmt(longest.totalMs), 'Le plus long', longest.name);
  mk(gt, fmt(totalMs), 'Temps total cumulé');

  // ── temps moyen par étape ──
  const stepAgg = new Map();
  for (const h of H) {
    if (!Array.isArray(h.stepTimes)) continue;
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
    for (const r of rows) {
      const row = el(`<div class="stepbar"><span class="stepbar__lab"></span><span class="stepbar__track"><span class="stepbar__fill"></span></span><span class="stepbar__val"></span></div>`);
      row.querySelector('.stepbar__lab').textContent = r.label;
      row.querySelector('.stepbar__fill').style.width = Math.max(4, (r.avg / max) * 100) + '%';
      row.querySelector('.stepbar__val').textContent = fmtShort(r.avg);
      row.title = `${r.label} · moyenne sur ${r.n} poste${r.n > 1 ? 's' : ''}`;
      ss.appendChild(row);
    }
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
    li.querySelector('.hist__del').addEventListener('click', () => { H = H.filter((x) => x !== h); save(); render(); });
    curList.appendChild(li);
  }
}

render();

document.getElementById('clearAll').addEventListener('click', () => {
  if (H.length && confirm("Vider TOUT l'historique ? Cette action est irréversible.")) { H = []; save(); render(); }
});

function tickClock() {
  const n = new Date();
  document.getElementById('clockTime').textContent = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  document.getElementById('clockDate').textContent = n.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
}
tickClock(); setInterval(tickClock, 15000);
