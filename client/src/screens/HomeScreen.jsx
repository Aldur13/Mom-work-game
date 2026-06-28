import { useState } from 'react';
import socket from '../socket';

export default function HomeScreen({ error, onClearError }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'

  const trimmedName = name.trim();
  const trimmedCode = joinCode.trim();

  const handleCreate = () => {
    if (!trimmedName) return;
    onClearError();
    socket.emit('create-room', { name: trimmedName });
  };

  const handleJoin = () => {
    if (!trimmedName || !trimmedCode) return;
    onClearError();
    socket.emit('join-room', { code: trimmedCode, name: trimmedName });
  };

  return (
    <div className="screen" style={{ justifyContent: 'center', paddingTop: '60px' }}>
      <div className="center">
        <div className="game-title">Know Your Crew</div>
        <p className="subtitle" style={{ marginTop: '8px' }}>The social game for people who think they know each other</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Your name</span>
          <input
            type="text"
            placeholder="e.g. Sarah"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
        </label>

        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <button className="btn btn-primary" onClick={() => setMode('create')} disabled={!trimmedName}>
              Create a Room
            </button>
            <div className="divider">or</div>
            <button className="btn btn-ghost" onClick={() => setMode('join')} disabled={!trimmedName}>
              Join a Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center' }}>
              You'll be the host. Share the room code with up to 17 friends!
            </p>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!trimmedName}>
              Create Room
            </button>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>Back</button>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Room code</span>
              <input
                type="text"
                placeholder="e.g. AB3X"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '1.3rem', textAlign: 'center' }}
              />
            </label>
            <button className="btn btn-primary" onClick={handleJoin} disabled={!trimmedName || trimmedCode.length < 4}>
              Join Room
            </button>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>Back</button>
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        3–18 players · Works on any device
      </p>
    </div>
  );
}
