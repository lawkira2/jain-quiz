import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getHostPasscode, clearHostPasscode } from '../../lib/api.js';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import { useLanguage } from '../../lib/i18n.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, tServer } = useLanguage();
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    if (!getHostPasscode()) {
      navigate('/host');
      return;
    }
    refresh();
  }, []);

  async function refresh() {
    try {
      const { quizzes } = await api.listQuizzes();
      setQuizzes(quizzes);
    } catch (err) {
      setError(tServer(err.message));
      if (/passcode/i.test(err.message)) navigate('/host');
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('dashboardConfirmDelete'))) return;
    await api.deleteQuiz(id);
    refresh();
  }

  async function handleStart(quiz) {
    setError('');
    if (quiz.questionCount === 0) {
      setError(t('dashboardNoQuestionsError', { title: quiz.title }));
      return;
    }
    setStarting(quiz.id);
    try {
      const { pin } = await api.createRoom(quiz.id);
      navigate(`/host/session/${pin}`);
    } catch (err) {
      setError(tServer(err.message));
    } finally {
      setStarting(null);
    }
  }

  function handleLogout() {
    clearHostPasscode();
    navigate('/host');
  }

  return (
    <div className="screen" style={{ maxWidth: 640 }}>
      <LanguageToggle />
      <div className="card">
        <div className="top-bar">
          <h1 className="brand-title" style={{ margin: 0 }}>
            {t('dashboardTitle')}
          </h1>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={handleLogout}>
            {t('dashboardLogout')}
          </button>
        </div>
        <p className="brand-subtitle">{t('dashboardSubtitle')}</p>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => navigate('/host/quiz/new')}>
          {t('dashboardNewQuiz')}
        </button>

        {quizzes.length === 0 && <p className="muted">{t('dashboardEmpty')}</p>}

        {quizzes.map((quiz) => (
          <div className="quiz-list-row" key={quiz.id}>
            <div>
              <strong>{quiz.title}</strong>
              <div className="muted">{t('dashboardQuestionCount', { n: quiz.questionCount })}</div>
            </div>
            <div className="btn-row" style={{ width: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px' }}
                onClick={() => navigate(`/host/quiz/${quiz.id}`)}
              >
                {t('dashboardEdit')}
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px', borderColor: 'var(--color-critical)', color: 'var(--color-critical)' }}
                onClick={() => handleDelete(quiz.id)}
              >
                {t('dashboardDelete')}
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '8px 14px' }}
                disabled={starting === quiz.id}
                onClick={() => handleStart(quiz)}
              >
                {starting === quiz.id ? t('dashboardStarting') : t('dashboardStartSession')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
