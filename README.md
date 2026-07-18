# Source Sleuth

**Source:** not yet pushed to GitHub.

A solo, class-wide Texas History game for **Unit 8 — Social Studies Skills**.
Everyone in the class plays the same **student historian** at a small Texas museum, solving **The Case of the Gonzales Cannon**.

> A battered old cannon. A barn. A tag that just says "the Gonzales gun?" Six sources, six tests,
> one verdict. Read each one like a real historian would — who made it, when, and why? — and
> build a case you can actually defend.

- **TEKS:** 7.20A (primary vs. secondary; valid sources), 7.20D (bias and point of view), 7.20F (credibility), 7.20E (claim + evidence)
- **Shape:** 6 sources × 2 graded decisions = **12 graded actions**; three meters — 🔍 **Evidence**, ⚖️ **Credibility**, 📋 **Case** — all start at 50. Decision 1 of each source classifies and reads it (primary or secondary?); decision 2 weighs it (bias? corroboration? does it move the case?). The finale (source 6, decision 2) grades a claim backed by evidence.
- **The honest design:** a straight choice-driven game — no early-fail, no scripted meter tolls. The finale explicitly rewards a historian's real answer — "probably, with reasons" — over both false certainty ("100% proven") and total doubt ("no way to ever know"). The debrief is honest that the real Gonzales cannon's fate and authenticity are still genuinely debated by historians today.
- **New pattern:** source 6 (a rival town's website) is a hand-styled fake-webpage mockup with a clickable loaded-language mini-interaction (tap the 3 phrases that sound loaded, not proven) — a pure client flourish layered above the real graded decision.
- **Sensitivity:** the family-legend source (source 3) is never mocked or dismissed with contempt — only ever "uncorroborated." No Native American content in this game. No gore, no battle spectacle — a calm, curious, museum-workroom mystery throughout.

Built on the shared Texas History game engine (Pattern A): server-authoritative Node + Express + Socket.IO, a React 18 + Vite thin client, one Render web service, and a live **Teacher Command Center** reporting one class-wide accuracy group. All session state lives in server memory — no database. See `D:\Texas History\Common_Build_Standards.md`.

Pairs with the *Primary or Secondary?* and *Spot the Bias* apps as the graded capstone (per spec §4).

## Run it locally

```bash
npm install          # cascades to server/ and client/ via postinstall (exFAT-safe, no workspaces)
npm run build        # builds the React client into client/dist
npm start            # node server/src/index.js — serves the built client + sockets on :4762
```

Then open:
- **Students:** <http://localhost:4762/>
- **Teacher Command Center:** <http://localhost:4762/#teacher> (create a session, share the 6-digit code)

For client hot-reload during development, run the server (`npm start`) and, in another terminal, `npm run dev:client` (Vite, proxying sockets to :4762).

```bash
npm test             # server test suite (content bank, balance, lifecycle, sensitivity, scoring)
```

## Deploy (Render) & embed (Wix)

- Not yet pushed to GitHub or deployed to Render.
- Render → New Blueprint Instance → connect the repo. `render.yaml` is included: `buildCommand: npm install && npm run build`, `startCommand: node server/src/index.js`. Render sets `PORT`.
- In Wix: **Add → Embed Code → Embed a Site**, paste the Render HTTPS URL (~1000×720). Put the `#teacher` route on a **password-protected** Wix page; the in-app 4-digit PIN is a second layer.

## Layout

```
server/src/games/sourceSleuth.js     the game: 6 sources, the answer key (verdicts/effects/feedback), the debrief
server/src/games/_stepGame.js        the shared step-game factory (createStepGame)
server/src/GameManager.js            sessions, roster, class accuracy, PDF data — engine (unchanged)
client/src/components/student/       Datapad (title/how/join), MatchView, ResultScreen
client/src/components/shared/        CaseBoardPanel (the evidence-board SVG scene + confidence lights), MetersBar, RivalWebsite (source 6 mini-interaction)
client/src/components/teacher/       CommandCenter (code, approval, roster, PDF, end-session)
client/public/assets/images/         6 Higgsfield illustrations (title + 5 sources; source 6 is a coded mockup, not an image)
```

*Made for 7th Grade Texas History · TEKS 7.20A, 7.20D, 7.20E, 7.20F.*
