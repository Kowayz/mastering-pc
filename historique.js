/* ════════════════════════════════════════════════════════════
   Page Historique — stats + journal. Hérite des tokens d'app.css.
   ════════════════════════════════════════════════════════════ */

.hist-page main { width: 100%; max-width: 1240px; margin: 0 auto; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr)); gap: 12px; margin-bottom: 38px; }
.statcard { padding: 18px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 15px; box-shadow: var(--shadow-card); display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; }
.statcard::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: linear-gradient(180deg, #7fb0f5, #5fd699); opacity: .55; }
.statcard__num { font-family: var(--font-mono); font-weight: 600; font-size: 25px; color: var(--ink); letter-spacing: -.02em; line-height: 1; }
.statcard__num.big { font-family: var(--font-ui); font-weight: 800; font-size: 30px; letter-spacing: -.01em; }
.statcard__lab { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-faint); }
.statcard__sub { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.log-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 12px 0 18px; }
.log-head .section-label { margin: 0; }

.day { margin-bottom: 26px; }
.day__head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 11px; }
.day__date { font-size: 15px; font-weight: 800; color: var(--ink); text-transform: capitalize; }
.day__meta { font-size: 12px; font-weight: 700; color: var(--ink-faint); white-space: nowrap; }
.day__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 10px; }

.clock { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; padding-right: 14px; border-right: 1px solid var(--line); }
