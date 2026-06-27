# Setup & Installation

## Requirements

- [Node.js](https://nodejs.org) v18 or later
- npm v8 or later

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/aldur13/mom-work-game.git
cd mom-work-game

# 2. Install all dependencies (root + client)
npm run install:all
```

---

## Running locally

```bash
npm run dev
```

This starts two servers concurrently:
| Server | URL | Purpose |
|---|---|---|
| Backend | http://localhost:3001 | Express + Socket.io |
| Frontend | http://localhost:5173 | Vite dev server |

Open **http://localhost:5173** in your browser.

To simulate multiple players, open several browser tabs or use incognito windows with different names.

---

## Project Structure

```
mom-work-game/
├── server/
│   ├── index.js          # Express + Socket.io server
│   ├── GameRoom.js       # Game state machine
│   └── questions.js      # The 10 profile questions
├── client/
│   ├── src/
│   │   ├── App.jsx              # Main app (socket-driven state machine)
│   │   ├── socket.js            # Socket.io client singleton
│   │   ├── questions.js         # Profile questions (mirrors server)
│   │   ├── index.css            # Global styles
│   │   └── screens/
│   │       ├── HomeScreen.jsx
│   │       ├── ProfileSetup.jsx
│   │       ├── WaitingScreen.jsx
│   │       ├── QuestionScreen.jsx
│   │       ├── RevealScreen.jsx
│   │       └── FinalScreen.jsx
│   ├── index.html
│   └── vite.config.js
├── docs/                  # This wiki
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the backend server listens on |
| `NODE_ENV` | `development` | Set to `production` to serve the built client |

---

## Building for production

```bash
# Build the React client
npm run build

# Start the production server (serves built client + API)
NODE_ENV=production npm start
```

In production mode, Express serves the compiled React app from `client/dist/` at the root URL, and the Socket.io server runs on the same port — no separate Vite server needed.
