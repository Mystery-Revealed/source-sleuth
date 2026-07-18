// Datapad.jsx — the student game. A small state machine over socket pushes:
// title → how to play → join → (approval) → briefing → match (6 sources) → result.
// Everyone works the SAME case — there is no "pick" and no rival, so the
// class is one accuracy group. The server owns all truth; this component only
// renders what it's told.

import { useEffect, useReducer, useRef, useState } from 'react';
import { getSocket, emitAck, errorText } from '../../services/socket.js';
import { Art } from '../../services/assets.jsx';
import MatchView from './MatchView.jsx';
import ResultScreen from './ResultScreen.jsx';

// The one class-wide side. It matches the server's single variant key.
const SIDE = 'historian';

const initialState = {
  screen: 'title', // title | how | join | waiting_approval | briefing | match | result | ended
  joinCode: '',
  name: '',
  studentId: null,
  error: '',
  endedMessage: '',
  match: null,
  matchEnd: null,
};

function freshMatch(begin) {
  return {
    begin,
    map: begin.map,
    meters: begin.meters,
    eventCard: null,
    turn: null,
    feedback: null,
  };
}

// Merge live payloads (chapter:event, turn:begin, turn:resolution) into the match.
function mergeLive(match, payload) {
  const next = { ...match };
  if (payload.map) next.map = payload.map;
  if (payload.meters) next.meters = payload.meters;
  return next;
}

function reducer(state, action) {
  switch (action.type) {
    case 'ui':
      return { ...state, ...action.patch };
    case 'joined':
      return {
        ...state,
        studentId: action.studentId,
        error: '',
        matchEnd: null,
        match: null,
        screen: action.approved ? 'briefing' : 'waiting_approval',
      };
    case 'approved':
      return { ...state, screen: state.screen === 'waiting_approval' ? 'briefing' : state.screen };
    case 'match:begin':
      return { ...state, screen: 'match', matchEnd: null, match: freshMatch(action.payload) };
    case 'chapter:event': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload);
      return { ...state, match: { ...match, eventCard: action.payload } };
    }
    case 'turn:begin': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload);
      return { ...state, match: { ...match, turn: action.payload } };
    }
    case 'turn:resolution': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload);
      return { ...state, match: { ...match, feedback: action.payload } };
    }
    case 'match:end': {
      // Hold the result until pending feedback is dismissed (chronological order).
      const showNow = !state.match?.feedback;
      return { ...state, matchEnd: action.payload, screen: showNow ? 'result' : state.screen };
    }
    case 'dismiss-feedback': {
      if (!state.match) return state;
      if (state.matchEnd) return { ...state, screen: 'result', match: { ...state.match, feedback: null } };
      return { ...state, match: { ...state.match, feedback: null } };
    }
    case 'dismiss-event':
      return state.match ? { ...state, match: { ...state.match, eventCard: null } } : state;
    case 'sync': {
      const s = action.sync;
      if (s.screen === 'waiting_approval') return { ...state, screen: 'waiting_approval' };
      if (s.screen === 'lobby') return { ...state, screen: 'briefing' };
      if (s.screen === 'result') return { ...state, screen: 'result', matchEnd: s.matchEnd };
      if (s.screen === 'match') {
        const match = freshMatch(s.matchBegin);
        return {
          ...state,
          screen: 'match',
          matchEnd: null,
          match: { ...match, eventCard: s.chapterEvent, turn: s.turn },
        };
      }
      return state;
    }
    case 'removed':
      return { ...initialState, screen: 'join', joinCode: state.joinCode, name: '', error: 'Your teacher removed you from the session. You can join again.' };
    case 'ended':
      return { ...initialState, screen: 'ended', endedMessage: 'Your teacher ended this session. Stand by — the case file will be here when you return.' };
    case 'replay':
      // Re-join for another run (a fresh match); the server issues a new record.
      return { ...state, matchEnd: null, match: null, error: '', screen: 'briefing' };
    default:
      return state;
  }
}

export default function Datapad() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const socket = getSocket();
    const on = (event, type) => {
      const fn = (payload) => dispatch({ type, payload });
      socket.on(event, fn);
      return [event, fn];
    };
    const subs = [
      on('match:begin', 'match:begin'),
      on('chapter:event', 'chapter:event'),
      on('turn:begin', 'turn:begin'),
      on('turn:resolution', 'turn:resolution'),
      on('match:end', 'match:end'),
    ];
    const approved = () => dispatch({ type: 'approved' });
    const removed = () => dispatch({ type: 'removed' });
    const ended = () => dispatch({ type: 'ended' });
    socket.on('join:approved', approved);
    socket.on('student:removed', removed);
    socket.on('session:ended', ended);

    // School wifi blip: the socket reconnects → re-attach and re-sync the screen.
    const onReconnect = async () => {
      const s = stateRef.current;
      if (!s.studentId || !s.joinCode) return;
      const res = await emitAck('student:rejoin', { joinCode: s.joinCode, studentId: s.studentId });
      if (res.ok) dispatch({ type: 'sync', sync: res.sync });
    };
    socket.io.on('reconnect', onReconnect);

    return () => {
      for (const [event, fn] of subs) socket.off(event, fn);
      socket.off('join:approved', approved);
      socket.off('student:removed', removed);
      socket.off('session:ended', ended);
      socket.io.off('reconnect', onReconnect);
    };
  }, []);

  // The one join call — mode solo, the single class-wide side. Join and replay.
  async function doJoin(joinCode, name) {
    const res = await emitAck('student:join', {
      joinCode: (joinCode || '').trim(), nickname: (name || '').trim(), mode: 'solo', nation: SIDE,
    });
    if (!res.ok) {
      dispatch({ type: 'ui', patch: { error: errorText(res.error), screen: 'join' } });
      return false;
    }
    dispatch({ type: 'joined', studentId: res.studentId, approved: res.approved });
    return true;
  }

  function playAgain() {
    const s = stateRef.current;
    dispatch({ type: 'replay' });
    doJoin(s.joinCode, s.name);
  }

  const { screen } = state;
  return (
    <div className="app student-app">
      {screen === 'title' && <TitleScreen onStart={() => dispatch({ type: 'ui', patch: { screen: 'join' } })} onHow={() => dispatch({ type: 'ui', patch: { screen: 'how' } })} />}
      {screen === 'how' && <HowToPlay onBack={() => dispatch({ type: 'ui', patch: { screen: 'title' } })} />}
      {screen === 'join' && <JoinForm state={state} dispatch={dispatch} onJoin={doJoin} />}
      {screen === 'waiting_approval' && (
        <WaitCard title="Hold tight!" text="Your teacher is checking names. Your case file opens in a moment." />
      )}
      {screen === 'briefing' && (
        <WaitCard title="The museum just called." text="A battered old cannon, a barn, and a tag that just says 'the Gonzales gun?' Six sources are waiting in the case file. Get ready to sleuth." />
      )}
      {screen === 'match' && state.match && <MatchView state={state} dispatch={dispatch} />}
      {screen === 'result' && state.matchEnd && <ResultScreen state={state} onPlayAgain={playAgain} />}
      {screen === 'ended' && (
        <WaitCard title="Session ended" text={state.endedMessage}>
          <button className="btn" onClick={() => dispatch({ type: 'ui', patch: { ...initialState, screen: 'title' } })}>
            Back to the title screen
          </button>
        </WaitCard>
      )}
      <footer className="app-footer">Made for 7th Grade Texas History · TEKS 7.20A, 7.20D, 7.20E, 7.20F</footer>
    </div>
  );
}

/* ---------------- small screens ---------------- */

function TitleScreen({ onStart, onHow }) {
  return (
    <div className="card title-screen">
      <Art name="title_hero.jpg" alt="A museum workroom at night: an old cannon on a padded table, evidence tags and file folders around it, a magnifying glass under a warm desk lamp" className="hero-art" />
      <h1 className="game-title">Source Sleuth</h1>
      <p className="tagline">A battered old cannon. A barn. A tag that just says "the Gonzales gun?"</p>
      <p className="title-blurb">
        You are a student historian at a small Texas museum, and you've got a
        real mystery on your hands: <b>The Case of the Gonzales Cannon</b>.
        Six sources are waiting in the file — a diary, a newspaper, a family
        story, a supply list, a lab report, and a rival town's claim. Read
        each one like a real historian would: who made it, when, and why?
        Weigh it with care, and build a case you can actually defend.
      </p>
      <div className="btn-col">
        <button className="btn big" onClick={onStart}>Join your class</button>
        <button className="btn secondary" onClick={onHow}>How to play</button>
      </div>
    </div>
  );
}

function HowToPlay({ onBack }) {
  return (
    <div className="card how-screen">
      <h2>How to play</h2>
      <ol className="how-list">
        <li><b>Join with your class code</b> — everyone works the same case file, but every call is yours alone.</li>
        <li><b>Open 6 sources</b>, one at a time. Each source you make <b>two calls</b> — pick 1 of 3 answers to a hard question.</li>
      </ol>
      <div className="how-grid">
        <div className="how-card"><span className="how-icon">🔍</span><b>Read each source like a historian</b><p>Who made this, and when? A witness at the time is primary. Someone writing later, even an expert, is secondary — and that's not automatically bad. It just means you read it with extra care.</p></div>
        <div className="how-card"><span className="how-icon">⚖️</span><b>Weigh it before you trust it</b><p>Does it have a motive? Does another source back it up? One clue is a lead, never a verdict. Real historians look for a second voice before they call anything settled.</p></div>
      </div>
      <h3>Your three meters</h3>
      <ul className="how-list">
        <li>🔍 <b>Evidence</b> — what your case can actually prove. It grows when you classify a source correctly, primary or secondary.</li>
        <li>⚖️ <b>Credibility</b> — how well you weigh each source. It grows when you catch bias, spot a motive, and look for backup instead of guessing.</li>
        <li>📋 <b>Case</b> — the argument taking shape. It grows when your evidence lines up into a claim you could actually defend.</li>
      </ul>
      <div className="note">
        <b>Live the mystery, learn the method.</b> Your <b>Case Score</b> is
        simply your three meters added together — but what your teacher
        really sees is whether you can spot a strong source from a shaky one
        when both sound convincing. Real historians run this exact test on
        real evidence. See if you can crack the case.
      </div>
      <h3>Words to know</h3>
      <ul className="how-list">
        <li><b>Primary source</b> — made by a witness, at the time something happened (a diary, a letter, an official record).</li>
        <li><b>Secondary source</b> — made later, by someone who wasn't there, often looking back or explaining (a newspaper years later, a modern report).</li>
        <li><b>Bias</b> — when a source leans toward one side, on purpose or not, instead of telling it straight.</li>
        <li><b>Motive</b> — the reason someone made a source. A good motive to ask about: were they trying to sell something, win something, or prove a point?</li>
        <li><b>Corroborate</b> — when a second source backs up what the first one says.</li>
        <li><b>Credibility</b> — how much a source has earned your trust, based on who made it, when, and why.</li>
        <li><b>Claim</b> — the answer you argue for, backed by evidence — not a guess, and not a promise of 100% certainty either.</li>
        <li><b>Loaded language</b> — words picked to stir up feeling instead of prove a point ("everybody knows," "obviously").</li>
      </ul>
      <button className="btn" onClick={onBack}>Back</button>
    </div>
  );
}

function JoinForm({ state, dispatch, onJoin }) {
  const [busy, setBusy] = useState(false);
  const set = (patch) => dispatch({ type: 'ui', patch });
  const ready = state.joinCode.length === 6 && state.name.trim().length >= 2;

  async function join() {
    if (!ready || busy) return;
    setBusy(true);
    const ok = await onJoin(state.joinCode, state.name);
    if (!ok) setBusy(false);
  }

  return (
    <div className="card join-screen">
      <h2>Join your class</h2>
      <label htmlFor="join-code">Class code</label>
      <input
        id="join-code" inputMode="numeric" autoComplete="off" maxLength={6}
        placeholder="6-digit code" value={state.joinCode}
        onChange={(e) => set({ joinCode: e.target.value.replace(/\D/g, '') })}
      />
      <label htmlFor="join-name">Your first name</label>
      <input
        id="join-name" maxLength={20} placeholder="e.g. Ana R." value={state.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <p className="muted">Everyone works the same case file. Read with care, weigh with care.</p>

      <p className="err" role="alert">{state.error}</p>
      <div className="btn-col">
        <button className="btn big" disabled={!ready || busy} onClick={join}>
          {busy ? 'Opening the case…' : 'Open the case file →'}
        </button>
        <button className="btn ghost" onClick={() => set({ screen: 'title', error: '' })}>Back</button>
      </div>
    </div>
  );
}

function WaitCard({ title, text, children }) {
  return (
    <div className="card wait-card">
      <div className="pulse-dot" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
