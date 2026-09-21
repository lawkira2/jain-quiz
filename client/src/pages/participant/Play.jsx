import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getSocket, emitAsync } from '../../lib/socket.js';
import { loadParticipantSession, saveParticipantSession, clearParticipantSession } from '../../lib/participantSession.js';
import Timer from '../../components/Timer.jsx';
import OptionButton from '../../components/OptionButton.jsx';
import LeaderboardList from '../../components/LeaderboardList.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import AnswerStatusCard from '../../components/AnswerStatusCard.jsx';
import { useLanguage } from '../../lib/i18n.jsx';

export default function Play() {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, tServer } = useLanguage();
  const savedSession = loadParticipantSession(pin);
  // location.state carries the name from the Join form; a saved session (localStorage)
  // covers a reload/reconnect where that in-memory state is gone.
  const name = location.state?.name || savedSession?.name;

  const [phase, setPhase] = useState('joining'); // joining | lobby | question | answered | result | final | closed | error
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [lobbyCount, setLobbyCount] = useState(0);
  const [myId, setMyId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answeredCount, setAnsweredCount] = useState({ count: 0, total: 0 });
  const [personalResult, setPersonalResult] = useState(null);
  const [roundResults, setRoundResults] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  useEffect(() => {
    if (!name) {
      navigate('/join');
      return;
    }
    const socket = getSocket();

    async function attemptJoin() {
      const known = loadParticipantSession(pin);
      const res = await emitAsync('participant:join', { pin, name, participantId: known?.id });
      if (!res?.ok) {
        if (known) clearParticipantSession(pin);
        setError(tServer(res?.error) || t('playJoinErrorFallback'));
        setPhase('error');
        return;
      }
      setMyId(res.participant.id);
      setQuizTitle(res.quizTitle);
      saveParticipantSession(pin, res.participant);

      const resume = res.resume || { status: 'lobby' };
      if (resume.status === 'question') {
        setQuestion(resume.question);
        setSelected(resume.alreadyAnswered ? resume.selectedIndex : null);
        setAnsweredCount({ count: 0, total: 0 });
        setPhase(resume.alreadyAnswered ? 'answered' : 'question');
      } else if (resume.status === 'results') {
        setQuestion(resume.question);
        setRoundResults(resume.results);
        setPersonalResult(resume.personalResult);
        setPhase('result');
      } else if (resume.status === 'final') {
        setFinalLeaderboard(resume.leaderboard);
        setPhase('final');
      } else {
        setPhase('lobby');
      }
    }

    if (socket.connected) attemptJoin();
    socket.on('connect', attemptJoin);

    socket.on('lobby:update', ({ count }) => setLobbyCount(count));
    socket.on('question:show', (q) => {
      setQuestion(q);
      setSelected(null);
      setPersonalResult(null);
      setRoundResults(null);
      setAnsweredCount({ count: 0, total: 0 });
      setPhase('question');
    });
    socket.on('question:answeredCount', (payload) => setAnsweredCount(payload));
    socket.on('participant:result', (payload) => setPersonalResult(payload));
    socket.on('question:results', (payload) => {
      setRoundResults(payload);
      setPhase('result');
    });
    socket.on('quiz:final', ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setPhase('final');
    });
    socket.on('room:closed', () => {
      clearParticipantSession(pin);
      setPhase('closed');
    });

    return () => {
      socket.off('connect', attemptJoin);
      socket.off('lobby:update');
      socket.off('question:show');
      socket.off('question:answeredCount');
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
      setError(tServer(res?.error) || t('playJoinErrorFallback'));
    }
  }

  if (phase === 'joining') return <div className="screen">{t('playJoining')}</div>;

  if (phase === 'error')
    return (
      <div className="screen">
        <LanguageToggle />
        <div className="card">
          <p className="error-text">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/join')}>
            {t('playRetry')}
          </button>
        </div>
      </div>
    );

  if (phase === 'closed')
    return (
      <div className="screen">
        <LanguageToggle />
        <div className="card">
          <h2>{t('playSessionEnded')}</h2>
          <p className="muted">{t('playThanks')}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            {t('playHome')}
          </button>
        </div>
      </div>
    );

  return (
    <div className="screen">
      <LanguageToggle />
      <div className="card">
        {phase === 'lobby' && (
          <>
            <span className="badge">{quizTitle}</span>
            <h2 style={{ marginTop: 16 }}>{t('playJoinedGreeting', { name })}</h2>
            <p className="muted waiting-row">
              {t('playWaitingGuru')}
              <span className="waiting-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </p>
            <p className="muted">{t('playPlayersInRoom', { n: lobbyCount })}</p>
          </>
        )}

        {(phase === 'question' || phase === 'answered') && question && (
          <>
            <div className="q-progress-track">
              <div className="q-progress-fill" style={{ width: `${((question.index + 1) / question.total) * 100}%` }} />
            </div>
            <p className="q-progress-label">{t('stageQuestionProgress', { i: question.index + 1, total: question.total })}</p>
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
                  selected={selected === i}
                />
              ))}
            </div>
            <AnswerStatusCard locked={phase === 'answered'} />
            {phase === 'answered' && (
              <>
                <div className="answered-progress">
                  <div className="answered-progress-track">
                    <div
                      className="answered-progress-fill"
                      style={{ width: `${answeredCount.total ? (answeredCount.count / answeredCount.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="q-progress-label">{t('stageAnsweredCount', answeredCount)}</p>
                </div>
              </>
            )}
          </>
        )}

        {phase === 'result' && roundResults && (
          <>
            {personalResult ? (
              <>
                <div className="result-icon" aria-hidden="true">{personalResult.correct ? '✅' : '❌'}</div>
                <h2 className={personalResult.correct ? 'feedback-correct' : 'feedback-wrong'}>
                  {personalResult.correct ? t('playCorrect') : t('playIncorrect')}
                </h2>
                <p className="muted">
                  {personalResult.correct ? t('playPointsEarned', { n: personalResult.points }) : t('playNoPoints')}
                </p>
                <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t('playTotalScore', { n: personalResult.score })}</p>
              </>
            ) : (
              <p className="muted">{t('playNoAnswerRecorded')}</p>
            )}
            {question && (
              <p className="muted" style={{ marginTop: 8 }}>
                {t('playCorrectAnswerInline')} <strong>{question.options[roundResults.correctIndex]}</strong>
              </p>
            )}
            <h3 style={{ marginTop: 20 }}>{t('stageLeaderboard')}</h3>
            <LeaderboardList entries={roundResults.leaderboard} myId={myId} />
            <p className="muted waiting-row" style={{ marginTop: 16 }}>
              {t('playWaitingGuruNext')}
              <span className="waiting-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </p>
          </>
        )}

        {phase === 'final' && finalLeaderboard && (
          <>
            <h2>{t('playFinalResults')}</h2>
            {(() => {
              const mine = finalLeaderboard.find((p) => p.id === myId);
              return mine ? (
                <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  {t('playFinishedRank', { rank: mine.rank, score: mine.score })}
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
