import { useState, useEffect } from 'react';
import socket from './socket';
import HomeScreen from './screens/HomeScreen';
import ProfileSetup from './screens/ProfileSetup';
import WaitingScreen from './screens/WaitingScreen';
import QuestionScreen from './screens/QuestionScreen';
import RevealScreen from './screens/RevealScreen';
import FinalScreen from './screens/FinalScreen';

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

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => { setMyId(socket.id); setDisconnected(false); });
    socket.on('disconnect', () => setDisconnected(true));

    socket.on('joined-room', ({ code, isHost: host }) => {
      setRoomCode(code);
      setIsHost(host);
      setScreen('profile');
    });

    socket.on('room-update', ({ players: p, readyCount: rc }) => {
      setPlayers(p);
      setReadyCount(rc);
    });

    socket.on('profile-accepted', () => {
      setScreen('waiting');
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
    });

    socket.on('join-error', ({ message }) => setError(message));
    socket.on('game-error', ({ message }) => setGameError(message));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('joined-room');
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
    };
  }, []);

  if (disconnected) return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <div className="error-banner">Connection lost — please refresh the page to rejoin.</div>
    </div>
  );

  if (screen === 'starting') return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <p className="waiting-text">Game is starting...</p>
    </div>
  );

  if (screen === 'home') return <HomeScreen error={error} onClearError={() => setError(null)} />;
  if (screen === 'profile') return <ProfileSetup roomCode={roomCode} />;
  if (screen === 'waiting') return (
    <WaitingScreen
      roomCode={roomCode}
      players={players}
      readyCount={readyCount}
      isHost={isHost}
      gameError={gameError}
      onClearError={() => setGameError(null)}
    />
  );
  if (screen === 'question') return (
    <QuestionScreen
      questionData={questionData}
      isSubject={isSubject}
      mySubjectAnswer={mySubjectAnswer}
      guessCount={guessCount}
    />
  );
  if (screen === 'reveal') return (
    <RevealScreen
      revealData={revealData}
      isHost={isHost}
      myId={myId}
    />
  );
  if (screen === 'final') return <FinalScreen finalScores={finalScores} myId={myId} />;
  return null;
}
