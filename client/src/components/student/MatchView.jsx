// MatchView.jsx — one phase beat at a time: event card → your call → feedback.
// Solo, so it's always your turn. Alongside the choices, the Case Board shows
// the evidence board filling in (Source 1 → Source 6) as you work the case
// (spec §1, §3).

import { useEffect, useState } from 'react';
import { emitAck, errorText } from '../../services/socket.js';
import { Art } from '../../services/assets.jsx';
import CaseBoardPanel from '../shared/CaseBoardPanel.jsx';
import MetersBar from '../shared/MetersBar.jsx';
import RivalWebsite from '../shared/RivalWebsite.jsx';

const caseScore = (m) => (m ? (m.evidence || 0) + (m.credibility || 0) + (m.case || 0) : 0);

// Phase 6 (index 5), decision 1 (stepIndex 10) is the rival-website source —
// the one phase that ships the loaded-language mini-interaction.
const isRivalWebsiteStep = (turn) => turn?.chapter?.index === 5 && turn?.stepIndex === 10;

export default function MatchView({ state, dispatch }) {
  const { match } = state;
  const { begin, eventCard, turn, feedback } = match;
  const meta = begin.meta;

  // The server pushes the NEXT chapter's chapter:event AND its first turn:begin
  // synchronously with the CURRENT chapter's LAST turn:resolution — it doesn't
  // wait for the student to dismiss anything. So while a chapter-ending verdict
  // is on screen, eventCard AND turn have BOTH already raced ahead, and
  // preferring either would make the chip read one chapter ahead. Only
  // feedback.stepIndex is baked into the feedback payload itself and can't
  // race — derive the chapter from it (2 steps per chapter, the same rule the
  // server's chapterOf uses). Once feedback is dismissed, eventCard/turn are
  // exactly what's on screen next, so THEIR chapter is what should show.
  const chapters = meta.chapters?.[begin.side] || [];
  const stepsPerChapter = meta.stepsPerChapter || 2;
  const chapterIndexFor = (stepIndex) => Math.floor(stepIndex / stepsPerChapter);
  const liveChapterIndex = feedback ? chapterIndexFor(feedback.stepIndex)
    : turn?.yourTurn ? chapterIndexFor(turn.stepIndex)
    : eventCard ? eventCard.chapter.index
    : null;
  const phase = liveChapterIndex != null && chapters[liveChapterIndex]
    ? { index: liveChapterIndex, count: chapters.length, ...chapters[liveChapterIndex] }
    : (eventCard?.chapter || turn?.chapter); // fallback if meta.chapters is ever absent
  const chapterIndex = phase?.index ?? 0;

  const anyLow = Object.entries(match.meters || {}).find(([, v]) => v <= 15);

  return (
    <div className="match">
      <header className="match-header">
        <div className="nation-chip brand">🔍 <b>Source Sleuth</b></div>
        <div className="trail-chip" title="Everyone works the same case">Your Case File</div>
        <div className="hold-chip" title="Your three meters added up (max 300)">
          Case Score <b>{caseScore(match.meters)}</b><span className="muted"> / 300</span>
        </div>
        {phase && (
          <div className="chapter-chip">
            Source {phase.index + 1} of {phase.count}
          </div>
        )}
      </header>

      <div className="meters-row solo">
        <MetersBar meters={match.meters} meta={meta} title="Your Case File" />
      </div>

      {anyLow && !feedback && (
        <div className="banner danger" role="alert">
          ⚠️ Your {meta.meters[anyLow[0]]?.name || anyLow[0]} is running very low. Slow down and weigh the source with care.
        </div>
      )}

      <div className="match-body">
        <section className="action-panel" aria-live="polite">
          {feedback ? (
            <FeedbackPanel
              feedback={feedback}
              meta={meta}
              matchEnded={!!state.matchEnd}
              onContinue={() => dispatch({ type: 'dismiss-feedback' })}
            />
          ) : eventCard ? (
            <EventCard eventCard={eventCard} meta={meta} onContinue={() => dispatch({ type: 'dismiss-event' })} />
          ) : turn?.yourTurn ? (
            <DecisionPanel turn={turn} />
          ) : (
            <div className="waiting-panel"><div className="pulse-dot" aria-hidden="true" /><p>Working the case…</p></div>
          )}
        </section>

        <section className="map-panel">
          <CaseBoardPanel meters={match.meters} chapterIndex={chapterIndex} />
        </section>
      </div>
    </div>
  );
}

/* -------- panels -------- */

function EventCard({ eventCard, meta, onContinue }) {
  const ch = eventCard.chapter;
  return (
    <div className="event-card">
      <div className="event-kicker">Source {ch.index + 1} of {ch.count}</div>
      <h2>{ch.title}</h2>
      <Art name={ch.image} alt={ch.title} className="event-art" />
      <p className="event-text">{eventCard.text}</p>
      {eventCard.eventEffects && (
        <div className="effects-row">
          {Object.entries(eventCard.eventEffects).map(([k, v]) => (
            <span key={k} className={`effect-chip ${v > 0 ? 'up' : 'down'}`}>
              {meta.meters[k]?.name} {v > 0 ? `+${v}` : v}
            </span>
          ))}
        </div>
      )}
      <button className="btn big" onClick={onContinue}>Continue</button>
    </div>
  );
}

function DecisionPanel({ turn }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setBusy(false); setErr(''); }, [turn?.stepIndex]);

  async function choose(choiceIndex) {
    if (busy) return;
    setBusy(true);
    const res = await emitAck('student:submit_move', { move: { kind: 'decision', choiceIndex } });
    if (!res.ok) { setErr(errorText(res.error)); setBusy(false); }
    // On success the server pushes turn:resolution and this panel unmounts.
  }

  return (
    <div className="move-panel">
      <h2>🔎 Your call</h2>
      {isRivalWebsiteStep(turn) && <RivalWebsite />}
      <p className="prompt">{turn.prompt}</p>
      {turn.hint && <p className="hint">💡 {turn.hint}</p>}
      <div className="choice-list">
        {(turn.choices || []).map((label, i) => (
          <button key={i} className="choice-btn" disabled={busy} onClick={() => choose(i)}>
            {label}
          </button>
        ))}
      </div>
      <p className="err" role="alert">{err}</p>
    </div>
  );
}

const VERDICT_UI = {
  right: { label: 'Case-cracking read', className: 'right', icon: '✓' },
  partial: { label: 'A half-right read', className: 'partial', icon: '≈' },
  wrong: { label: 'A missed clue', className: 'wrong', icon: '✗' },
};

function FeedbackPanel({ feedback, meta, matchEnded, onContinue }) {
  const v = VERDICT_UI[feedback.verdict] || VERDICT_UI.partial;
  return (
    <div className="feedback-panel">
      <div className={`verdict-badge ${v.className}`}>
        <span aria-hidden="true">{v.icon}</span> {v.label}
      </div>
      <p className="feedback-text">{feedback.feedback}</p>
      <div className="effects-row">
        {Object.entries(feedback.effects || {}).map(([k, val]) => (
          <span key={k} className={`effect-chip ${val > 0 ? 'up' : 'down'}`}>
            {meta.meters[k]?.name} {val > 0 ? `+${val}` : val}
          </span>
        ))}
      </div>
      <button className="btn big" onClick={onContinue}>
        {matchEnded ? 'See how the case closes' : 'Continue'}
      </button>
    </div>
  );
}
