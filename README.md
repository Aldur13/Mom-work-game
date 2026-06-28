# Know Your Crew

A social multiplayer party game for game night. Players answer fun icebreaker questions about themselves, then try to guess which answer belongs to which player.

Supports 4–18 players. Works on any device with a browser.

## How to Play

1. One person creates a room and shares the 4-letter code.
2. Everyone joins and fills in their profile (10 short questions).
3. The host starts the game — 20 rounds of guessing!
4. Each round spotlights one player's answer. Everyone else guesses whose it is.
5. Score points for correct guesses (faster = more points). The subject earns bonus points for every wrong guess.

## Local Development

**Prerequisites:** Node.js 18+

```bash
# Install all dependencies
npm run install:all

# Start both server and client in dev mode
npm run dev
```

The server runs on `http://localhost:3001` and the Vite dev client on `http://localhost:5173`.

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port for the Express/Socket.IO server |
| `NODE_ENV` | `development` | Set to `production` for deployment |
| `CLIENT_URL` | *(unset)* | Production client URL for CORS (e.g. `https://your-app.up.railway.app`) |

## Production Build

```bash
npm run build   # builds client/dist
npm start       # starts the server (serves built client in production)
```

## Deploying to Railway

The repo includes a `railway.toml`. Connect your GitHub repo in Railway and set the environment variables above. Railway will run `npm start` automatically.
