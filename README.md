# Jain Gyan Quiz

A real-time, Kahoot-style quiz app for a Jainism quiz — one host ("Guru") controls
a live 25-question round, and up to 500 participants ("Chhatra") join from their
phones with a 6-character room PIN and compete on a live leaderboard.

## How it works

- **One process, in-memory sessions.** Like Kahoot, a live quiz session (room,
  participants, current question, scores) lives entirely in server memory, keyed
  by the PIN. A single Node.js process comfortably handles 500 concurrent
  Socket.IO connections, so there's no database or Redis needed for the live game.
- **Quiz content is persisted to MongoDB** (when `MONGODB_URI` is set — see
  "Persisting quizzes" below), edited through the Guru's in-app Quiz Editor. Quizzes
  built once survive server restarts/redeploys, so you can reuse them across
  events. Without `MONGODB_URI` set, it falls back to a local `data/quizzes.json`
  file — handy for local development, but that file does **not** survive a
  redeploy on most hosts (no persistent disk on Render's free tier, for example).
- **Server-authoritative timing and scoring.** The 15-second timer and each
  answer's elapsed time are measured on the server, not trusted from the client,
  so a participant can't fake a fast answer.
- **Scoring:** correct answers score by speed bracket — under 2s = 10 points,
  2–5s = 7.5, 6–10s = 5, 11–15s = 3. Wrong or missed answers score 0.

## Project structure

```
server/                    Express + Socket.IO backend (rooms, scoring, quiz storage)
  storage/mongoQuizzes.js   MongoDB-backed quiz storage (used when MONGODB_URI is set)
  storage/fileQuizzes.js    Local-JSON-file quiz storage (local dev fallback)
data/quizzes.json          Fallback quiz storage when MONGODB_URI isn't set
client/                    React (Vite) frontend
  src/pages/host/           Guru: login, dashboard, quiz editor, live session control
  src/pages/participant/    Chhatra: live play screen
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

## Persisting quizzes across restarts (MongoDB Atlas, free)

By default (no `MONGODB_URI` set) quizzes live in a local file, which is fine for
trying things out locally but gets wiped on most hosts whenever the server
restarts. To build your 25 questions **once** and reuse them for every future
event, connect a free MongoDB database:

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   and create a free **M0** cluster (512MB, free forever — no expiration).
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) — Render's
   free tier doesn't have a fixed outbound IP, so this is required.
4. Click **Connect → Drivers**, copy the connection string (looks like
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`).
5. Set that as the `MONGODB_URI` environment variable — locally in a `.env`-style
   export before `npm run dev`, or in Render's dashboard (the `render.yaml`
   Blueprint already declares this env var and will prompt you for it).

Once set, every quiz you create through the Guru dashboard is stored in MongoDB
and will still be there the next time you start a session — even after the
Render free instance sleeps and wakes back up, or after a redeploy.

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
4. When prompted for `MONGODB_URI`, paste your MongoDB Atlas connection string
   (see "Persisting quizzes" above) — or leave it blank if you're fine rebuilding
   questions before each event; the app falls back to local storage either way.
5. Deploy.

(No Blueprint support, or prefer the manual dashboard? **New → Web Service**,
connect the repo, set build command `npm install && npm run build`, start
command `npm start`, and add `HOST_PASSCODE` + `NODE_ENV=production` (and
`MONGODB_URI`, if you want persistent quizzes) as environment variables yourself.)

**Caveats of the free tier:**
- It spins down after ~15 minutes of no traffic and takes a few seconds to wake
  on the next request. For a live event, have the Guru open the site a minute or
  two before participants join so it's already warm — mid-quiz it won't sleep
  since traffic is continuous.
- Free-tier disk is **ephemeral** — without `MONGODB_URI` set, quizzes are lost
  whenever the instance restarts (including the idle-sleep/wake cycle above, not
  just redeploys). Set `MONGODB_URI` (see "Persisting quizzes") if you want to
  build questions once and reuse them.
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
