// CaseBoardPanel.jsx — the evidence-board panel that replaces a map (spec §1,
// §3: "an evidence board fills as the case builds"). Two halves, both
// display-only (the server owns all gameplay truth):
//
//   1. THE EVIDENCE BOARD — a small SVG corkboard scene. A center case tag
//      (the mystery cannon) stays pinned throughout; the six source cards
//      pin themselves — with a red string back to the center tag — as each
//      phase is reached. The current phase's card gets a magnifying glass.
//      Below it, a confidence-light strip reads all three meters as
//      SOLID / SHAKY / WEAK — pure flourish, never the only signal (icon +
//      color + text label on every light, same as the meter bars above).
//
//   2. THE CASE — the six phases as a simple list with the current phase
//      highlighted.

const STAGES = [
  { key: 'logged',   name: 'Evidence log started',       icon: '🔍', meter: 'evidence',    at: 60 },
  { key: 'checked',  name: 'Sources cross-checked',       icon: '⚖️', meter: 'credibility', at: 60 },
  { key: 'building', name: 'Case file taking shape',      icon: '📋', meter: 'case',        at: 60 },
  { key: 'ready',    name: 'Ready for the museum board',  icon: '🏛️', meter: 'case',        at: 85 },
];

// Fixed phase design (client display only; titles mirror the adapter).
const PHASES = [
  { n: 1, title: 'The Diary', tag: 'Source 1 · 1835' },
  { n: 2, title: 'The 1897 Newspaper', tag: 'Source 2 · 1897' },
  { n: 3, title: "Grandpa's Story", tag: 'Source 3 · family archive' },
  { n: 4, title: 'The Supply List', tag: 'Source 4 · 1836' },
  { n: 5, title: 'The Lab Report', tag: 'Source 5 · 2010s' },
  { n: 6, title: 'The Rival Claim', tag: 'Source 6 · website' },
];

const LIGHT_META = {
  evidence: { name: 'Evidence', icon: '🔍' },
  credibility: { name: 'Credibility', icon: '⚖️' },
  case: { name: 'Case', icon: '📋' },
};

function statusOf(value) {
  if (value >= 60) return { key: 'solid', label: 'SOLID' };
  if (value >= 30) return { key: 'shaky', label: 'SHAKY' };
  return { key: 'weak', label: 'WEAK' };
}

// Six card positions in an arc under the center case tag.
const CARD_X = [16, 62, 108, 154, 200, 246];
const CARD_W = 38, CARD_H = 26, CARD_Y = 120;
const HUB = { x: 150, y: 34, w: 64, h: 42 };

export default function CaseBoardPanel({ meters, chapterIndex = 0 }) {
  const built = (s) => (meters?.[s.meter] ?? 50) >= s.at;
  const cur = Math.max(0, Math.min(PHASES.length - 1, chapterIndex));

  const hasReady = built(STAGES[3]);

  return (
    <div className="case-panel">
      <div className="case-scene-wrap">
        <div className="panel-title">The evidence board</div>
        <svg
          className="case-scene"
          viewBox="0 0 300 170"
          role="img"
          aria-label={`The evidence board at ${PHASES[cur].title}. ${cur + 1} of ${PHASES.length} sources pinned.${hasReady ? ' The case file is ready for the museum board.' : ''}`}
        >
          {/* the corkboard */}
          <rect x="0" y="0" width="300" height="170" className="cb-board" rx="10" />
          <rect x="2" y="2" width="296" height="166" className="cb-frame" rx="8" />

          {/* the center case tag — the mystery cannon, always pinned */}
          <g aria-hidden="true">
            <rect x={HUB.x - HUB.w / 2} y={HUB.y - HUB.h / 2} width={HUB.w} height={HUB.h} rx="3" className="cb-card cb-hub" />
            <rect x={HUB.x - 20} y={HUB.y + 6} width="40" height="7" rx="2" className="cb-cannon-barrel" />
            <circle cx={HUB.x - 16} cy={HUB.y + 15} r="5" className="cb-cannon-wheel" />
            <circle cx={HUB.x + 16} cy={HUB.y + 15} r="5" className="cb-cannon-wheel" />
            <circle cx={HUB.x} cy={HUB.y - HUB.h / 2 + 3} r="2" className="cb-pin" />
          </g>

          {/* six source cards — pin in, one per phase, with a string to the hub */}
          <g aria-hidden="true">
            {CARD_X.map((x, i) => {
              const revealed = i <= cur;
              const isCurrent = i === cur;
              const cx = x + CARD_W / 2;
              return (
                <g key={i}>
                  {revealed && (
                    <line
                      x1={cx} y1={CARD_Y} x2={HUB.x} y2={HUB.y + HUB.h / 2}
                      className={`cb-string ${isCurrent ? 'active' : ''}`}
                    />
                  )}
                  <rect
                    x={x} y={CARD_Y} width={CARD_W} height={CARD_H} rx="2"
                    className={`cb-card ${revealed ? 'revealed' : 'pending'} ${isCurrent ? 'current' : ''}`}
                  />
                  {revealed && <circle cx={cx} cy={CARD_Y} r="2" className="cb-pin" />}
                  {revealed && <rect x={x + 5} y={CARD_Y + 6} width={CARD_W - 10} height="2.4" className="cb-card-line" />}
                  {revealed && <rect x={x + 5} y={CARD_Y + 12} width={CARD_W - 16} height="2.4" className="cb-card-line" />}
                  {isCurrent && (
                    <g className="cb-glass">
                      <circle cx={x + CARD_W + 6} cy={CARD_Y - 4} r="6" className="cb-glass-ring" />
                      <line x1={x + CARD_W + 10.24} y1={CARD_Y + 0.24} x2={x + CARD_W + 14.49} y2={CARD_Y + 4.49} className="cb-glass-handle" />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="confidence-strip" role="list" aria-label="Case confidence lights">
          {Object.keys(LIGHT_META).map((k) => {
            const value = meters?.[k] ?? 50;
            const status = statusOf(value);
            const meta = LIGHT_META[k];
            return (
              <div key={k} role="listitem" className={`confidence-light ${status.key}`}>
                <span className="light-bulb" aria-hidden="true" />
                <span className="light-icon" aria-hidden="true">{meta.icon}</span>
                <span className="light-name">{meta.name}</span>
                <b className="light-label">{status.label}</b>
              </div>
            );
          })}
        </div>

        <div className="build-chips" role="list" aria-label="Case status">
          {STAGES.map((s) => {
            const done = built(s);
            return (
              <div key={s.key} role="listitem" className={`build-chip ${done ? 'done' : ''}`}>
                <span aria-hidden="true">{s.icon}</span> {s.name}
                <b className="build-state">{done ? '✓ logged' : 'pending'}</b>
              </div>
            );
          })}
        </div>
        <p className="build-hint">Your board fills in as your <b>Evidence</b>, <b>Credibility</b>, and <b>Case</b> meters grow.</p>
      </div>

      <div className="chapter-listing">
        <div className="panel-title">The case</div>
        <ol className="chapter-list">
          {PHASES.map((c, i) => {
            const state = i < cur ? 'past' : i === cur ? 'current' : 'future';
            return (
              <li key={c.n} className={`chapter-item ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="chapter-dot" aria-hidden="true">{i < cur ? '✓' : c.n}</span>
                <span className="chapter-name">{c.title}</span>
                <span className="chapter-date">{c.tag}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
