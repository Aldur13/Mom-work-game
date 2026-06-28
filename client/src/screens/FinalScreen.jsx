export default function FinalScreen({ finalScores, myId }) {
  const top3 = finalScores.slice(0, 3);
  const rest = finalScores.slice(3);
  const myRank = finalScores.findIndex(p => p.id === myId) + 1;

  const podiumOrder = [
    top3[1] || null,
    top3[0] || null,
    top3[2] || null,
  ];

  const podiumClasses = ['p2', 'p1', 'p3'];
  const podiumEmojis = ['🥈', '🥇', '🥉'];

  return (
    <div className="screen" style={{ alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem' }}>Game Over</h2>
        {myRank === 1 && <p style={{ color: 'var(--accent)', fontWeight: 700, marginTop: '6px' }}>You won!</p>}
        {myRank > 1 && <p style={{ color: 'var(--text-dim)', marginTop: '6px' }}>You finished #{myRank}</p>}
      </div>

      <div className="podium" style={{ width: '100%' }}>
        {podiumOrder.map((player, i) =>
          player ? (
            <div key={player.id} className="podium-place">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: player.color || 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  color: '#0a0a1a',
                  marginBottom: 4,
                  border: '2px solid rgba(255,255,255,0.2)'
                }}
              >
                {player.name[0].toUpperCase()}
              </div>
              <div className="podium-name">{player.name}</div>
              <div className="podium-score">{player.score.toLocaleString()}</div>
              <div className={`podium-block ${podiumClasses[i]}`}>{podiumEmojis[i]}</div>
            </div>
          ) : <div key={i} />
        )}
      </div>

      {rest.length > 0 && (
        <div className="card-sm" style={{ width: '100%' }}>
          <h3 style={{ marginBottom: '10px' }}>Full Rankings</h3>
          <div className="score-rows">
            {rest.map((p, idx) => (
              <div key={p.id} className={`score-row${p.id === myId ? ' me' : ''}`}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: p.color || 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0a0a1a',
                    flexShrink: 0
                  }}
                >
                  {p.name[0].toUpperCase()}
                </span>
                <span className="rank">#{idx + 4}</span>
                <span className="score-name">{p.name}{p.id === myId ? ' (you)' : ''}</span>
                <span className="score-pts">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center' }}>
        Thanks for playing! To play again, refresh and create a new room.
      </p>
    </div>
  );
}
