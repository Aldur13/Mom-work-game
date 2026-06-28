import { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { playLock, playCorrect, playWrong } from '../utils/sounds';

const SLOT_COLORS = ['#e91e8c', '#00d4aa', '#7c4dff', '#ff6b35'];

export default function QuestionScreen({ questionData, isSubject, mySubjectAnswer, guessCount }) {
  const [selected, setSelected] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(questionData.timeLimit / 1000);
  const intervalRef = useRef(null);

  useEffect(() => {
    setSelected(null);
    setHasAnswered(false);
    const limit = questionData.timeLimit / 1000;
    setTimeLeft(limit);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 0.1);
        if (next === 0) clearInterval(intervalRef.current);
        return next;
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [questionData]);

  const handleGuess = (optionId) => {
    if (hasAnswered || isSubject) return;
    setSelected(optionId);
    setHasAnswered(true);
    clearInterval(intervalRef.current);
    playLock();
    socket.emit('submit-guess', { optionId });
  };

  const pct = (timeLeft / (questionData.timeLimit / 1000)) * 100;
  const timerColor = pct > 40 ? 'var(--accent)' : pct > 20 ? '#ff9800' : 'var(--danger)';
  const eligibleTotal = guessCount.total || (questionData.totalPlayers - 1);
  const isPlayerGuess = questionData.roundType === 'player-guess';

  if (isSubject) {
    return (
      <div className="screen">
        <div className="round-badge">Round {questionData.roundNum} / {questionData.totalRounds}</div>
        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${pct}%`, backgroundColor: timerColor }} />
        </div>

        <div className="spotlight-card">
          <h2>You're in the spotlight</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.9rem' }}>
            {isPlayerGuess
              ? 'Your crew is guessing which answer is yours!'
              : 'Your crew is guessing your answer to:'}
          </p>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '10px' }}>{questionData.question}</p>
          <div className="your-answer-box">
            <span className="your-answer-label">Your answer</span>
            <span className="your-answer-text">"{mySubjectAnswer}"</span>
          </div>
        </div>

        <div className="guess-progress">
          <p>{guessCount.count} / {eligibleTotal} players have guessed</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: eligibleTotal > 0 ? `${(guessCount.count / eligibleTotal) * 100}%` : '0%' }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', color: timerColor, fontWeight: 700, marginTop: 'auto' }}>
          {Math.ceil(timeLeft)}s remaining
        </div>
      </div>
    );
  }

  if (isPlayerGuess) {
    return (
      <div className="screen">
        <div className="round-badge">Round {questionData.roundNum} / {questionData.totalRounds}</div>
        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${pct}%`, backgroundColor: timerColor }} />
        </div>
        <div style={{ textAlign: 'center', color: timerColor, fontWeight: 700, fontSize: '1.4rem' }}>
          {Math.ceil(timeLeft)}
        </div>

        <div className="question-box">
          <p className="question-label">
            Someone answered this to: <strong>{questionData.question}</strong>
          </p>
          <p className="question-text" style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '10px' }}>
            "{questionData.correctAnswer}"
          </p>
          <p style={{ marginTop: '10px', fontSize: '0.95rem', color: 'var(--text-dim)' }}>Who said it?</p>
        </div>

        <div className="options-grid">
          {questionData.options.map((opt, idx) => {
            const color = opt.color || SLOT_COLORS[idx];
            return (
              <button
                key={opt.id}
                className={`option-btn${selected === opt.id ? ' selected' : ''}${hasAnswered ? ' answered' : ''}`}
                style={{
                  '--opt-clr': color,
                  ...(selected === opt.id && { background: color + '28' })
                }}
                onClick={() => handleGuess(opt.id)}
                disabled={hasAnswered}
              >
                <span className="option-num">{idx + 1}</span>
                <span className="option-text" style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="option-player-dot" style={{ background: color }} />
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>

        {hasAnswered && (
          <div className="answered-status">
            <p>Answer locked in!</p>
            <p style={{ marginTop: '6px' }}>
              <strong>{guessCount.count}</strong> / {eligibleTotal} players have answered
            </p>
          </div>
        )}
      </div>
    );
  }

  // answer-guess (default)
  return (
    <div className="screen">
      <div className="round-badge">Round {questionData.roundNum} / {questionData.totalRounds}</div>
      <div className="timer-bar">
        <div className="timer-fill" style={{ width: `${pct}%`, backgroundColor: timerColor }} />
      </div>
      <div style={{ textAlign: 'center', color: timerColor, fontWeight: 700, fontSize: '1.4rem' }}>
        {Math.ceil(timeLeft)}
      </div>

      <div className="question-box">
        <p className="question-label">Whose answer is it?</p>
        <p style={{ fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', margin: '6px 0 4px' }}>
          {questionData.subjectName}
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '6px' }}>
          answered this question:
        </p>
        <p className="question-text">{questionData.question}</p>
      </div>

      <div className="options-grid">
        {questionData.options.map((opt, idx) => {
          const color = SLOT_COLORS[idx];
          return (
            <button
              key={opt.id}
              className={`option-btn${selected === opt.id ? ' selected' : ''}${hasAnswered ? ' answered' : ''}`}
              style={{
                '--opt-clr': color,
                ...(selected === opt.id && { background: color + '28' })
              }}
              onClick={() => handleGuess(opt.id)}
              disabled={hasAnswered}
            >
              <span className="option-num">{idx + 1}</span>
              <span className="option-text">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {hasAnswered && (
        <div className="answered-status">
          <p>Answer locked in!</p>
          <p style={{ marginTop: '6px' }}>
            <strong>{guessCount.count}</strong> / {eligibleTotal} players have answered
          </p>
        </div>
      )}
    </div>
  );
}
