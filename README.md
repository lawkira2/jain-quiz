# Jain Gyan Quiz

A real-time, Kahoot-style quiz app for a Jainism quiz — one host ("Guru") controls
a live 25-question round, and up to 500 participants ("Chhatra") join from their
phones with a 6-character room PIN and compete on a live leaderboard.

## How it works

- **One process, in-memory sessions.** Like Kahoot, a live quiz session (room,
  participants, current question, scores) lives entirely in server memory, keyed
  by the PIN. A single Node.js process comfortably handles 500 concurrent
  Socket.IO connections, so there's no database or Redis needed for the live game.
- **Quiz content is persisted** to `data/quizzes.json` on disk, edited through the
  Guru's in-app Quiz Editor (no code changes needed to write/update questions).
- **Server-authoritative timing and scoring.** The 15-second timer and each
  answer's elapsed time are measured on the server, not trusted from the client,
  so a participant can't fake a fast answer.
- **Scoring:** correct answers score by speed bracket — under 2s = 10 points,
  2–5s = 7.5, 6–10s = 5, 11–15s = 3. Wrong or missed answers score 0.

## Project structure

```
server/            Express + Socket.IO backend (rooms, scoring, quiz storage)
data/quizzes.json  Persisted quiz question banks
client/             React (Vite) frontend
  src/pages/host/    Guru: login, dashboard, quiz editor, live session control
  src/pages/participant/  Chhatra: live play screen
```

## Local development

Requires Node 20+.

```bash
# terminal 1 — backend (port 3001)
npm install
HOST_PASSCODE=your-secret npm run dev

# terminal 2 — frontend (port 5173, proxies /api and /socket.io to :3001)
cd client
npm install
npm run dev
```

Open `http://localhost:5173`:
- **Join as Chhatra** → enter a PIN + name.
- **I'm the Guru** → log in with `HOST_PASSCODE` → create a quiz (title + up to 25
  MCQs, 4 options each, mark the correct one) → **Start Session** to get a PIN →
  share the PIN, then **Start Quiz** once people have joined the lobby.

`HOST_PASSCODE` defaults to `jain-guru` if unset — **always set a real value**
before letting anyone else reach the site, since it's the only thing gating who
can create/control quizzes. In production (`NODE_ENV=production`), the server
refuses to start at all if `HOST_PASSCODE` is still the default — it exits with
a `FATAL:` log line rather than silently running with a guessable passcode.

## Production build & run

```bash
npm run build   # builds client/dist
HOST_PASSCODE=your-secret NODE_ENV=production PORT=3001 npm start
```

In production, Express serves the built React app and the Socket.IO/API traffic
from the same single port — this is what makes single-service free hosting work.

## Deploying for free (handles 500 concurrent users)

Any host that runs a persistent Node process (not a serverless function — those
don't hold WebSocket state) works. **Render's free Web Service** is a
straightforward option, and this repo includes a `render.yaml` Blueprint so
setup is one step:

1. Push this repo to GitHub.
2. On Render: **New → Blueprint**, connect the repo. Render reads `render.yaml`
   automatically (build command, start command, free plan, single instance).
3. When prompted for `HOST_PASSCODE`, enter your own secret — never leave it as
   `jain-guru`, and note the server refuses to boot in production without a real
   value set.
4. Deploy.

(No Blueprint support, or prefer the manual dashboard? **New → Web Service**,
connect the repo, set build command `npm install && npm run build`, start
command `npm start`, and add `HOST_PASSCODE` + `NODE_ENV=production` as
environment variables yourself.)

**Caveats of the free tier:**
- It spins down after ~15 minutes of no traffic and takes a few seconds to wake
  on the next request. For a live event, have the Guru open the site a minute or
  two before participants join so it's already warm — mid-quiz it won't sleep
  since traffic is continuous.
- Free-tier disk is **ephemeral** — a redeploy resets `data/quizzes.json`. Build
  your 25 questions shortly before the event, or keep a backup copy of the quiz
  JSON (visible via `GET /api/quizzes/:id` with your host passcode) so you can
  recreate it if needed.
- One live session = one process, so don't run multiple Render instances behind
  a load balancer for this app (that would split participants across processes
  that don't share room state). A single free instance is exactly what 500
  concurrent users needs — no scaling config required.

## Notes / things you may want to extend later

- Reconnection during a session is handled loosely: a disconnected participant's
  score is kept, but they can't currently rejoin an in-progress question if their
  connection drops mid-quiz.
- There's no accounts system — the host passcode is the only access control by
  design, to keep this simple to run for a one-off or recurring live event.
