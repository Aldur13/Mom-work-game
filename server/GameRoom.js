const QUESTIONS = require('./questions');

const TIME_LIMIT_MS = 20000;
const TOTAL_ROUNDS = 20;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class GameRoom {
  constructor(hostId, hostName) {
    this.code = generateCode();
    this.state = 'lobby';
    this.hostId = hostId;
    this.players = new Map(); // socketId -> { name, answers, score }
    this.roundPool = [];
    this.currentRoundIndex = 0;
    this.currentRound = null;
    this.lastActivity = Date.now();

    this.players.set(hostId, { name: hostName, answers: null, score: 0 });
  }

  addPlayer(socketId, name) {
    if (this.state !== 'lobby') return { error: 'Game already started' };
    if (this.players.size >= 18) return { error: 'Room is full (max 18)' };
    this.players.set(socketId, { name, answers: null, score: 0 });
    return { ok: true };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (socketId === this.hostId) {
      const next = this.players.keys().next().value;
      if (next) this.hostId = next;
    }
  }

  getRoomUpdate() {
    const players = Array.from(this.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      profileReady: p.answers !== null,
      isHost: id === this.hostId
    }));
    return { players, readyCount: players.filter(p => p.profileReady).length };
  }

  submitProfile(socketId, answers) {
    const player = this.players.get(socketId);
    if (!player) return { error: 'Player not found' };
    player.answers = answers;
    return { ok: true };
  }

  allProfilesReady() {
    return [...this.players.values()].every(p => p.answers !== null);
  }

  startGame() {
    if (this.players.size < 4) return { error: 'Need at least 4 players to start' };
    if (!this.allProfilesReady()) return { error: 'Not all players have submitted their profile' };

    this.state = 'playing';

    const pool = [];
    for (const [id] of this.players) {
      for (let qi = 0; qi < QUESTIONS.length; qi++) {
        pool.push({ subjectId: id, questionIndex: qi });
      }
    }
    this.roundPool = shuffle(pool).slice(0, TOTAL_ROUNDS);
    this.currentRoundIndex = 0;
    return { ok: true };
  }

  buildCurrentQuestion() {
    const { subjectId, questionIndex } = this.roundPool[this.currentRoundIndex];
    const subject = this.players.get(subjectId);
    const question = QUESTIONS[questionIndex];
    const correctAnswer = subject.answers[`q${questionIndex}`].trim();

    const distractors = [];
    for (const [id, player] of this.players) {
      if (id !== subjectId && player.answers) {
        const ans = (player.answers[`q${questionIndex}`] || '').trim();
        if (ans && ans.toLowerCase() !== correctAnswer.toLowerCase()) {
          distractors.push(ans);
        }
      }
    }

    const uniqueDistractors = shuffle([...new Set(distractors)]).slice(0, 3);

    const correctOption = { id: 'correct', text: correctAnswer };
    const wrongOptions = uniqueDistractors.map((text, i) => ({ id: `wrong_${i}`, text }));

    const options = shuffle([correctOption, ...wrongOptions]);

    this.currentRound = {
      subjectId,
      subjectName: subject.name,
      questionIndex,
      question,
      correctAnswer,
      correctOptionId: 'correct',
      options,
      questionSentAt: Date.now(),
      guesses: new Map()
    };

    return {
      question,
      subjectName: subject.name,
      subjectId,
      correctAnswer,
      options: options.map(o => ({ id: o.id, text: o.text })),
      roundNum: this.currentRoundIndex + 1,
      totalRounds: this.roundPool.length,
      totalPlayers: this.players.size
    };
  }

  submitGuess(socketId, optionId) {
    if (!this.currentRound || this.state !== 'playing') return { error: 'No active round' };
    if (socketId === this.currentRound.subjectId) return { error: 'Subject cannot guess' };
    if (this.currentRound.guesses.has(socketId)) return { error: 'Already guessed' };
    const validIds = this.currentRound.options.map(o => o.id);
    if (!validIds.includes(optionId)) return { error: 'Invalid option' };

    this.lastActivity = Date.now();
    const timeTaken = Date.now() - this.currentRound.questionSentAt;
    this.currentRound.guesses.set(socketId, { optionId, timeTaken });

    const eligibleCount = this.players.size - 1;
    return { ok: true, guessCount: this.currentRound.guesses.size, eligibleCount };
  }

  allGuessesIn() {
    return this.currentRound && this.currentRound.guesses.size >= this.players.size - 1;
  }

  calculateReveal() {
    if (this.state !== 'playing') return null;
    this.state = 'reveal';

    const round = this.currentRound;
    const results = [];
    let wrongGuessCount = 0;

    for (const [socketId, guess] of round.guesses) {
      const player = this.players.get(socketId);
      if (!player) continue;

      const isCorrect = guess.optionId === round.correctOptionId;
      let points = 0;
      if (isCorrect) {
        const ratio = Math.min(guess.timeTaken / TIME_LIMIT_MS, 1);
        points = Math.max(500, Math.round(1000 * (1 - ratio * 0.5)));
      } else {
        wrongGuessCount++;
      }

      player.score += points;
      results.push({ playerId: socketId, playerName: player.name, optionId: guess.optionId, isCorrect, points, totalScore: player.score });
    }

    const subjectBonus = wrongGuessCount * 25;
    const subject = this.players.get(round.subjectId);
    if (subject) {
      subject.score += subjectBonus;
    }

    return {
      correctOptionId: round.correctOptionId,
      correctAnswer: round.correctAnswer,
      subjectId: round.subjectId,
      subjectName: round.subjectName,
      question: round.question,
      subjectBonus,
      results,
      scores: this.getLeaderboard()
    };
  }

  getLeaderboard() {
    return [...this.players.entries()]
      .map(([id, p]) => ({ id, name: p.name, score: p.score, isHost: id === this.hostId }))
      .sort((a, b) => b.score - a.score);
  }

  nextRound() {
    this.currentRoundIndex++;
    if (this.currentRoundIndex >= this.roundPool.length) {
      this.state = 'finished';
      return { finished: true, finalScores: this.getLeaderboard() };
    }
    this.state = 'playing';
    this.currentRound = null;
    return { finished: false };
  }
}

module.exports = GameRoom;
