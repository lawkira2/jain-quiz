import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getSocket, emitAsync } from '../../lib/socket.js';
import Timer from '../../components/Timer.jsx';
import OptionButton from '../../components/OptionButton.jsx';
import LeaderboardList from '../../components/LeaderboardList.jsx';

export default function Play() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;

  const [phase, setPhase] = useState('joining'); // joining | lobby | question | answered | result | final | closed | error
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [lobbyCount, setLobbyCount] = useState(0);
  const [myId, setMyId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [personalResult, setPersonalResult] = useState(null);
  const [roundResults, setRoundResults] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  useEffect(() => {
    if (!name) {
      navigate('/join');
      return;
    }
    const socket = getSocket();

    async function join() {
      const res = await emitAsync('participant:join', { pin, name });
      if (!res?.ok) {
        setError(res?.error || 'Could not join.');
        setPhase('error');
        return;
      }
      setMyId(res.participant.id);
      setQuizTitle(res.quizTitle);
      setPhase('lobby');
    }
    join();

    socket.on('lobby:update', ({ count }) => setLobbyCount(count));
    socket.on('question:show', (q) => {
      setQuestion(q);
      setSelected(null);
      setPersonalResult(null);
      setRoundResults(null);
      setPhase('question');
    });
    socket.on('participant:result', (payload) => setPersonalResult(payload));
    socket.on('question:results', (payload) => {
      setRoundResults(payload);
      setPhase('result');
    });
    socket.on('quiz:final', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase('final');
    });
    socket.on('room:closed', () => setPhase('closed'));

    return () => {
      socket.off('lobby:update');
      socket.off('question:show');
      socket.off('participant:result');
      socket.off('question:results');
      socket.off('quiz:final');
      socket.off('room:closed');
    };
  }, [pin, name]);

  async function handleAnswer(optionIndex) {
    if (selected !== null) return;
    setSelected(optionIndex);
    setPhase('answered');
    const res = await emitAsync('participant:answer', { pin, optionIndex });
    if (!res?.ok) {
      setError(res?.error || 'Could not submit answer.');
    }
  }

  if (phase === 'joining') return <div className="screen">Joining…</div>;

  if (phase === 'error')
    return (
      <div className="screen">
        <div className="card">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/join')}>
            Try Again
          </button>
        </div>
      </div>
    );

  if (phase === 'closed')
    return (
      <div className="screen">
        <div className="card">
          <h2>Session Ended</h2>
          <p className="muted">Thanks for playing!</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Home
          </button>
        </div>
      </div>
    );

  return (
    <div className="screen">
      <div className="card">
        {phase === 'lobby' && (
          <>
            <span className="badge">{quizTitle}</span>
            <h2 style={{ marginTop: 16 }}>You're in, {name}!</h2>
            <p className="muted">Waiting for the Guru to start the quiz…</p>
            <p className="muted">{lobbyCount} players in the room</p>
          </>
        )}

        {(phase === 'question' || phase === 'answered') && question && (
          <>
            <p className="muted">
              Question {question.index + 1} / {question.total}
            </p>
            <h2>{question.text}</h2>
            <Timer startTime={question.startTime} limitMs={question.limitMs} />
            <div className="option-grid" style={{ marginTop: 16 }}>
              {question.options.map((opt, i) => (
                <OptionButton
                  key={i}
                  index={i}
                  text={opt}
                  onClick={handleAnswer}
                  disabled={selected !== null}
                  muted={selected !== null && selected !== i}
                />
              ))}
            </div>
            {phase === 'answered' && <p className="muted" style={{ marginTop: 16 }}>Answer locked in — waiting for others…</p>}
          </>
        )}

        {phase === 'result' && roundResults && (
          <>
            {personalResult ? (
              <>
                <h2 className={personalResult.correct ? 'feedback-correct' : 'feedback-wrong'}>
                  {personalResult.correct ? 'Correct! 🎉' : 'Not quite'}
                </h2>
                <p className="muted">
                  {personalResult.correct ? `+${personalResult.points} points` : 'No points this round'}
                </p>
                <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>Total: {personalResult.score}</p>
              </>
            ) : (
              <p className="muted">No answer recorded this round.</p>
            )}
            {question && (
              <p className="muted" style={{ marginTop: 8 }}>
                Correct answer: <strong>{question.options[roundResults.correctIndex]}</strong>
              </p>
            )}
            <h3 style={{ marginTop: 20 }}>Leaderboard</h3>
            <LeaderboardList entries={roundResults.leaderboard} myId={myId} />
            <p className="muted" style={{ marginTop: 16 }}>Waiting for the Guru to continue…</p>
          </>
        )}

        {phase === 'final' && finalLeaderboard && (
          <>
            <h2>🏆 Final Results</h2>
            {(() => {
              const mine = finalLeaderboard.find((p) => p.id === myId);
              return mine ? (
                <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  You finished #{mine.rank} with {mine.score} points
                </p>
              ) : null;
            })()}
            <LeaderboardList entries={finalLeaderboard} myId={myId} />
          </>
        )}
      </div>
    </div>
  );
}
