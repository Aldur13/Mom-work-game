# Deployment Guide

The game is a single Node.js process in production — Express serves the built React client and handles WebSocket connections on the same port. Any platform that supports Node.js and WebSockets works.

---

## Option A — Railway (Recommended, free tier)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo** and select this repository
3. Railway auto-detects Node.js and runs `npm start`
4. Set the environment variable: `NODE_ENV=production`
5. Before deploying, build the client once and commit `client/dist/`:
   ```bash
   npm run build
   git add client/dist
   git commit -m "Add production build"
   git push
   ```
6. Railway gives you a public URL — share it with your players!

---

## Option B — Render (free tier)

1. Go to [render.com](https://render.com) and connect your GitHub account
2. Click **New → Web Service** and select this repo
3. Set:
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `NODE_ENV=production`
4. Deploy — Render gives you a `*.onrender.com` URL

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first player to open the link may wait ~30 seconds for the server to wake up.

---

## Option C — Fly.io

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. From the project root:
   ```bash
   fly launch       # follow the prompts
   npm run build
   fly deploy
   ```
3. Set the secret: `fly secrets set NODE_ENV=production`

---

## WebSocket note

All three platforms above support WebSockets on their free tiers. Socket.io is used for all real-time communication — make sure your platform does **not** force HTTP/2 only (it breaks WebSocket upgrades on some edge proxies).

---

## Playing on a local network (no internet needed)

If everyone is on the same Wi-Fi, you can run the game on your laptop without deploying anywhere:

```bash
npm run build
NODE_ENV=production node server/index.js
```

Find your local IP address:
```bash
# Mac / Linux
ifconfig | grep 'inet '

# Windows
ipconfig
```

Share `http://YOUR_LOCAL_IP:3001` with everyone on the same network. No internet required!
