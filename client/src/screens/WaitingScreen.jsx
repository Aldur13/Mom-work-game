import { useState } from 'react';
import socket from '../socket';

export default function WaitingScreen({ roomCode, players, readyCount, isHost, gameError, onClearError }) {
  const [copied, setCopied] = useState(false);
  const total = players.length;
  const minPlayers = 3;
  const allReady = readyCount === total && total >= minPlayers;
  const canStart = isHost && allReady;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStart = () => {
    onClearError();
    socket.emit('start-game');
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

      <div className="info-row">
        <h3>Players</h3>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          {readyCount}/{total} profiles ready
        </span>
      </div>

      <div className="scroll-list">
        {players.map(p => (
          <div key={p.id} className="player-row">
            <div className="player-avatar" style={{ background: p.color || 'var(--primary)' }}>
              {p.name[0].toUpperCase()}
            </div>
            <span className="player-name">{p.name}</span>
            {p.isHost && <span className="player-badge host">Host</span>}
            <span className={`player-badge ${p.profileReady ? 'ready' : ''}`}>
              {p.profileReady ? '✓ Ready' : 'Filling in...'}
            </span>
          </div>
        ))}
      </div>

      {gameError && <div className="error-banner">{gameError}</div>}

      {isHost ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!allReady && (
            <p className="waiting-text">
              {total < minPlayers
                ? `Need at least ${minPlayers} players to start (${total} joined)`
                : `Waiting for ${total - readyCount} more player${total - readyCount !== 1 ? 's' : ''} to fill in their profile...`}
            </p>
          )}
          <button className="btn btn-success" onClick={handleStart} disabled={!canStart}>
            {allReady ? 'Start Game' : 'Waiting for everyone...'}
          </button>
        </div>
      ) : (
        <p className="waiting-text">
          {allReady ? 'Everyone is ready! Waiting for the host to start...' : `Waiting for ${total - readyCount} more player${total - readyCount !== 1 ? 's' : ''} to fill in their profile...`}
        </p>
      )}
    </div>
  );
}
