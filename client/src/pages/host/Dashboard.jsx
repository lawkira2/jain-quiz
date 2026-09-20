import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getHostPasscode, clearHostPasscode } from '../../lib/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
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
      setError(err.message);
      if (/passcode/i.test(err.message)) navigate('/host');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    await api.deleteQuiz(id);
    refresh();
  }

  async function handleStart(quiz) {
    setError('');
    if (quiz.questionCount === 0) {
      setError(`"${quiz.title}" has no questions yet. Edit it first.`);
      return;
    }
    setStarting(quiz.id);
    try {
      const { pin } = await api.createRoom(quiz.id);
      navigate(`/host/session/${pin}`);
    } catch (err) {
      setError(err.message);
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
      <div className="card">
        <div className="top-bar">
          <h1 className="brand-title" style={{ margin: 0 }}>
            Guru Dashboard
          </h1>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={handleLogout}>
            Log out
          </button>
        </div>
        <p className="brand-subtitle">Create quizzes, then start a live session for your Chhatras.</p>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => navigate('/host/quiz/new')}>
          + New Quiz
        </button>

        {quizzes.length === 0 && <p className="muted">No quizzes yet. Create one to get started.</p>}

        {quizzes.map((quiz) => (
          <div className="quiz-list-row" key={quiz.id}>
            <div>
              <strong>{quiz.title}</strong>
              <div className="muted">{quiz.questionCount} question{quiz.questionCount === 1 ? '' : 's'}</div>
            </div>
            <div className="btn-row" style={{ width: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px' }}
                onClick={() => navigate(`/host/quiz/${quiz.id}`)}
              >
                Edit
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px', borderColor: 'var(--critical)', color: 'var(--critical)' }}
                onClick={() => handleDelete(quiz.id)}
              >
                Delete
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '8px 14px' }}
                disabled={starting === quiz.id}
                onClick={() => handleStart(quiz)}
              >
                {starting === quiz.id ? 'Starting…' : 'Start Session'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
