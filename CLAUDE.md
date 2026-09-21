# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A real-time, Kahoot-style quiz web app for live Jainism-knowledge events. One host ("Guru") runs a
session from a live-controlled dashboard; up to 500 participants ("Chhatra") join on their phones
with a 6-character PIN (or by scanning a QR code) and answer 25 timed multiple-choice questions with
a live leaderboard. **Hindi is the default UI language, with an English toggle** (added 2026-09-21,
`client/src/lib/i18n.jsx`) — see the i18n section below before touching any UI string.

## Commands

```bash
# Local dev — two terminals, no database required
npm install && HOST_PASSCODE=your-secret npm run dev   # backend, :3001, restarts on change (node --watch)
cd client && npm install && npm run dev                 # frontend, :5173, proxies /api + /socket.io to :3001

# Production build & run (single process serves API + Socket.IO + built client on one port)
npm run build   # runs `npm --prefix client install --include=dev && npm --prefix client run build`
HOST_PASSCODE=your-secret NODE_ENV=production PORT=3001 npm start
```

There is no real test suite (`npm test` is a placeholder). To verify backend/real-time changes, write
a throwaway `socket.io-client` script that drives the server directly (connect as host, connect as
participant(s), emit the relevant events, assert on the acks/broadcasts) — this is how every change in
this repo's history has actually been verified, including full quiz-round simulations and restart/
persistence checks. Delete the script when done; nothing like it should be committed.

**Do not remove `--include=dev` from the root `build` script.** Render (and any host that sets
`NODE_ENV=production` during `npm install`) will otherwise skip `client`'s `devDependencies`, which
is where `vite` lives — the build fails with `vite: not found`. This already happened once.

## Architecture

**One process, in-memory live state — this is a hard constraint, not a simplification to later fix.**
`server/rooms.js` holds all active rooms (participants, scores, current question, timers) in a
`Map<pin, room>` in server memory. This is intentional and mirrors how Kahoot itself works: a live
session is never meant to survive a restart or be shared across processes. Never introduce horizontal
scaling, multiple instances, or a "resume session after restart" feature without recognizing this
means also moving live-game state into shared storage — it currently isn't, by design.

**Participant identity is a stable id (`nanoid(12)`), not the socket id** (2026-09-21, `server/rooms.js`
+ `server/socketHandlers.js`). `room.participants` is keyed by this id; each participant also carries a
`socketId` field for their *current* live connection, updated on reconnect. This exists so a Chhatra
whose phone locks/backgrounds/drops connection (very likely at a real event) can rejoin the same room —
`participant:join` now takes an optional `participantId`; if it matches an existing participant it's
treated as a reconnect (allowed at *any* room status, restoring their score/answers onto the new
socket) instead of the normal fresh-join path, which is still blocked once `room.status !== 'lobby'`.
The ack includes a `resume` payload (`resumeState()` in `socketHandlers.js`) describing the room's
current phase plus, for `'question'`, whether *this* participant already answered — so the client can
jump straight back into the right screen instead of restarting at the lobby. The client side
(`client/src/lib/participantSession.js` + `Play.jsx`) persists `{id, name}` in `localStorage` per PIN
and re-sends `participant:join` on every socket `'connect'` event (covers both an in-place reconnect
and a full page reload). Don't go back to keying `participants` by `socket.id` — that was the root
cause of participants getting permanently locked out after any connection drop.

**Quiz *content* (question banks) is a separate, persisted concern from live *session* state.**
`server/quizzes.js` is a thin selector: it re-exports either `server/storage/mongoQuizzes.js` (used
when `MONGODB_URI` is set) or `server/storage/fileQuizzes.js` (local JSON file fallback, used when it
isn't). Both implement the same function signatures (`listQuizzes`, `getQuiz`, `createQuiz`,
`updateQuiz`, `deleteQuiz`) and share validation via `server/storage/sanitizeQuestions.js`. When
changing quiz storage behavior, change it in both backends or explicitly decide it's Mongo-only.

**Socket.IO event flow (`server/socketHandlers.js`) is role-based**, not a single generic channel:
- Host events: `host:join` (passcode-gated), `host:start`, `host:next` (also used to force-close a
  question early), `host:end`.
- Participant events: `participant:join`, `participant:answer`.
- A question auto-closes either when the 15s server-side timer fires, or immediately once every
  connected participant has answered (`answeredCount(room) >= room.participants.size`).
- `question:answeredCount` is broadcast to `room.pin` (2026-09-21, was `room.hostSocketId` only) — every
  participant sees a live "N/M answered" bar while their own answer is locked in, not just the host.
  Keep broadcasting this to the whole room if you touch it again; narrowing it back to host-only would
  silently break that participant-side progress bar in `Play.jsx`.
- **`participant:answer` does O(room size) work per answer** (the `answeredCount()` scan, plus the
  room-wide broadcast above) — so a burst of simultaneous answers costs roughly O(n²), not O(n). Load
  tested 2026-09-21 against the live Render deployment: 120 simulated participants all joining, then
  all answering, in the same instant (an intentionally worst-case burst — real answers spread out over
  the 15s window) — 0 failures, but ack latency degraded under the burst (join ack p95 ~3.7s, answer
  ack p95 ~2.8s, max ~4s) on the free tier's limited CPU. Scoring uses server-receipt time
  (`Date.now() - room.questionStartTime`), so in a severe-enough burst a participant queued behind
  many others' answers could be scored slower than they actually tapped — real risk only in a genuine
  everyone-taps-in-the-same-instant scenario, more plausible as participant count approaches the
  documented 500 cap than it was at 120. Optimizing this (e.g. debouncing the broadcast, or only
  recomputing `answeredCount` incrementally) is real, scoped future work if a test at higher N shows
  it degrading further — not done as part of this test.
- **Scoring (`server/scoring.js`) is a Kahoot-style continuous formula** (changed 2026-09-21, was a
  4-bracket table): `round(1000 * (1 - fraction/2))` for a correct answer, where `fraction` is elapsed
  time / 15s clamped to `[0,1]` — instant = 1000, right at the buzzer = 500, linear in between, wrong
  or no answer = 0. The bracket table clustered most real answers into 2-3 tiers; this makes every
  millisecond count, matching Kahoot's actual model rather than a coarse approximation of it.
- **Elapsed time is now measured on the participant's own screen, not the server** (2026-09-21) — a
  deliberate reversal of "never trust the client," made *because of* the O(n²) burst-latency finding
  above: server-receipt timing was penalizing people for the server's own processing queue, not their
  reaction speed. `Play.jsx` records `Date.now()` when its `question:show` handler fires (or, on a
  mid-question reconnect, when the resumed state renders — that's this screen's first look at it
  either way) and again on tap; the difference is sent as `elapsedMs` in `participant:answer`.
  `socketHandlers.js` clamps it to `[0, QUESTION_LIMIT_MS]` and — this matters — **falls back to the
  worst score (`QUESTION_LIMIT_MS`), not the best, for a missing/non-finite value**, so a malformed or
  adversarial payload can't be a free instant-answer. This does mean a participant *could* forge a
  smaller `elapsedMs` to inflate their score — accepted deliberately for this app (a casual community
  quiz, no prizes at stake) in exchange for fairness under server load; don't quietly re-add
  server-side timing without re-litigating that trade-off with whoever owns this decision. Verified
  with a throwaway script covering the formula's endpoints, a mid-window value, and all three
  malformed-input cases (missing / negative / over-limit `elapsedMs`).

**REST vs Socket.IO split**: quiz CRUD and room *creation* are REST (`server/index.js`, gated by
`x-host-passcode` header via `requireHost` middleware); everything about a *live* session (joining,
starting, answering, results) is Socket.IO. A room's PIN is generated fresh (`server/rooms.js`,
6 chars, ambiguous characters like `0/O/1/I` excluded) every time a Guru clicks "Start Session" —
PINs are not stable per-quiz, so anything involving PINs (e.g. the QR code) must be generated against
the *current* room, not the quiz template.

**Production safety net**: `server/index.js` calls `process.exit(1)` at boot if `NODE_ENV=production`
and `HOST_PASSCODE` is still the default `'jain-guru'`. This is deliberate, not a bug to silence.

**Frontend** (`client/`, Vite + React, no TypeScript) mirrors the role split: `client/src/pages/host/*`
(Dashboard, QuizEditor, HostSession) vs `client/src/pages/participant/Play.jsx`, plus shared
`Landing`/`Join`/`HostLogin`. `client/src/lib/socket.js` is a singleton Socket.IO client (same-origin,
so it works unmodified in both dev-via-proxy and production). In production, Express serves
`client/dist` statically with an `app.use(...)` catch-all for the SPA fallback — **not** `app.get('*', ...)`,
which Express 5's router rejects (`path-to-regexp` no longer accepts a bare `*`).

**Styling stack is Tailwind CSS v4** (migrated 2026-09-21, via `@tailwindcss/vite` — **not** the CDN
script; that's fine for a static mockup but never appropriate for this build). `client/vite.config.js`
registers the `tailwindcss()` plugin; `client/src/index.css` starts with `@import 'tailwindcss';`.
Design tokens live in an `@theme` block in that same file — they compile to real runtime CSS custom
properties (e.g. `--color-brand`), not just build-time constants, which is what makes the next
paragraph's dark/light override trick keep working.

**Hybrid architecture — don't convert everything to inline utility soup.** Every pattern that already
existed pre-migration (`.screen`, `.card`, `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-chhatra`,
`.option-btn`, `.timer-ring`, all the `.stage-*` classes, `.leaderboard-*`, etc.) is kept as a named
class in `index.css`'s `@layer components` block — mostly plain CSS referencing theme tokens
(`var(--color-brand)`), using native CSS nesting (Tailwind v4's Lightning CSS engine supports `&`)
instead of repeating a selector. This was a deliberate choice over rewriting every component's
className to raw utilities: it kept the diff to "rename CSS variables," not "re-derive every fluid
`clamp()` size and dark-theme color as Tailwind utility spelling," for logic that took a full session
of careful tuning (stage scale, timer urgency thresholds, i18n toggle positioning) to get right.
**New UI work should use Tailwind utility classes directly in JSX** (as `AnswerStatusCard.jsx`,
the QR lotus-corner treatment in `JoinQRCode.jsx`, and the glow/icon additions in `HostSession.jsx`
and `Landing.jsx` do) rather than adding more named classes to `index.css` — utilities-in-markup is
the point of having migrated. Reach for a new `@layer components` class only for a pattern repeated
many times across files (the way `.btn-primary` is).

Custom color/font utilities come from the `@theme` tokens: `--color-brand` → `bg-brand`/`text-brand`/
`border-brand`, and so on for `--color-surface-page`, `--color-surface-card`, `--color-text-primary`,
`--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-gridline`, `--color-brand`,
`--color-brand-strong`, `--color-on-brand`, `--color-opt-1..4`, `--color-good`, `--color-critical`,
`--color-warn`; `--font-devanagari` → `font-devanagari` (Mukta, body), `--font-display` → `font-display`
(Yatra One, headings). Opacity modifiers work normally (`bg-good/20`). Tailwind's own default palette
(e.g. `bg-blue-500`) is still available but shouldn't be reached for — everything in this app should
come from the brand token set so light/dark theming stays automatic.

**"Dharmachakra" is the design direction** — Jain flag colors mapped to functional roles (gold=Guru,
jade=Chhatra, red=wrong/urgency), a dharmachakra wheel as both the logo (`WheelMark.jsx`) and the live
countdown (`Timer.jsx`), Yatra One (display) + Mukta (body — chosen for Devanagari+Latin support) from
Google Fonts. The four answer-option colors/shapes (`--color-opt-1..4`, `OptionButton.jsx`'s
triangle/diamond/circle/square icons, now also lettered A/B/C/D per option) are a colorblind-validated
categorical palette — don't change the *colors* without re-validating contrast (see the dataviz palette
methodology if touching this again). A second direction ("Ahimsa Mark" — quieter, ivory/indigo, single
restrained symbol) was proposed but not built; if asked to build it, it's new work, not a bug fix.
`/Users/naman/Downloads/jain-quiz.txt` (2026-09-21) holds four AI-generated static Tailwind mockup
concepts (Home, Guru Lobby+QR, Live Question stage, Mobile Chhatra) that motivated this Tailwind
migration and several concrete additions (QR lotus corners, PIN glow, answer status card, option
letter badges, glowing Start-quiz button, footer mantra line) — it's a reference file outside the repo,
not something to keep syncing against; treat it as spent once its ideas are incorporated.

**Background photo** (`client/public/images/temple-bg.jpg`, added 2026-09-21 — a Jain temple interior,
sourced from `/Users/naman/Downloads/stitch_jain_quiz_arena/screen.png`): applied globally via
`body::before` in `index.css` (`position: fixed; inset: -20px; z-index: -1;`, `transform: scale(1.05)`
— the overscan + scale keeps the blur from sampling a hard edge at the viewport boundary), dimmed/
blurred through the `--bg-photo-filter` theme token (blur+brightness+saturate, different values per
theme so it doesn't wash out the light-mode opt-out). `.card` and `.leaderboard-row` etc. stay fully
opaque on top of it as before; `.stage` had its own opaque `var(--color-surface-page)` fallback
**removed** from its background so the photo shows through there too — don't add an opaque `.stage`
background back without re-adding the photo some other way.

**The photo is deliberately downscaled to 640px wide, ~52KB** (2026-09-21) — up to 500 participant
phones at a real event, plausibly on weak/shared wifi, each pay this cost on first load, and it's
blurred on top regardless so the extra resolution of the original 1376px/240KB export bought nothing
visible. If this image ever needs replacing: `sips -Z 640 -s format jpeg -s formatOptions 72 <src>
--out client/public/images/temple-bg.jpg` (a full-resolution PNG straight from a source is the wrong
input for something rendered through a 10px blur). `server/index.js`'s production static-file
handler (`isProd` block) sets `Cache-Control: public, max-age=604800, immutable` for `client/assets/*`
(Vite content-hashes these — safe) and `client/images/*` (this photo — rarely changes), and
`no-cache` for everything else (`index.html`, so a redeploy always propagates). This exists specifically
so a participant who reconnects mid-event (see the reconnect note above — same underlying poor-wifi
scenario) doesn't re-pay for these on a second load. Don't widen the hard-cache branch to catch
`index.html` or any other file that isn't content-hashed.

**Dark is the fixed default theme, not system-driven** (2026-09-21) — every real use of this app is a
live event in a dark hall, so `:root` in `index.css` carries the dark palette unconditionally; there is
no `prefers-color-scheme` branch anymore. `:root[data-theme='light']` still exists as an explicit
opt-out for daytime quiz editing at a desk, but nothing in the app currently sets `data-theme` — it's a
manual escape hatch, not wired to a toggle. Don't reintroduce a system-preference branch without
someone explicitly asking for a non-event use case.

**Host session (`HostSession.jsx`) uses a separate "stage" layout, not the shared `.screen`/`.card`.**
This is the only page actually projected in front of a room — it needs to read from the back of a hall,
not fit a laptop-width card. It uses `.stage`/`.stage-*` classes in `index.css`: full-bleed, no
max-width cap, fluid type via `clamp(...)` sized against `vw` so it scales with screen size (PIN up to
`9rem`, question up to `4.2rem`). `Timer.jsx` takes a `variant="stage"` prop (`.timer-ring--stage`,
clamped up to 340px, vs. `.timer-ring--default` up to 136px on the participant's phone) — don't add a
third size without a reason; two is the deliberate set (presentation vs. handheld). Every other page
(`Landing`, `Join`, `HostLogin`,
`Dashboard`, `QuizEditor`, `Play`) keeps the original `.screen`/`.card` phone/desktop layout — that
scale still fits their real viewport.

The room PIN is shown throughout the whole session, not just the lobby — `.stage-pin-chip` in
`.stage-topbar` (2026-09-21). A Chhatra who needs to reconnect (see the participant-identity note
above) needs somewhere to read the PIN from again after the lobby has scrolled past; don't make that
chip lobby-only again.

**i18n** (`client/src/lib/i18n.jsx`, added 2026-09-21): a hand-rolled `LanguageProvider`/`useLanguage()`
context, not a library — the app is small enough that a flat `STRINGS.hi`/`STRINGS.en` dictionary plus
a `t(key, vars)` function with `{var}` interpolation is simpler than pulling in i18next. Language
choice persists in `localStorage` (`jainquiz_lang`), defaults to `'hi'`. Every page-level component
gets a `<LanguageToggle />` (fixed top-right via the `.lang-toggle` CSS class); `HostSession.jsx`'s
stage layout instead renders `<LanguageToggle inline />` inside `.stage-topbar` next to the quit
button, since a fixed-position toggle there would overlap it — don't add a second fixed toggle to that
page. New UI strings go in `STRINGS.hi` **and** `STRINGS.en` in the same edit, never just one.
Server-sent error strings (REST bodies, Socket.IO acks) are still hardcoded Hindi at the source — see
`SERVER_ERROR_MAP` in `i18n.jsx`, a finite lookup table translating the known set of server error
sentences, applied via `tServer(message)` wherever an error from `api.js` or a socket ack gets
displayed. This was a deliberate shortcut over plumbing error *codes* through the REST/Socket boundary;
if the server gains new error strings, add them to `SERVER_ERROR_MAP` too or they'll silently stay
Hindi in English mode.

**Timer (`Timer.jsx`, redesigned 2026-09-21)**: a `.timer-ring` — the countdown number is centered
*inside* the dharmachakra ring (not beside it) with a three-stage color/urgency progression driven by
seconds remaining: `--color-brand` (gold, safe) → `--color-warn` (amber, ≤10s) → `--color-critical`
(red, ≤5s, plus a faster pulse and a red glow via `filter: drop-shadow`). Ring size is `clamp()`-based
per `variant`
(`stage` vs. the default used on the participant's phone) so it scales with viewport rather than a
fixed pixel size. Don't reintroduce a number-beside-the-ring layout or a binary (non-graduated) color
switch — both were explicitly identified as illegible-from-a-distance / unclear-urgency problems.

## Deployment

Single Render.com free Web Service, deployed via the `render.yaml` Blueprint from
`github.com/lawkira2/jain-quiz` (live at `https://jain-quiz.onrender.com`). Required env vars:
`HOST_PASSCODE` (real secret — **never commit an actual value to this repo, which is public**),
`NODE_ENV=production`, optionally `MONGODB_URI` (MongoDB Atlas free M0 cluster) for quiz persistence
across restarts/redeploys — without it, quiz content falls back to a local file that free-tier hosts
wipe on every restart. `MAX_PARTICIPANTS` (500) and the single-instance requirement are both because
of the in-memory room state above — never suggest scaling to multiple instances for this app.
