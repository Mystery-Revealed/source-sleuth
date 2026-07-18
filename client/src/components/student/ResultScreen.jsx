// ResultScreen.jsx — the end of the case. Two stories, in order: (1) how the
// case turned out (Case Score + ending tier), (2) the score that matters to
// your teacher — accuracy — then the debrief: the real, still-debated history
// of the Gonzales "Come and Take It" cannon.

import { Art } from '../../services/assets.jsx';

const TIER_CLASS = { top: 'win', mid: 'mid', low: 'low' };

export default function ResultScreen({ state, onPlayAgain }) {
  const end = state.matchEnd;
  const meta = end.meta || state.match?.begin?.meta;
  const you = end.you;
  const ending = you.ending;
  const score = you.score ?? 0;

  return (
    <div className="card result-screen">
      <div className="event-kicker">The Case of the Gonzales Cannon</div>
      <h1 className={`result-headline ${TIER_CLASS[ending.key] || 'mid'}`}>{ending.title}</h1>

      <Art name="ending.jpg" alt="A finished evidence board: photographs and documents pinned to a corkboard, connected by red string to an old cannon on the table below" className="result-art" />

      <p className="fall-note">
        This game measured how well you worked the historian's method — read
        each source carefully, weigh it honestly, and build only the claim
        the evidence can support. The case didn't hinge on a lucky guess. It
        hinged on the method, and sleuths who trusted it read it early.
      </p>

      <div className="ending-block brand">
        <p>{ending.text}</p>
      </div>

      <div className="score-block" aria-label="Case Score">
        <div className="score-head">
          <span className="score-title">📋 Case Score</span>
          <span className="score-num">{score}<span className="muted"> / 300</span></span>
        </div>
        <span className="score-bar-track">
          <span className={`score-bar ${TIER_CLASS[ending.key] || 'mid'}`} style={{ width: `${Math.min(100, (score / 300) * 100)}%` }} />
        </span>
        <div className="meter-final-row">
          {Object.entries(you.meters || {}).map(([k, v]) => (
            <span key={k} className="meter-final">{meta?.meters?.[k]?.name || k}: <b>{v}</b></span>
          ))}
        </div>
      </div>

      <div className="accuracy-block">
        <div className="accuracy-number">{you.accuracy}%</div>
        <div>
          <b>Your accuracy — the score your teacher sees.</b>
          <p>
            How well your calls matched the real historian's method — read
            with care, weigh with care, claim only what the evidence backs up.
          </p>
        </div>
      </div>

      <div className="debrief">
        <h3>What really happened</h3>
        <p>{you.debrief}</p>
      </div>

      <div className="btn-col">
        <button className="btn big" onClick={onPlayAgain}>Work the case again</button>
        <p className="replay-nudge muted">Try new calls — can you close it out as a Master Sleuth?</p>
      </div>
    </div>
  );
}
