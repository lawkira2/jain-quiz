import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket, emitAsync } from '../../lib/socket.js';
import { getHostPasscode } from '../../lib/api.js';
import Timer from '../../components/Timer.jsx';
import AnswerBars from '../../components/AnswerBars.jsx';
import LeaderboardList from '../../components/LeaderboardList.jsx';

export default function HostSession() {
  const { pin } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('connecting'); // connecting | lobby | question | results | final | error
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [question, setQuestion] = useState(null);
  const [answeredCount, setAnsweredCount] = useState({ count: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getHostPasscode()) {
      navigate('/host');
      return;
    }
    const socket = getSocket();

    async function join() {
      const res = await emitAsync('host:join', { pin, passcode: getHostPasscode() });
      if (!res?.ok) {
        setError(res?.error || 'Could not join room.');
        setPhase('error');
        return;
      }
      setQuizTitle(res.room.quizTitle);
      setTotalQuestions(res.room.totalQuestions);
      setParticipants(res.room.participants);
      setPhase(res.room.status === 'lobby' ? 'lobby' : res.room.status);
    }
    join();

    socket.on('lobby:update', ({ participants }) => setParticipants(participants));
    socket.on('question:show', (q) => {
      setQuestion(q);
      setResults(null);
      setAnsweredCount({ count: 0, total: participants.length });
      setPhase('question');
    });
    socket.on('question:answeredCount', (payload) => setAnsweredCount(payload));
    socket.on('question:results', (payload) => {
      setResults(payload);
      setPhase('results');
    });
    socket.on('quiz:final', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase('final');
    });

    return () => {
      socket.off('lobby:update');
      socket.off('question:show');
      socket.off('question:answeredCount');
      socket.off('question:results');
      socket.off('quiz:final');
    };
  }, [pin]);

  async function handleStart() {
    setBusy(true);
    const res = await emitAsync('host:start', { pin });
    if (!res?.ok) setError(res.error);
    setBusy(false);
  }

  async function handleNext() {
    setBusy(true);
    await emitAsync('host:next', { pin });
    setBusy(false);
  }

  async function handleEnd() {
    if (!confirm('End this session for everyone?')) return;
    await emitAsync('host:end', { pin });
    navigate('/host/dashboard');
  }

  if (phase === 'connecting') return <div className="screen">Connecting…</div>;
  if (phase === 'error')
    return (
      <div className="screen">
        <div className="card">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/host/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );

  return (
    <div className="screen" style={{ maxWidth: 760 }}>
      <div className="card">
        <div className="top-bar">
          <span className="badge">{quizTitle}</span>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '6px 12px', borderColor: 'var(--critical)', color: 'var(--critical)' }}
            onClick={handleEnd}
          >
            End Session
          </button>
        </div>

        {phase === 'lobby' && (
          <>
            <p className="muted">Room PIN — share this with your Chhatras</p>
            <div className="pin-display">{pin}</div>
            <p className="muted" style={{ marginBottom: 20 }}>
              {participants.length} joined
            </p>
            <div style={{ maxHeight: 240, overflowY: 'auto', width: '100%', marginBottom: 20 }}>
              <ul className="leaderboard-list">
                {participants.map((p) => (
                  <li key={p.id} className="leaderboard-row">
                    <span className="leaderboard-name">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button className="btn btn-primary" disabled={busy || participants.length === 0} onClick={handleStart}>
              {participants.length === 0 ? 'Waiting for Chhatras…' : busy ? 'Starting…' : 'Start Quiz'}
            </button>
          </>
        )}

        {phase === 'question' && question && (
          <>
            <p className="muted">
              Question {question.index + 1} / {question.total}
            </p>
            <h2>{question.text}</h2>
            <Timer startTime={question.startTime} limitMs={question.limitMs} />
            <p className="muted" style={{ marginBottom: 20 }}>
              {answeredCount.count} / {answeredCount.total || participants.length} answered
            </p>
            <button className="btn btn-secondary" onClick={handleNext} disabled={busy}>
              Reveal Answer Now
            </button>
          </>
        )}

        {phase === 'results' && results && question && (
          <>
            <p className="muted">
              Question {results.index + 1} / {totalQuestions}
            </p>
            <h2>{question.text}</h2>
            <p style={{ color: 'var(--good)', fontWeight: 700 }}>Correct: {question.options[results.correctIndex]}</p>
            <AnswerBars options={question.options} counts={results.counts} correctIndex={results.correctIndex} />
            <h3 style={{ marginTop: 20 }}>Leaderboard</h3>
            <LeaderboardList entries={results.leaderboard} />
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleNext} disabled={busy}>
              {results.isLastQuestion ? 'Show Final Results' : 'Next Question'}
            </button>
          </>
        )}

        {phase === 'final' && finalLeaderboard && (
          <>
            <h2>🏆 Final Leaderboard</h2>
            <LeaderboardList entries={finalLeaderboard} />
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleEnd}>
              End Session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
