import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket, emitAsync } from '../../lib/socket.js';
import { getHostPasscode } from '../../lib/api.js';
import Timer from '../../components/Timer.jsx';
import AnswerBars from '../../components/AnswerBars.jsx';
import LeaderboardList from '../../components/LeaderboardList.jsx';
import JoinQRCode from '../../components/JoinQRCode.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import { useLanguage } from '../../lib/i18n.jsx';

export default function HostSession() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { t, tServer } = useLanguage();

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
        setError(tServer(res?.error) || t('stageJoinError'));
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
    if (!res?.ok) setError(tServer(res.error));
    setBusy(false);
  }

  async function handleNext() {
    setBusy(true);
    await emitAsync('host:next', { pin });
    setBusy(false);
  }

  async function handleEnd() {
    if (!confirm(t('stageConfirmEnd'))) return;
    await emitAsync('host:end', { pin });
    navigate('/host/dashboard');
  }

  if (phase === 'connecting') return <div className="screen">{t('stageConnecting')}</div>;
  if (phase === 'error')
    return (
      <div className="screen">
        <LanguageToggle />
        <div className="card">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/host/dashboard')}>
            {t('stageBackToDashboard')}
          </button>
        </div>
      </div>
    );

  return (
    <div className="stage">
      <div className="stage-topbar">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge">{quizTitle}</span>
          {phase !== 'lobby' && <span className="badge stage-pin-chip">{t('stagePinBadge', { pin })}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LanguageToggle inline />
          <button className="stage-quit" onClick={handleEnd}>
            {t('stageEndSession')}
          </button>
        </div>
      </div>

      {phase === 'lobby' && (
        <>
          <p className="stage-eyebrow">{t('stageLobbyEyebrow')}</p>
          <div className="relative flex items-center justify-center">
            <span aria-hidden="true" className="stage-pin absolute inset-0 select-none text-brand opacity-60 blur-2xl">
              {pin}
            </span>
            <div className="stage-pin relative">{pin}</div>
          </div>
          <div style={{ margin: '8px 0 24px' }}>
            <JoinQRCode url={`${window.location.origin}/join?pin=${pin}`} size={200} />
          </div>
          <p className="stage-status">{t('stageJoined', { n: participants.length })}</p>
          <div className="stage-count-wall">
            {participants.map((p) => (
              <span key={p.id} className="name-chip">
                {p.name}
              </span>
            ))}
          </div>
          <div className="stage-actions relative inline-block">
            {participants.length > 0 && !busy && (
              <span aria-hidden="true" className="absolute -inset-1.5 rounded-2xl bg-brand/30 blur-lg" />
            )}
            <button className="btn btn-primary relative" disabled={busy || participants.length === 0} onClick={handleStart}>
              {participants.length === 0 ? (
                t('stageWaitingStudents')
              ) : busy ? (
                t('stageStarting')
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M8 5v14l11-7z" /></svg>
                  {t('stageStartQuiz')}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {phase === 'question' && question && (
        <>
          <p className="stage-eyebrow">{t('stageQuestionProgress', { i: question.index + 1, total: question.total })}</p>
          <h2 className="stage-question">{question.text}</h2>
          <Timer variant="stage" startTime={question.startTime} limitMs={question.limitMs} />
          <p className="stage-answercount">
            {t('stageAnsweredCount', { count: answeredCount.count, total: answeredCount.total || participants.length })}
          </p>
          <div className="stage-actions">
            <button className="btn btn-secondary" onClick={handleNext} disabled={busy}>
              {t('stageShowAnswer')}
            </button>
          </div>
        </>
      )}

      {phase === 'results' && results && question && (
        <>
          <p className="stage-eyebrow">{t('stageQuestionProgress', { i: results.index + 1, total: totalQuestions })}</p>
          <h2 className="stage-question" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
            {question.text}
          </h2>
          <p className="stage-correct">{t('stageCorrectAnswer', { answer: question.options[results.correctIndex] })}</p>
          <div className="stage-panel">
            <AnswerBars options={question.options} counts={results.counts} correctIndex={results.correctIndex} />
          </div>
          <h3 style={{ marginTop: 28, fontSize: 'clamp(1.3rem, 2vw, 1.8rem)' }}>{t('stageLeaderboard')}</h3>
          <div className="stage-panel">
            <LeaderboardList entries={results.leaderboard} />
          </div>
          <div className="stage-actions">
            <button className="btn btn-primary" onClick={handleNext} disabled={busy}>
              {results.isLastQuestion ? t('stageShowFinal') : t('stageNextQuestion')}
            </button>
          </div>
        </>
      )}

      {phase === 'final' && finalLeaderboard && (
        <>
          <h2 className="stage-question">{t('stageFinalLeaderboard')}</h2>
          <div className="stage-panel">
            <LeaderboardList entries={finalLeaderboard} />
          </div>
          <div className="stage-actions">
            <button className="btn btn-primary" onClick={handleEnd}>
              {t('stageEndSession')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
