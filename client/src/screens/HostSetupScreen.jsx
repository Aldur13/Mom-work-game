import { useState } from 'react';
import socket from '../socket';
import DEFAULT_QUESTIONS from '../questions';

const TIME_OPTIONS = [
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
];

export default function HostSetupScreen({ roomCode, onDone }) {
  const [useCustom, setUseCustom] = useState(false);
  const [customQuestions, setCustomQuestions] = useState(Array(10).fill(''));
  const [roundCount, setRoundCount] = useState(20);
  const [timePerRound, setTimePerRound] = useState(20);
  const [copied, setCopied] = useState(false);
  const [enableSpeedRound, setEnableSpeedRound] = useState(false);
  const [enableDebateRound, setEnableDebateRound] = useState(false);

  const filledCustom = customQuestions.filter(q => q.trim()).length;
  const customValid = !useCustom || filledCustom === 10;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleContinue = () => {
    const questions = useCustom ? customQuestions.map(q => q.trim()) : null;
    socket.emit('configure-room', {
      usingCustomQuestions: useCustom,
      questions,
      totalRounds: roundCount,
      timeLimit: timePerRound * 1000,
      roundTypes: {
        speedRound: enableSpeedRound,
        debateRound: enableDebateRound
      }
    });
    onDone(useCustom ? customQuestions.map(q => q.trim()) : DEFAULT_QUESTIONS);
  };

  return (
    <div className="screen">
      <div className="room-code-badge">
        <div className="label">Share this code to join</div>
        <div className="copy-row">
          <div className="code">{roomCode}</div>
          <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div>
        <h2>Game Settings</h2>
        <p className="subtitle" style={{ marginTop: '4px' }}>
          Set up your game before filling in your profile.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Questions */}
        <div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Questions</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${!useCustom ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, fontSize: '0.85rem', padding: '8px' }}
              onClick={() => setUseCustom(false)}
            >
              Default
            </button>
            <button
              className={`btn ${useCustom ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, fontSize: '0.85rem', padding: '8px' }}
              onClick={() => setUseCustom(true)}
            >
              Custom
            </button>
          </div>
          {!useCustom && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Using the 10 default questions. Works with 3+ players.
            </p>
          )}
          {useCustom && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Requires 5+ players. Fill in all 10 questions ({filledCustom}/10).
            </p>
          )}
        </div>

        {useCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', minWidth: '20px' }}>{i + 1}.</span>
                <input
                  type="text"
                  placeholder={DEFAULT_QUESTIONS[i] || `Question ${i + 1}`}
                  value={q}
                  maxLength={100}
                  onChange={e => {
                    const updated = [...customQuestions];
                    updated[i] = e.target.value;
                    setCustomQuestions(updated);
                  }}
                  style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Number of rounds */}
        <div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Number of Rounds</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min={5}
              max={40}
              value={roundCount}
              onChange={e => {
                const n = Math.max(5, Math.min(40, parseInt(e.target.value) || 20));
                setRoundCount(n);
              }}
              style={{ width: '70px', textAlign: 'center', fontSize: '1rem', padding: '6px' }}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>rounds (5–40)</span>
          </div>
        </div>

        {/* Time per round */}
        <div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Time per Round</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`btn ${timePerRound === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, fontSize: '0.85rem', padding: '8px' }}
                onClick={() => setTimePerRound(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Round Types */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          <p style={{ fontWeight: 600, marginBottom: '12px' }}>Special Rounds</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableSpeedRound}
                onChange={(e) => setEnableSpeedRound(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Speed Rounds</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>10s timer, 2x streak bonus</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableDebateRound}
                onChange={(e) => setEnableDebateRound(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Debate Rounds</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>30s, see other guesses before submit</div>
              </div>
            </label>
          </div>
        </div>

      </div>

      <button
        className="btn btn-success"
        onClick={handleContinue}
        disabled={!customValid}
      >
        {customValid ? 'Continue to Profile →' : `Fill in all 10 questions (${filledCustom}/10)`}
      </button>
    </div>
  );
}
