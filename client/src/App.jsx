import { useState, useEffect, lazy, Suspense } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import socket from './socket';
import DEFAULT_QUESTIONS from './questions';
import { isSoundEnabled, toggleSound } from './utils/audioSettings';
import HomeScreen from './screens/HomeScreen';
import HostSetupScreen from './screens/HostSetupScreen';
import ProfileSetup from './screens/ProfileSetup';
import WaitingScreen from './screens/WaitingScreen';
import QuestionScreen from './screens/QuestionScreen';

const RevealScreen = lazy(() => import('./screens/RevealScreen'));
const FinalScreen = lazy(() => import('./screens/FinalScreen'));

export default function App() {
  const [screen, setScreen] = useState('home');
  const [myId, setMyId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [readyCount, setReadyCount] = useState(0);
  const [questionData, setQuestionData] = useState(null);
  const [isSubject, setIsSubject] = useState(false);
  const [mySubjectAnswer, setMySubjectAnswer] = useState(null);
  const [guessCount, setGuessCount] = useState({ count: 0, total: 0 });
  const [revealData, setRevealData] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [error, setError] = useState(null);
  const [gameError, setGameError] = useState(null);
  const [disconnected, setDisconnected] = useState(false);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [totalRounds, setTotalRounds] = useState(20);
  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      setMyId(socket.id);
      setDisconnected(false);

      // If we had a session, notify server to restore it
      const session = JSON.parse(localStorage.getItem('gameSession') || 'null');
      if (session?.roomCode && session?.screen && session?.screen !== 'home') {
        socket.emit('reconnect-player', { roomCode: session.roomCode });
      }
    };

    const handleDisconnect = () => {
      // Don't immediately set disconnected = true on the first disconnect
      // Wait a moment in case it's a tab switch (will reconnect quickly)
      setTimeout(() => {
        if (!socket.connected) {
          setDisconnected(true);
        }
      }, 2000);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const handleJoinedRoom = ({ code, isHost: host, questions: q, totalRounds: tr }) => {
      setRoomCode(code);
      setIsHost(host);
      if (q) setQuestions(q);
      if (tr) setTotalRounds(tr);
      const newScreen = host ? 'host-setup' : 'profile';
      setScreen(newScreen);
      // Store session for reconnection
      localStorage.setItem('gameSession', JSON.stringify({ roomCode: code, screen: newScreen }));
    };

    socket.on('joined-room', handleJoinedRoom);

    socket.on('room-configured', ({ questions: q, totalRounds: tr }) => {
      if (q) setQuestions(q);
      if (tr) setTotalRounds(tr);
    });

    socket.on('room-update', ({ players: p, readyCount: rc }) => {
      setPlayers(p);
      setReadyCount(rc);
    });

    socket.on('profile-accepted', () => {
      setScreen('waiting');
      const session = JSON.parse(localStorage.getItem('gameSession') || 'null');
      if (session) {
        session.screen = 'waiting';
        localStorage.setItem('gameSession', JSON.stringify(session));
      }
    });

    socket.on('game-started', () => {
      setGameError(null);
      setScreen('starting');
    });

    socket.on('new-question', (data) => {
      setQuestionData(data);
      setIsSubject(false);
      setMySubjectAnswer(null);
      setGuessCount({ count: 0, total: data.totalPlayers - 1 });
      setScreen('question');
    });

    socket.on('you-are-subject', ({ question, yourAnswer }) => {
      setIsSubject(true);
      setMySubjectAnswer(yourAnswer);
    });

    socket.on('guess-count', ({ count, total }) => {
      setGuessCount({ count, total });
    });

    socket.on('round-reveal', (data) => {
      setRevealData(data);
      setScreen('reveal');
    });

    socket.on('game-over', ({ finalScores: scores }) => {
      setFinalScores(scores);
      setScreen('final');
      // Clear session on game over
      localStorage.removeItem('gameSession');
    });

    socket.on('join-error', ({ message }) => setError(message));
    socket.on('game-error', ({ message }) => setGameError(message));
    socket.on('kicked', ({ message }) => {
      setError(message);
      setScreen('home');
      localStorage.removeItem('gameSession');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('joined-room');
      socket.off('room-configured');
      socket.off('room-update');
      socket.off('profile-accepted');
      socket.off('game-started');
      socket.off('new-question');
      socket.off('you-are-subject');
      socket.off('guess-count');
      socket.off('round-reveal');
      socket.off('game-over');
      socket.off('join-error');
      socket.off('game-error');
      socket.off('kicked');
    };
  }, []);

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundEnabled(newState);
  };

  const SoundButton = () => (
    <button
      onClick={handleSoundToggle}
      data-tooltip={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: soundEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        zIndex: 100
      }}
    >
      {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );

  if (disconnected) return (
    <div>
      <SoundButton />
      <div className="screen" style={{ textAlign: 'center' }}>
        <div className="error-banner">
          Connection lost. Attempting to reconnect...
          <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.8 }}>
            If you don't reconnect in a few seconds, please refresh the page.
          </div>
        </div>
      </div>
    </div>
  );

  if (screen === 'starting') return (
    <div>
      <SoundButton />
      <div className="screen" style={{ textAlign: 'center' }}>
        <p className="waiting-text">Game is starting...</p>
      </div>
    </div>
  );

  if (screen === 'home') return (
    <div>
      <SoundButton />
      <HomeScreen error={error} onClearError={() => setError(null)} />
    </div>
  );
  if (screen === 'host-setup') return (
    <div>
      <SoundButton />
      <HostSetupScreen
        roomCode={roomCode}
        onDone={(q) => { setQuestions(q); setScreen('profile'); }}
      />
    </div>
  );
  if (screen === 'profile') return (
    <div>
      <SoundButton />
      <ProfileSetup key={questions.join('||')} roomCode={roomCode} questions={questions} />
    </div>
  );
  if (screen === 'waiting') return (
    <div>
      <SoundButton />
      <WaitingScreen
        roomCode={roomCode}
        players={players}
        readyCount={readyCount}
        isHost={isHost}
        gameError={gameError}
        totalRounds={totalRounds}
        onClearError={() => setGameError(null)}
      />
    </div>
  );
  if (screen === 'question') return (
    <div>
      <SoundButton />
      <QuestionScreen
        questionData={questionData}
        isSubject={isSubject}
        mySubjectAnswer={mySubjectAnswer}
        guessCount={guessCount}
        isHost={isHost}
      />
    </div>
  );
  if (screen === 'reveal') return (
    <div>
      <SoundButton />
      <Suspense fallback={<div className="screen" style={{ textAlign: 'center' }}><p className="waiting-text">Loading results...</p></div>}>
        <RevealScreen
          revealData={revealData}
          isHost={isHost}
          myId={myId}
        />
      </Suspense>
    </div>
  );
  if (screen === 'final') return (
    <div>
      <SoundButton />
      <Suspense fallback={<div className="screen" style={{ textAlign: 'center' }}><p className="waiting-text">Loading final scores...</p></div>}>
        <FinalScreen finalScores={finalScores} myId={myId} />
      </Suspense>
    </div>
  );
  return null;
}
