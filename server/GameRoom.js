const DEFAULT_QUESTIONS = require('./questions');
const DEFAULT_ANSWERS = require('./defaultAnswers');

const DEFAULT_TOTAL_ROUNDS = 20;
const DEFAULT_TIME_LIMIT = 20000;

const PLAYER_COLORS = [
  '#e91e8c', '#00d4aa', '#7c4dff', '#ff6b35',
  '#ffd100', '#00b4d8', '#a8e063', '#f72585',
  '#3a86ff', '#fb5607', '#8338ec', '#06d6a0',
  '#ef233c', '#4cc9f0', '#c77dff', '#4361ee',
  '#43aa8b', '#f8961e'
];

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
    this.players = new Map();
    this.roundPool = [];
    this.currentRoundIndex = 0;
    this.currentRound = null;
    this.lastActivity = Date.now();
    this.questions = [...DEFAULT_QUESTIONS];
    this.totalRounds = DEFAULT_TOTAL_ROUNDS;
    this.timeLimit = DEFAULT_TIME_LIMIT;
    this.usingCustomQuestions = false;
    this._colorIndex = 0;

    const hostColor = PLAYER_COLORS[this._colorIndex++ % PLAYER_COLORS.length];
    this.players.set(hostId, {
      name: hostName,
      answers: null,
      score: 0,
      color: hostColor,
      avatar: null,
      streak: 0,
      maxStreak: 0,
      correctGuesses: 0,
      totalGuesses: 0
    });
  }

  configure({ questions, totalRounds, usingCustomQuestions, timeLimit }) {
    if (this.state !== 'lobby') return { error: 'Cannot configure after game has started' };

    if (typeof usingCustomQuestions === 'boolean') {
      this.usingCustomQuestions = usingCustomQuestions;
    }

    if (Array.isArray(questions)) {
      const cleaned = questions.map(q => (typeof q === 'string' ? q.trim().slice(0, 100) : '')).filter(Boolean);
      this.questions = cleaned.length > 0 ? cleaned : [...DEFAULT_QUESTIONS];
    } else if (!this.usingCustomQuestions) {
      this.questions = [...DEFAULT_QUESTIONS];
    }

    if (typeof totalRounds === 'number' && !isNaN(totalRounds)) {
      this.totalRounds = Math.max(5, Math.min(40, Math.round(totalRounds)));
    }

    if (typeof timeLimit === 'number' && !isNaN(timeLimit)) {
      this.timeLimit = Math.max(5000, Math.min(60000, timeLimit));
    }

    // Reset all profiles since questions may have changed
    for (const player of this.players.values()) {
      player.answers = null;
    }

    return { ok: true };
  }

  addPlayer(socketId, name) {
    if (this.state !== 'lobby') return { error: 'Game already started' };
    if (this.players.size >= 18) return { error: 'Room is full (max 18)' };
    const color = PLAYER_COLORS[this._colorIndex++ % PLAYER_COLORS.length];
    this.players.set(socketId, {
      name,
      answers: null,
      score: 0,
      color,
      avatar: null,
      streak: 0,
      maxStreak: 0,
      correctGuesses: 0,
      totalGuesses: 0
    });
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
      color: p.color,
      avatar: p.avatar,
      profileReady: p.answers !== null,
      isHost: id === this.hostId
    }));
    return { players, readyCount: players.filter(p => p.profileReady).length };
  }

  submitProfile(socketId, answers, avatar) {
    const player = this.players.get(socketId);
    if (!player) return { error: 'Player not found' };
    player.answers = answers;
    if (avatar) player.avatar = avatar;
    return { ok: true };
  }

  allProfilesReady() {
    return [...this.players.values()].every(p => p.answers !== null);
  }

  startGame() {
    if (this.players.size < 3) return { error: 'Need at least 3 players to start' };
    if (!this.allProfilesReady()) return { error: 'Not all players have submitted their profile' };
    if (this.usingCustomQuestions && this.players.size < 5) {
      return { error: 'Custom questions require at least 5 players so there are enough answer options' };
    }

    this.state = 'playing';

    const pool = [];
    for (const [id] of this.players) {
      for (let qi = 0; qi < this.questions.length; qi++) {
        pool.push({ subjectId: id, questionIndex: qi });
      }
    }

    const shuffled = shuffle(pool).slice(0, this.totalRounds);
    this.roundPool = shuffled.map((item, idx) => ({
      ...item,
      roundType: idx % 2 === 0 ? 'answer-guess' : 'player-guess'
    }));

    this.currentRoundIndex = 0;
    return { ok: true };
  }

  buildCurrentQuestion() {
    const { subjectId, questionIndex, roundType } = this.roundPool[this.currentRoundIndex];
    const subject = this.players.get(subjectId);
    const question = this.questions[questionIndex];
    const correctAnswer = subject.answers[`q${questionIndex}`].trim();

    if (roundType === 'player-guess') {
      const otherPlayers = [...this.players.entries()]
        .filter(([id]) => id !== subjectId)
        .map(([id, p]) => ({ id, text: p.name, color: p.color }));

      const decoys = shuffle(otherPlayers).slice(0, 3);
      const correctOption = { id: subjectId, text: subject.name, color: subject.color };
      const options = shuffle([correctOption, ...decoys]);

      this.currentRound = {
        subjectId,
        subjectName: subject.name,
        questionIndex,
        question,
        correctAnswer,
        correctOptionId: subjectId,
        options,
        questionSentAt: Date.now(),
        guesses: new Map(),
        roundType: 'player-guess'
      };

      return {
        question,
        subjectName: subject.name,
        subjectId,
        correctAnswer,
        options: options.map(o => ({ id: o.id, text: o.text, color: o.color })),
        roundNum: this.currentRoundIndex + 1,
        totalRounds: this.roundPool.length,
        totalPlayers: this.players.size,
        roundType: 'player-guess'
      };
    }

    // answer-guess: pick which answer belongs to the subject
    const distractors = [];
    for (const [id, player] of this.players) {
      if (id !== subjectId && player.answers) {
        const ans = (player.answers[`q${questionIndex}`] || '').trim();
        if (ans && ans.toLowerCase() !== correctAnswer.toLowerCase()) {
          distractors.push(ans);
        }
      }
    }

    let uniqueDistractors = shuffle([...new Set(distractors)]).slice(0, 3);

    // Pad with pre-seeded defaults if not enough player distractors
    if (uniqueDistractors.length < 3 && !this.usingCustomQuestions) {
      const defaults = (DEFAULT_ANSWERS[questionIndex] || [])
        .filter(d => d.toLowerCase() !== correctAnswer.toLowerCase() && !uniqueDistractors.map(x => x.toLowerCase()).includes(d.toLowerCase()));
      const needed = 3 - uniqueDistractors.length;
      uniqueDistractors = [...uniqueDistractors, ...shuffle(defaults).slice(0, needed)];
    }

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
      guesses: new Map(),
      roundType: 'answer-guess'
    };

    return {
      question,
      subjectName: subject.name,
      subjectId,
      correctAnswer,
      options: options.map(o => ({ id: o.id, text: o.text })),
      roundNum: this.currentRoundIndex + 1,
      totalRounds: this.roundPool.length,
      totalPlayers: this.players.size,
      roundType: 'answer-guess'
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
      let streakBonus = 0;
      let streakBroken = false;

      if (isCorrect) {
        const ratio = Math.min(guess.timeTaken / this.timeLimit, 1);
        points = Math.max(500, Math.round(1000 * (1 - ratio * 0.5)));

        // Update streak
        player.streak++;
        player.maxStreak = Math.max(player.maxStreak, player.streak);
        player.correctGuesses++;

        // Streak bonus: 1.25x at 3, 1.5x at 5, 2x at 10+
        if (player.streak >= 10) streakBonus = Math.round(points * 1);
        else if (player.streak >= 5) streakBonus = Math.round(points * 0.5);
        else if (player.streak >= 3) streakBonus = Math.round(points * 0.25);

        points += streakBonus;
      } else {
        wrongGuessCount++;
        // Break streak
        streakBroken = player.streak > 0;
        player.streak = 0;
      }

      player.totalGuesses++;
      player.score += points;

      results.push({
        playerId: socketId,
        playerName: player.name,
        playerColor: player.color,
        playerAvatar: player.avatar,
        optionId: guess.optionId,
        isCorrect,
        points,
        streakBonus,
        streak: player.streak,
        streakBroken,
        totalScore: player.score
      });
    }

    const subjectBonus = wrongGuessCount * 75;
    const subject = this.players.get(round.subjectId);
    if (subject) subject.score += subjectBonus;

    return {
      correctOptionId: round.correctOptionId,
      correctAnswer: round.correctAnswer,
      subjectId: round.subjectId,
      subjectName: round.subjectName,
      question: round.question,
      roundType: round.roundType,
      subjectBonus,
      results,
      scores: this.getLeaderboard()
    };
  }

  getLeaderboard() {
    return [...this.players.entries()]
      .map(([id, p]) => ({
        id,
        name: p.name,
        score: p.score,
        color: p.color,
        avatar: p.avatar,
        isHost: id === this.hostId,
        streak: p.streak,
        maxStreak: p.maxStreak,
        correctGuesses: p.correctGuesses,
        totalGuesses: p.totalGuesses
      }))
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
