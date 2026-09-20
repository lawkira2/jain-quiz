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
        setError(res?.error || 'शामिल नहीं हो सके।');
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
      setError(res?.error || 'उत्तर सबमिट नहीं हो सका।');
    }
  }

  if (phase === 'joining') return <div className="screen">जुड़ रहे हैं…</div>;

  if (phase === 'error')
    return (
      <div className="screen">
        <div className="card">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/join')}>
            पुनः प्रयास करें
          </button>
        </div>
      </div>
    );

  if (phase === 'closed')
    return (
      <div className="screen">
        <div className="card">
          <h2>सत्र समाप्त हुआ</h2>
          <p className="muted">खेलने के लिए धन्यवाद!</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            होम
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
            <h2 style={{ marginTop: 16 }}>आप शामिल हो गए, {name}!</h2>
            <p className="muted">गुरु द्वारा क्विज़ शुरू करने की प्रतीक्षा हो रही है…</p>
            <p className="muted">रूम में {lobbyCount} खिलाड़ी हैं</p>
          </>
        )}

        {(phase === 'question' || phase === 'answered') && question && (
          <>
            <p className="muted">
              प्रश्न {question.index + 1} / {question.total}
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
            {phase === 'answered' && <p className="muted" style={{ marginTop: 16 }}>उत्तर लॉक हो गया — अन्य लोगों की प्रतीक्षा हो रही है…</p>}
          </>
        )}

        {phase === 'result' && roundResults && (
          <>
            {personalResult ? (
              <>
                <h2 className={personalResult.correct ? 'feedback-correct' : 'feedback-wrong'}>
                  {personalResult.correct ? 'सही! 🎉' : 'सही नहीं'}
                </h2>
                <p className="muted">
                  {personalResult.correct ? `+${personalResult.points} अंक` : 'इस राउंड में कोई अंक नहीं'}
                </p>
                <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>कुल: {personalResult.score}</p>
              </>
            ) : (
              <p className="muted">इस राउंड में कोई उत्तर दर्ज नहीं हुआ।</p>
            )}
            {question && (
              <p className="muted" style={{ marginTop: 8 }}>
                सही उत्तर: <strong>{question.options[roundResults.correctIndex]}</strong>
              </p>
            )}
            <h3 style={{ marginTop: 20 }}>लीडरबोर्ड</h3>
            <LeaderboardList entries={roundResults.leaderboard} myId={myId} />
            <p className="muted" style={{ marginTop: 16 }}>गुरु के आगे बढ़ने की प्रतीक्षा हो रही है…</p>
          </>
        )}

        {phase === 'final' && finalLeaderboard && (
          <>
            <h2>🏆 अंतिम परिणाम</h2>
            {(() => {
              const mine = finalLeaderboard.find((p) => p.id === myId);
              return mine ? (
                <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  आपने #{mine.rank} स्थान पर {mine.score} अंकों के साथ समाप्त किया
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
