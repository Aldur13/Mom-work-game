const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameRoom = require('./GameRoom');

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.CLIENT_URL || false)
  : '*';

const io = new Server(server, {
  cors: { origin: corsOrigin }
});

const rooms = new Map();             // code -> GameRoom
const socketToRoom = new Map();      // socketId -> roomCode
const revealTimers = new Map();      // code -> timeout ref
const disconnectTimers = new Map();  // timerKey -> timeout ref
const pendingRejoin = new Map();     // oldSocketId -> { code, name } (for reconnect matching)
const REJOIN_GRACE_PERIOD = 30 * 1000;

const PORT = process.env.PORT || 3001;
const LOBBY_TIMEOUT_MS = 60 * 60 * 1000;    // 1 hour
const FINISHED_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

function deleteRoom(code) {
  clearTimeout(revealTimers.get(code));
  revealTimers.delete(code);
  // Clear all pending disconnect timers for this room
  for (const [key, timer] of disconnectTimers) {
    if (key.startsWith(`${code}:`)) {
      clearTimeout(timer);
      disconnectTimers.delete(key);
    }
  }
  rooms.delete(code);
}

// Clean up abandoned/finished rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const age = now - (room.lastActivity || 0);
    if ((room.state === 'lobby' && age > LOBBY_TIMEOUT_MS) ||
        (room.state === 'finished' && age > FINISHED_TIMEOUT_MS)) {
      deleteRoom(code);
    }
  }
}, 10 * 60 * 1000);

io.on('connection', (socket) => {
  socket.on('create-room', ({ name }) => {
    if (!name || typeof name !== 'string') return;
    const trimmedName = name.trim().slice(0, 20);
    if (!trimmedName) return;
    const room = new GameRoom(socket.id, trimmedName);
    rooms.set(room.code, room);
    socketToRoom.set(socket.id, room.code);
    socket.join(room.code);
    socket.emit('joined-room', { code: room.code, isHost: true, questions: room.questions, totalRounds: room.totalRounds });
    io.to(room.code).emit('room-update', room.getRoomUpdate());
  });

  socket.on('join-room', ({ code, name }) => {
    if (!name || typeof name !== 'string') return;
    const trimmedName = name.trim().slice(0, 20);
    if (!trimmedName) return;
    const upperCode = (code || '').toUpperCase().trim();
    const room = rooms.get(upperCode);
    if (!room) { socket.emit('join-error', { message: 'Room not found. Check your code and try again.' }); return; }
    if (room.state !== 'lobby') { socket.emit('join-error', { message: 'This game has already started.' }); return; }
    const result = room.addPlayer(socket.id, trimmedName);
    if (result.error) { socket.emit('join-error', { message: result.error }); return; }
    socketToRoom.set(socket.id, upperCode);
    socket.join(upperCode);
    socket.emit('joined-room', { code: upperCode, isHost: false, questions: room.questions, totalRounds: room.totalRounds });
    io.to(upperCode).emit('room-update', room.getRoomUpdate());
  });

  const ALLOWED_AVATARS = new Set(['⭐','🎭','🎨','🎪','🎯','🎸','🎬','🏆','🎲','🎮','🚀','💎']);

  socket.on('submit-profile', ({ answers, avatar }) => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room) return;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return;
    const sanitized = {};
    for (const key of Object.keys(answers)) {
      if (typeof answers[key] === 'string') {
        sanitized[key] = answers[key].trim().slice(0, 60);
      }
    }
    const safeAvatar = typeof avatar === 'string' && ALLOWED_AVATARS.has(avatar) ? avatar : null;
    room.submitProfile(socket.id, sanitized, safeAvatar);
    io.to(code).emit('room-update', room.getRoomUpdate());
    socket.emit('profile-accepted');
  });

  socket.on('configure-room', ({ questions, totalRounds, usingCustomQuestions, roundTypes }) => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    room.configure({ questions, totalRounds, usingCustomQuestions, roundTypes });
    io.to(code).emit('room-configured', { questions: room.questions, totalRounds: room.totalRounds });
    io.to(code).emit('room-update', room.getRoomUpdate());
  });

  socket.on('start-game', () => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    const result = room.startGame();
    if (result.error) { socket.emit('game-error', { message: result.error }); return; }
    io.to(code).emit('game-started');
    sendNextQuestion(room, code);
  });

  socket.on('submit-guess', ({ optionId }) => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room) return;
    if (typeof optionId !== 'string') return;
    const result = room.submitGuess(socket.id, optionId);
    if (result.error) return;
    io.to(code).emit('guess-count', { count: result.guessCount, total: result.eligibleCount });
    if (room.allGuessesIn()) {
      clearTimeout(revealTimers.get(code));
      revealTimers.delete(code);
      triggerReveal(room, code);
    }
  });

  socket.on('next-round', () => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    const result = room.nextRound();
    if (result.finished) {
      io.to(code).emit('game-over', { finalScores: result.finalScores });
    } else {
      sendNextQuestion(room, code);
    }
  });

  socket.on('disconnect', () => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      // Store old socket ID so reconnect can find this player by name
      pendingRejoin.set(socket.id, { code, name: player.name });
    }

    const timerKey = `${code}:${socket.id}`;
    const timer = setTimeout(() => {
      pendingRejoin.delete(socket.id);
      room.removePlayer(socket.id);
      socketToRoom.delete(socket.id);
      disconnectTimers.delete(timerKey);

      if (room.players.size === 0) {
        deleteRoom(code);
        return;
      }
      io.to(code).emit('room-update', room.getRoomUpdate());
      if (room.state === 'playing' && room.allGuessesIn()) {
        clearTimeout(revealTimers.get(code));
        revealTimers.delete(code);
        triggerReveal(room, code);
      }
    }, REJOIN_GRACE_PERIOD);
    disconnectTimers.set(timerKey, timer);
  });

  socket.on('reconnect-player', ({ roomCode }) => {
    const code = roomCode?.toUpperCase().trim();
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    // Find old socket ID by matching room code stored in pendingRejoin
    let oldSocketId = null;
    for (const [oldId, info] of pendingRejoin) {
      if (info.code === code) {
        oldSocketId = oldId;
        break;
      }
    }
    if (!oldSocketId) return;

    const player = room.players.get(oldSocketId);
    if (!player) return;

    // Cancel the removal timer
    const timerKey = `${code}:${oldSocketId}`;
    clearTimeout(disconnectTimers.get(timerKey));
    disconnectTimers.delete(timerKey);
    pendingRejoin.delete(oldSocketId);

    // Move player entry to new socket ID
    room.players.delete(oldSocketId);
    room.players.set(socket.id, player);
    if (room.hostId === oldSocketId) room.hostId = socket.id;
    socketToRoom.delete(oldSocketId);
    socketToRoom.set(socket.id, code);
    socket.join(code);

    socket.emit('joined-room', { code, isHost: socket.id === room.hostId, questions: room.questions, totalRounds: room.totalRounds });
    io.to(code).emit('room-update', room.getRoomUpdate());
  });

  socket.on('kick-player', ({ targetSocketId }) => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (!targetSocketId || targetSocketId === socket.id) return;

    room.removePlayer(targetSocketId);
    socketToRoom.delete(targetSocketId);

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('kicked', { message: 'You have been removed from the game by the host.' });
      targetSocket.leave(code);
    }

    io.to(code).emit('room-update', room.getRoomUpdate());

    if (room.players.size === 0) {
      deleteRoom(code);
    }
  });

  socket.on('force-start-game', () => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.size < 3) { socket.emit('game-error', { message: 'Need at least 3 players to start.' }); return; }

    const result = room.startGame();
    if (result.error) { socket.emit('game-error', { message: result.error }); return; }
    io.to(code).emit('game-started');
    sendNextQuestion(room, code);
  });

  socket.on('force-reveal', () => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (room.state !== 'playing' || !room.currentRound) return;

    clearTimeout(revealTimers.get(code));
    revealTimers.delete(code);
    triggerReveal(room, code);
  });

  socket.on('add-points', ({ targetSocketId, amount }) => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (!targetSocketId || typeof amount !== 'number' || amount === 0) return;

    const player = room.players.get(targetSocketId);
    if (!player) return;

    player.score += amount;
    io.to(code).emit('room-update', room.getRoomUpdate());
  });

  socket.on('add-streak', ({ targetSocketId, amount }) => {
    const code = socketToRoom.get(socket.id);
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (!targetSocketId || typeof amount !== 'number' || amount === 0) return;

    const player = room.players.get(targetSocketId);
    if (!player) return;

    player.streak += amount;
    if (player.streak > player.maxStreak) {
      player.maxStreak = player.streak;
    }
    io.to(code).emit('room-update', room.getRoomUpdate());
  });
});

function sendNextQuestion(room, code) {
  const data = room.buildCurrentQuestion();

  io.to(code).emit('new-question', {
    question: data.question,
    subjectName: data.subjectName,
    subjectId: data.subjectId,
    options: data.options,
    roundNum: data.roundNum,
    totalRounds: data.totalRounds,
    totalPlayers: data.totalPlayers,
    timeLimit: data.timeLimit,
    roundType: data.roundType,
    specialType: data.specialType,
    ...(data.roundType === 'player-guess' ? { correctAnswer: data.correctAnswer } : {})
  });

  const subjectSocket = io.sockets.sockets.get(data.subjectId);
  if (subjectSocket) {
    subjectSocket.emit('you-are-subject', { question: data.question, yourAnswer: data.correctAnswer });
  }

  const timer = setTimeout(() => {
    revealTimers.delete(code);
    if (room.state === 'playing' && room.currentRound) triggerReveal(room, code);
  }, data.timeLimit + 500);
  revealTimers.set(code, timer);
}

function triggerReveal(room, code) {
  const reveal = room.calculateReveal();
  if (!reveal) return;
  io.to(code).emit('round-reveal', reveal);
}

server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
