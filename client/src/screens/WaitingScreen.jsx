import { useState } from 'react';
import socket from '../socket';
import { Check, Users, Copy, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export default function WaitingScreen({ roomCode, players, readyCount, isHost, gameError, onClearError }) {
  const [copied, setCopied] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
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

  const handleKick = (socketId) => {
    socket.emit('kick-player', { targetSocketId: socketId });
  };

  const handleForceStart = () => {
    onClearError();
    socket.emit('force-start-game');
  };

  const handleAddPoints = (socketId, amount) => {
    socket.emit('add-points', { targetSocketId: socketId, amount });
  };

  const handleAddStreak = (socketId, amount) => {
    socket.emit('add-streak', { targetSocketId: socketId, amount });
  };

  return (
    <div className="screen">
      <div className="room-code-badge">
        <div className="label">Share this code to join</div>
        <div className="copy-row">
          <div className="code">{roomCode}</div>
          <button
            className={`copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            data-tooltip={copied ? 'Copied!' : 'Copy room code'}
          >
            <span className="icon-btn-inner">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>
        </div>
      </div>

      <div className="info-row">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} /> Players
        </h3>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 500 }}>
          {readyCount}/{total} profiles ready
        </span>
      </div>

      <div className="scroll-list">
        {total === 0 ? (
          <>
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" style={{ opacity: 0.7 }} />
            <div className="skeleton skeleton-row" style={{ opacity: 0.45 }} />
          </>
        ) : players.map(p => (
          <div key={p.id} className="player-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="player-avatar" style={{ background: p.color || 'var(--primary)', fontSize: '1.4rem' }}>
              {p.avatar || p.name[0].toUpperCase()}
            </div>
            <span className="player-name">{p.name}</span>
            {p.isHost && <span className="player-badge host">Host</span>}
            <span className={`player-badge ${p.profileReady ? 'ready' : ''}`}>
              {p.profileReady ? <><Check size={11} /> Ready</> : 'Filling in...'}
            </span>
            {isHost && !p.isHost && (
              <button
                className="btn btn-ghost"
                onClick={() => handleKick(p.id)}
                style={{ marginLeft: 'auto', padding: '4px 8px', minWidth: 'auto' }}
                title="Remove player"
              >
                <X size={14} />
              </button>
            )}
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

          {/* Admin Panel Toggle */}
          <button
            className="btn btn-ghost"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '0.9rem' }}
          >
            {showAdminPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Admin Console
          </button>

          {/* Admin Panel */}
          {showAdminPanel && (
            <div style={{
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Admin Commands</div>
              <button
                className="btn btn-primary"
                onClick={handleForceStart}
                disabled={total < minPlayers}
                style={{ fontSize: '0.9rem', gap: '6px' }}
              >
                <Zap size={14} /> Force Start ({total} players)
              </button>
              {total < minPlayers && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                  Need at least {minPlayers} players to start
                </p>
              )}

              {/* Player Adjustments */}
              {total > 0 && (
                <div style={{ borderTop: '1px solid rgba(255, 107, 53, 0.2)', paddingTop: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px' }}>Adjust Player Stats</div>
                  {players.map(p => (
                    <div key={p.id} style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '6px',
                      padding: '8px',
                      marginBottom: '8px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px' }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleAddPoints(p.id, 50)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }}
                        >
                          +50 pts
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleAddPoints(p.id, -50)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }}
                        >
                          -50 pts
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleAddStreak(p.id, 1)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }}
                        >
                          +1 streak
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleAddStreak(p.id, -1)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }}
                        >
                          -1 streak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="waiting-text">
          {allReady ? 'Everyone is ready! Waiting for the host to start...' : `Waiting for ${total - readyCount} more player${total - readyCount !== 1 ? 's' : ''} to fill in their profile...`}
        </p>
      )}
    </div>
  );
}
