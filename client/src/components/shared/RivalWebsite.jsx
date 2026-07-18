// RivalWebsite.jsx — a small styled fake-website mockup for Phase 6, Source 6
// (spec §4: "a garish webpage mock — Sonnet can style #6"). A pure client
// flourish layered above the real graded decision: tap the three loaded,
// unproven-sounding phrases to practice spotting bias (TEKS 7.20D). It never
// gates or touches the actual choice buttons below it — the server grades
// the decision, not this mini-interaction.

import { useState } from 'react';

function LoadedWord({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`loaded-word ${active ? 'found' : ''}`}
      onClick={onClick}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}

export default function RivalWebsite() {
  const [found, setFound] = useState({});
  const total = 3;
  const count = Object.keys(found).length;
  const mark = (key) => setFound((f) => (f[key] ? f : { ...f, [key]: true }));

  return (
    <div className="rival-website" aria-label="A rival town's website, shown in a browser preview">
      <div className="rival-browser-chrome" aria-hidden="true">
        <span className="rival-dot" /><span className="rival-dot" /><span className="rival-dot" />
      </div>
      <div className="rival-page">
        <h3 className="rival-headline">THE REAL GONZALES CANNON IS RIGHT HERE!!!</h3>
        <p className="rival-body">
          <LoadedWord active={found.everybody} onClick={() => mark('everybody')}>Everybody knows</LoadedWord> our cannon is the one true Gonzales gun. The museum's evidence is{' '}
          <LoadedWord active={found.obviously} onClick={() => mark('obviously')}>obviously fake</LoadedWord>, cooked up to steal our glory.{' '}
          <LoadedWord active={found.realtexans} onClick={() => mark('realtexans')}>Real Texans have always known</LoadedWord> the truth — ours is the one that's real.
        </p>
        <p className="rival-citerow">Sources: trust us · Citations: none</p>
      </div>
      <p className="rival-hint">
        🔎 Tap the {total} phrases that sound loaded, not proven. <b>{count}/{total} spotted.</b>
      </p>
    </div>
  );
}
