# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the **repo root** unless otherwise noted.

```bash
# Install all dependencies (root + client)
npm run install:all

# Development — server + Vite dev server concurrently (hot reload)
npm run dev

# Build React client for production
npm run build

# Run production server (serves built client on port 3001)
npm start
```

There are no tests. There is no linter configured.

### Local network play (no deploy needed)
```bash
npm run build
NODE_ENV=production node server/index.js
# share http://YOUR_LAN_IP:3001
```

## Architecture

This is a **monorepo**: a Node.js server at the root and a Vite + React client under `client/`.

```
/
├── server/
│   ├── index.js          # Express + Socket.IO setup, all socket event handlers
│   ├── GameRoom.js       # All game state, round logic, scoring — no I/O
│   ├── questions.js      # 10 default question strings
│   └── defaultAnswers.js # Fallback answer options per question (for small groups)
└── client/src/
    ├── App.jsx           # Socket listeners, screen router, session persistence
    ├── socket.js         # Socket.IO client instance + reconnection config
    ├── screens/          # One component per game phase
    └── utils/
        ├── sounds.js         # Web Audio API sound effects (no files)
        └── audioSettings.js  # localStorage sound preference
```

### Data flow

1. **Server is the single source of truth.** `GameRoom.js` holds all game state; clients only hold what the server emits.
2. `server/index.js` handles every socket event — it calls `GameRoom` methods and broadcasts updates. `GameRoom` has no socket awareness.
3. `App.jsx` owns all React state and wires every socket event via a single `useEffect`. It passes data down to screen components as props; screens never import socket directly except to `emit`.
4. Screen routing is a chain of `if (screen === '...')` guards in `App.jsx` — no router library.

### Key server maps

```js
rooms          // roomCode → GameRoom
socketToRoom   // socketId → roomCode
revealTimers   // roomCode → timeout ref (auto-reveal after timer)
disconnectTimers // "roomCode:socketId" → timeout ref (30s grace before removal)
pendingRejoin  // oldSocketId → { code, name }  (reconnect matching)
```

Use `deleteRoom(code)` (not `rooms.delete`) to clean up — it clears all associated timers.

### Round lifecycle

```
startGame() → buildCurrentQuestion() → [players submit-guess] →
triggerReveal() / calculateReveal() → nextRound() → repeat
```

- `buildCurrentQuestion()` sets `this.currentRound` and returns the payload for `new-question`.
- Two alternating round types: **answer-guess** (pick the right answer) and **player-guess** (pick who said it).
- Every 5th round can be a **speed round** (10 s, 2× streak bonus) or **debate round** (30 s), if the host enabled them.
- `calculateReveal()` scores guesses, updates streaks, awards subject bonus (75 pts × wrong guesses), then returns the full reveal payload.

### Scoring

- Speed: `max(500, round(1000 × (1 − timeTaken/timeLimit × 0.5)))` — faster = more points.
- Streak bonus: ≥3 correct = +25%, ≥5 = +50%, ≥10 = +100% (doubled on speed rounds).
- Subject bonus: 75 pts per player who guessed wrong.

### Reconnection

Mobile tab-switches trigger a socket disconnect. The flow:
1. `disconnect` handler stores the old socket ID in `pendingRejoin` and starts a 30-second removal timer.
2. `socket.js` on the client listens for `visibilitychange` and reconnects immediately when the tab comes back.
3. On reconnect, the client emits `reconnect-player` with the room code (read from `localStorage`).
4. The server matches via `pendingRejoin`, migrates the player entry to the new socket ID, and cancels the removal timer.

### Deployment

Deployed on **Railway**. Push to `main` triggers an automatic redeploy. The build splits into two phases via `nixpacks.toml` (root `npm ci` first, then client build) to avoid Railway hanging on `npm ci`.

Required environment variable: `NODE_ENV=production`. The Express server serves the built `client/dist` as static files when this is set.

GitHub repo: https://github.com/Aldur13/Know-your-crew
