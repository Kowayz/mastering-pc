/* ════════════════════════════════════════════════════════════
   MASTERING PC — app pro plein écran
   Surfaces nettes, typo grotesk, timer mono, accents par poste.
   Boutons « keycap » mécaniques (relief 3D, s'enfoncent au clic).
   ════════════════════════════════════════════════════════════ */

:root {
  --bg:        #0d1124;
  --bg-grad:   #161d33;
  --surface:   #161d33;
  --surface-2: #1f2746;

  --ink:       #eef1fb;
  --ink-soft:  #aab3d2;
  --ink-faint: #6f7aa0;
  --line:      #2c365c;
  --line-soft: #232b4a;

  /* keycaps — graphite */
  --key-face-1: #424954;
  --key-face-2: #2f353e;
  --key-edge:   #171b21;
  --green-1:    #27b06f;
  --green-2:    #1f9b62;
  --green-edge: #126045;

  --brand-1: #4d7fe0;
  --brand-2: #3a63c4;
  --brand-edge: #28468c;

  --r-card: 18px;
  --r-key:  11px;
  --shadow-card: 0 1px 0 rgba(255,255,255,.04), 0 14px 30px -14px rgba(0,0,0,.75);

  --font-ui:   "Hanken Grotesk", system-ui, sans-serif;
  --font-key:  "Oswald", system-ui, sans-serif;
  --font-mono: "Spline Sans Mono", ui-monospace, monospace;
}

* { box-sizing: border-box; }

html, body { height: 100%; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-ui);
  color: var(--ink);
  background:
    radial-gradient(135% 75% at 50% -25%, var(--bg-grad), transparent 60%),
    radial-gradient(120% 70% at 100% 0%, #1c2547 0%, transparent 55%),
    var(--bg);
  background-attachment: fixed;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .25; transform: scale(.55); } }
@keyframes nudge { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes card-out { to { opacity: 0; transform: scale(.97); } }

/* ──────────────── Keycaps (boutons 3D, repris du n°2) ──────────────── */
.key {
  font-family: var(--font-key);
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: #fff;
  border: none;
  cursor: pointer;
  border-radius: var(--r-key);
  padding: 13px 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform .07s ease, box-shadow .07s ease, filter .15s ease;
}
.key__ico { font-size: 1.05em; line-height: 0; }
.key--primary {
  background: linear-gradient(180deg, var(--key-face-1), var(--key-face-2));
  box-shadow: 0 5px 0 var(--key-edge), 0 9px 16px rgba(20,23,28,.26), inset 0 1px 0 rgba(255,255,255,.14);
}
.key--primary:hover { filter: brightness(1.1); }
.key--primary:active { transform: translateY(5px); box-shadow: 0 0 0 var(--key-edge), 0 2px 7px rgba(20,23,28,.3); }
.key--finish {
  background: linear-gradient(180deg, var(--green-1), var(--green-2));
  box-shadow: 0 5px 0 var(--green-edge), 0 9px 16px rgba(18,80,46,.28), inset 0 1px 0 rgba(255,255,255,.28);
}
.key--finish:hover { filter: brightness(1.05); }
.key--finish:active { transform: translateY(5px); box-shadow: 0 0 0 var(--green-edge), 0 2px 7px rgba(18,80,46,.3); }
.key--brand {
  background: linear-gradient(180deg, var(--brand-1), var(--brand-2));
  box-shadow: 0 5px 0 var(--brand-edge), 0 9px 16px rgba(18,38,86,.45), inset 0 1px 0 rgba(255,255,255,.2);
}
.key--brand:hover { filter: brightness(1.09); }
.key--brand:active { transform: translateY(5px); box-shadow: 0 0 0 var(--brand-edge), 0 2px 7px rgba(40,30,120,.4); }
.key:focus-visible { outline: 2px solid #9bb0c8; outline-offset: 3px; }
.key[disabled] { opacity: .45; cursor: not-allowed; filter: grayscale(.3); transform: none; }

/* ──────────────── Layout plein écran ──────────────── */
.shell { min-height: 100vh; display: flex; flex-direction: column; }

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 15px clamp(20px, 3.5vw, 48px);
  background: linear-gradient(180deg, rgba(28,36,64,.9), rgba(16,21,40,.84));
  backdrop-filter: blur(14px) saturate(1.1);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 1px 0 rgba(255,255,255,.04), 0 8px 24px -14px rgba(0,0,0,.7);
}
.brand { display: flex; align-items: center; gap: 13px; min-width: 0; }
.brand__mark {
  position: relative;
  width: 44px; height: 44px; flex: 0 0 auto;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: var(--font-key); font-weight: 600; font-size: 21px; color: #fff;
  background: linear-gradient(180deg, var(--brand-1), var(--brand-2));
  box-shadow: 0 3px 0 var(--brand-edge), 0 5px 11px rgba(18,38,86,.45), inset 0 1px 0 rgba(255,255,255,.22);
}
.brand__mark::after { content: ""; position: absolute; inset: 5px 5px auto 5px; height: 38%; border-radius: 8px 8px 4px 4px; background: linear-gradient(rgba(255,255,255,.16), transparent); }
.brand__name { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -.01em; line-height: 1.1; white-space: nowrap; }
.brand__sub { margin: 2px 0 0; font-size: 12px; color: var(--ink-faint); font-weight: 700; letter-spacing: .02em; text-transform: uppercase; white-space: nowrap; }

.topbar__right { display: flex; align-items: center; gap: 14px; }
.clock { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; padding-right: 14px; border-right: 1px solid var(--line); }
.clock__time { font-family: var(--font-mono); font-weight: 600; font-size: 17px; color: var(--ink); font-variant-numeric: tabular-nums; letter-spacing: .01em; }
.clock__date { font-size: 11px; font-weight: 700; color: var(--ink-faint); text-transform: capitalize; margin-top: 1px; }
.counter { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 700; color: var(--ink-soft); padding: 7px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 999px; box-shadow: inset 0 1px 0 rgba(255,255,255,.6); white-space: nowrap; }
.counter__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-faint); flex: 0 0 auto; }
.counter.is-live .counter__dot { background: var(--green-2); box-shadow: 0 0 0 3px rgba(34,138,83,.18); animation: pulse 1.4s ease-in-out infinite; }
.counter__sep { width: 1px; height: 14px; background: var(--line); }
.counter__total { color: var(--ink-faint); }
.counter strong { color: var(--ink); font-variant-numeric: tabular-nums; }
.counter__total strong { color: var(--ink-soft); }
.navlink { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-ui); font-size: 13px; font-weight: 700; color: var(--ink-soft); text-decoration: none; padding: 9px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); transition: all .15s; }
.navlink svg { width: 14px; height: 14px; fill: currentColor; flex: 0 0 auto; }
.navlink:hover { color: var(--ink); border-color: color-mix(in srgb, var(--ink-faint) 45%, var(--line)); }
.topbar::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: linear-gradient(90deg, transparent 8%, color-mix(in srgb, #7fb0f5 55%, transparent), color-mix(in srgb, #5fd699 45%, transparent), transparent 92%); opacity: .45; }

main { flex: 1 1 auto; padding: clamp(22px, 3vw, 40px) clamp(20px, 3.5vw, 48px) 56px; }

.section-label {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 16px;
}
.section-label::after { content: ""; flex: 1 1 auto; height: 1px; background: var(--line); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: clamp(16px, 1.6vw, 22px);
  align-items: start;
}

/* ──────────────── Carte PC ──────────────── */
.card {
  --accent: #4f6bed;
  --accent-deep: #3a51c2;
  position: relative;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: 20px 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: var(--shadow-card);
  transition: box-shadow .2s ease, border-color .2s ease, transform .2s ease;
}
.card.is-running { border-color: color-mix(in srgb, var(--accent) 55%, var(--line)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent), 0 1px 2px rgba(20,28,40,.05), 0 10px 30px color-mix(in srgb, var(--accent) 16%, transparent); }

.card__head { display: flex; align-items: center; gap: 11px; }
.tag { width: 13px; height: 13px; flex: 0 0 auto; border-radius: 5px; background: linear-gradient(150deg, var(--accent), var(--accent-deep)); box-shadow: inset 0 1px 1px rgba(255,255,255,.35); }
.card__name {
  flex: 1 1 auto; min-width: 0;
  font-family: var(--font-ui); font-size: 17px; font-weight: 800; letter-spacing: -.01em;
  color: var(--ink); background: transparent; border: none;
  padding: 6px 8px; border-radius: 8px;
  transition: background .15s, box-shadow .15s;
}
.card__name::placeholder { color: var(--ink-faint); font-weight: 600; }
.card__name:hover { background: var(--surface-2); }
.card__name:focus { outline: none; background: var(--surface-2); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 60%, var(--line)); }
.card__del {
  flex: 0 0 auto; width: 32px; height: 32px;
  border: 1px solid var(--line); background: var(--surface); border-radius: 9px;
  color: var(--ink-faint); cursor: pointer; font-size: 17px; line-height: 0;
  display: grid; place-items: center;
  transition: all .15s;
}
.card__del:hover { color: #f0a3b3; border-color: #5e3340; background: #3a2630; }

/* timer */
.card__meter {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: 13px;
}
.timer {
  font-family: var(--font-mono); font-weight: 600;
  font-size: 30px; letter-spacing: -.01em; line-height: 1;
  color: var(--ink); font-variant-numeric: tabular-nums;
}
.card.is-running .timer { color: var(--accent-deep); }
.status {
  font-size: 11.5px; font-weight: 700; letter-spacing: .02em;
  padding: 5px 11px; border-radius: 999px; white-space: nowrap;
  background: var(--surface-2); color: var(--ink-soft);
}
.card.is-running .status { background: color-mix(in srgb, var(--accent) 24%, var(--surface)); color: var(--accent-deep); }
.card.is-running .status::before {
  content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 6px;
  border-radius: 50%; background: currentColor; vertical-align: middle;
  animation: pulse 1.1s ease-in-out infinite;
}

/* progress */
.card__progress { display: flex; align-items: center; gap: 12px; }
.bar { flex: 1 1 auto; height: 8px; border-radius: 999px; background: #e7eaef; overflow: hidden; }
.fill { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, var(--accent), var(--accent-deep)); transition: width .45s cubic-bezier(.4,0,.2,1); }
.count { font-size: 12.5px; font-weight: 800; color: var(--ink-faint); white-space: nowrap; font-variant-numeric: tabular-nums; }

/* steps */
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.step {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 8px; border-radius: 9px; cursor: pointer; user-select: none;
  transition: background .15s;
}
.step:hover { background: var(--surface-2); }
.step__box {
  flex: 0 0 auto; width: 22px; height: 22px; border-radius: 7px;
  border: 1.5px solid var(--line); background: var(--surface);
  display: grid; place-items: center;
  transition: all .18s cubic-bezier(.34,1.4,.64,1);
}
.step__box::after { content: "✓"; font-size: 13px; font-weight: 800; color: #fff; opacity: 0; transform: scale(.4); transition: all .18s cubic-bezier(.34,1.4,.64,1); }
.step.done .step__box { background: linear-gradient(150deg, var(--accent), var(--accent-deep)); border-color: var(--accent-deep); }
.step.done .step__box::after { opacity: 1; transform: scale(1); }
.step__label { flex: 1 1 auto; min-width: 0; font-size: 14.5px; font-weight: 600; color: var(--ink-soft); transition: color .15s; }
.step.done .step__label { color: var(--ink-faint); text-decoration: line-through; text-decoration-thickness: 1.5px; }

/* actions */
.card__actions { margin-top: 3px; }
.card__actions .key { width: 100%; }
.card.all-done .key--finish { animation: nudge 1.2s ease-in-out infinite; }

/* ──────────────── État vide ──────────────── */
.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: clamp(40px, 8vh, 90px) 20px;
  border: 1.5px dashed var(--line);
  border-radius: 20px;
  background: rgba(255,255,255,.025);
}
.empty__mark {
  width: 56px; height: 56px; margin: 0 auto 16px;
  border-radius: 15px; display: grid; place-items: center;
  background: var(--surface); border: 1px solid var(--line);
  font-family: var(--font-key); font-size: 26px; color: var(--ink-faint);
  box-shadow: var(--shadow-card);
}
.empty__title { margin: 0 0 5px; font-size: 18px; font-weight: 800; color: var(--ink); }
.empty__text { margin: 0; font-size: 14px; color: var(--ink-soft); }

/* ──────────────── Terminés aujourd'hui ──────────────── */
.history { margin-top: 44px; }
.history__head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.history__title { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); margin: 0; }
.history__tools { display: flex; align-items: center; gap: 16px; }
.history__link { font-size: 12.5px; font-weight: 700; color: #84aee8; text-decoration: none; white-space: nowrap; }
.history__link:hover { text-decoration: underline; }
.history__clear { font-family: var(--font-ui); font-size: 12.5px; font-weight: 700; color: var(--ink-faint); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 7px; }
.history__clear:hover { color: #f0a3b3; }

.hist-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.hstat { display: flex; flex-direction: column; gap: 3px; padding: 12px 18px; min-width: 116px; background: var(--surface); border: 1px solid var(--line); border-radius: 13px; box-shadow: var(--shadow-card); }
.hstat__num { font-size: 21px; font-weight: 800; color: var(--ink); line-height: 1; }
.hstat__num.mono { font-family: var(--font-mono); font-weight: 600; font-size: 18px; letter-spacing: -.02em; }
.hstat__lab { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-faint); }

.history__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 10px; }
.hist { display: grid; grid-template-columns: auto minmax(0,1fr) auto auto auto auto; align-items: center; gap: 13px; padding: 12px 16px; border-radius: 13px; background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow-card); }
.hist__dot { width: 11px; height: 11px; border-radius: 50%; flex: 0 0 auto; background: #5fd699; box-shadow: inset 0 1px 1px rgba(255,255,255,.3); }
.hist__name { min-width: 0; font-weight: 800; font-size: 14.5px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist__times { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-soft); white-space: nowrap; }
.hist__arrow { color: var(--ink-faint); }
.hist__chip { font-size: 11px; font-weight: 800; color: var(--ink-faint); white-space: nowrap; }
.hist__dur { font-family: var(--font-mono); font-weight: 600; font-size: 14px; color: var(--ink); font-variant-numeric: tabular-nums; padding: 4px 11px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line-soft); white-space: nowrap; }
.hist__del { background: none; border: none; cursor: pointer; color: var(--ink-faint); font-size: 17px; line-height: 0; padding: 4px 4px; border-radius: 7px; }
.hist__del:hover { color: #f0a3b3; }

.foot { text-align: center; padding: 0 20px 36px; color: var(--ink-faint); font-size: 12.5px; font-weight: 600; }

/* ════════════════════════════════════════════════════════════
   Jauge à segments + dispositions (Rangées / Mini-cartes / Tableau)
   ════════════════════════════════════════════════════════════ */
.gauge__segs { display: flex; gap: 5px; }
.seg { flex: 1 1 0; height: 12px; border-radius: 5px; border: none; padding: 0; background: #232c4c; cursor: pointer; transition: all .18s; }
.seg.done { background: linear-gradient(180deg, var(--accent), var(--accent-deep)); box-shadow: inset 0 1px 0 rgba(255,255,255,.3); }
.seg:hover { transform: translateY(-1px); }
.seg:not(.done):hover { background: color-mix(in srgb, var(--accent) 30%, #232c4c); }
.gauge__step { font-weight: 700; color: var(--ink); }
.region__count { font-size: 12.5px; font-weight: 800; color: var(--ink-faint); font-variant-numeric: tabular-nums; white-space: nowrap; }

/* keycap compact + états « en cours » génériques */
.key--sm { font-size: 12.5px; padding: 9px 15px; border-radius: 9px; letter-spacing: .05em; }
.key--finish.key--sm { box-shadow: 0 4px 0 var(--green-edge), 0 7px 11px rgba(18,80,46,.24), inset 0 1px 0 rgba(255,255,255,.26); }
.key--finish.key--sm:active { transform: translateY(4px); box-shadow: 0 0 0 var(--green-edge), 0 2px 6px rgba(18,80,46,.3); }
.key--icon { padding: 0; width: 38px; height: 36px; flex: 0 0 auto; }
.key--pause { background: linear-gradient(180deg, #5a6678, #46505f); color: #e3e8f0; box-shadow: 0 4px 0 #2b323e, 0 7px 11px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.13); }
.key--pause:hover { filter: brightness(1.1); }
.key--pause:active { transform: translateY(4px); box-shadow: 0 0 0 #2b323e, 0 2px 6px rgba(0,0,0,.4); }
.js-pause-ico { font-size: 14px; line-height: 0; }
.is-running .status { background: color-mix(in srgb, var(--accent) 24%, var(--surface)); color: var(--accent-deep); }
.is-running .status::before { content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 6px; border-radius: 50%; background: currentColor; vertical-align: middle; animation: pulse 1.1s ease-in-out infinite; }
.is-running .timer { color: var(--accent-deep); }
.is-paused .status { background: color-mix(in srgb, #e0a23a 22%, var(--surface)); color: #f0c074; }
.is-paused .timer { color: #e6b35a; }
.all-done .js-finish { animation: nudge 1.2s ease-in-out infinite; }

/* en-tête de tableau de bord + sélecteur de vue */
.board-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.board-head .section-label { margin: 0; }
.viewswitch { display: flex; gap: 4px; padding: 4px; background: #121833; border: 1px solid var(--line); border-radius: 11px; }
.viewswitch button { font-family: var(--font-ui); font-size: 13px; font-weight: 700; color: var(--ink-soft); background: transparent; border: none; cursor: pointer; padding: 7px 13px; border-radius: 8px; display: inline-flex; align-items: center; gap: 7px; transition: all .15s; }
.viewswitch button:hover { color: var(--ink); }
.viewswitch button.active { background: var(--surface-2); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.4); }
.viewswitch svg { width: 15px; height: 15px; fill: currentColor; flex: 0 0 auto; }

/* ── Rangées ── */
.board--rows { display: flex; flex-direction: column; gap: 10px; }
.row {
  display: grid;
  grid-template-columns: minmax(150px, 200px) minmax(112px, 140px) minmax(210px, 1fr) auto auto auto;
  align-items: center; gap: clamp(14px, 1.6vw, 26px);
  padding: 13px 18px; background: var(--surface); border: 1px solid var(--line);
  border-radius: 14px; box-shadow: var(--shadow-card);
  transition: border-color .2s, box-shadow .2s;
}
.row.is-running { border-color: color-mix(in srgb, var(--accent) 50%, var(--line)); box-shadow: inset 3px 0 0 var(--accent), var(--shadow-card); }
.row__id { display: flex; align-items: center; gap: 10px; min-width: 0; }
.row__id .card__name { font-size: 15px; font-weight: 800; padding: 5px 7px; }
.row__chrono { display: flex; flex-direction: column; gap: 2px; }
.row__chrono .timer { font-size: 23px; }
.row__chrono .status { align-self: flex-start; padding: 3px 9px; font-size: 11px; }
.row__prog { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.row__progtop { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.row__progtop .region__count { flex: 0 0 auto; }
.row__progtop .gauge__step { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }

/* ── Mini-cartes ── */
.board--mini { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; align-items: start; }
.mini { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 15px; box-shadow: var(--shadow-card); transition: border-color .2s, box-shadow .2s; }
.mini.is-running { border-color: color-mix(in srgb, var(--accent) 50%, var(--line)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), var(--shadow-card); }
.mini__head { display: flex; align-items: center; gap: 9px; }
.mini__head .card__name { font-size: 15px; font-weight: 800; padding: 4px 6px; }
.mini__meter { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mini__meter .timer { font-size: 24px; }
.mini__meter .status { padding: 4px 10px; font-size: 11px; }
.mini__step { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.mini__step .region__count { flex: 0 0 auto; }
.mini__step .gauge__step { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.mini .key { width: 100%; }
.mini__actions { display: flex; gap: 8px; }
.mini__actions .key { width: auto; }
.mini__actions .js-finish { flex: 1 1 auto; }

/* ── Tableau ── */
.board--table { overflow-x: auto; border-radius: 16px; box-shadow: var(--shadow-card); border: 1px solid var(--line); }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--surface); min-width: 760px; }
.tbl th { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; color: var(--ink-faint); text-align: left; padding: 13px 18px; background: var(--surface-2); border-bottom: 1px solid var(--line); }
.tbl td { padding: 12px 18px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
.tbl tbody tr:last-child td { border-bottom: none; }
.tbl tbody tr { transition: background .15s; }
.tbl tbody tr:hover { background: var(--surface-2); }
.tbl tbody tr td:first-child { box-shadow: inset 4px 0 0 var(--accent); }
.tbl .t-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tbl .t-id .card__name { font-size: 14.5px; font-weight: 800; padding: 4px 6px; max-width: 160px; }
.tbl .timer { font-size: 18px; }
.tbl .status { padding: 4px 10px; font-size: 11px; white-space: nowrap; }
.tbl .t-prog { min-width: 220px; }
.tbl .t-prog .region__count { display: block; margin-bottom: 6px; }
.tbl .t-step { font-size: 13.5px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.tbl .t-act { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.th-right { text-align: right; }

@media (max-width: 760px) {
  .row { grid-template-columns: 1fr 1fr; }
  .row__prog { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
