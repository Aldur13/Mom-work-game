import { useState } from 'react';
import socket from '../socket';

const AVATAR_EMOJIS = ['⭐', '🎭', '🎨', '🎪', '🎯', '🎸', '🎬', '🏆', '🎲', '🎮', '🚀', '💎'];

export default function ProfileSetup({ roomCode, questions }) {
  const [answers, setAnswers] = useState(Object.fromEntries(questions.map((_, i) => [`q${i}`, ''])));
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(AVATAR_EMOJIS[0]);

  const allFilled = questions.every((_, i) => answers[`q${i}`]?.trim().length > 0);

  const handleSubmit = () => {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    socket.emit('submit-profile', { answers, avatar: selectedEmoji });
  };

  return (
    <div className="screen">
      <div className="room-code-badge">
        <div className="label">Room Code</div>
        <div className="code">{roomCode}</div>
      </div>

      <div>
        <h2>Your Profile</h2>
        <p className="subtitle" style={{ marginTop: '4px' }}>
          Answer all {questions.length} questions — your crew will guess your answers!
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem' }}>Choose Your Avatar</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {AVATAR_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  fontSize: '2rem',
                  background: selectedEmoji === emoji ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  border: selectedEmoji === emoji ? '2px solid var(--accent)' : '2px solid transparent',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="profile-form">
          {questions.map((q, i) => (
            <div key={i} className="profile-question">
              <label>
                <span style={{ color: 'var(--text-dim)', marginRight: '6px' }}>{i + 1}.</span>
                <span>{q}</span>
              </label>
              <input
                type="text"
                placeholder="Your answer..."
                value={answers[`q${i}`]}
                onChange={e => setAnswers(prev => ({ ...prev, [`q${i}`]: e.target.value }))}
                maxLength={60}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn btn-success"
        onClick={handleSubmit}
        disabled={!allFilled || submitting}
        style={{ marginTop: '4px' }}
      >
        {submitting ? 'Submitting...' : `Submit Profile (${questions.filter((_, i) => answers[`q${i}`]?.trim()).length}/${questions.length} filled)`}
      </button>
    </div>
  );
}
