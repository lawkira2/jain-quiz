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
    if (!confirm('इस क्विज़ को हटाएं? इसे पूर्ववत नहीं किया जा सकता।')) return;
    await api.deleteQuiz(id);
    refresh();
  }

  async function handleStart(quiz) {
    setError('');
    if (quiz.questionCount === 0) {
      setError(`"${quiz.title}" में अभी कोई प्रश्न नहीं है। पहले इसे संपादित करें।`);
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
            गुरु डैशबोर्ड
          </h1>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={handleLogout}>
            लॉग आउट
          </button>
        </div>
        <p className="brand-subtitle">क्विज़ बनाएं, फिर अपने छात्रों के लिए लाइव सत्र शुरू करें।</p>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => navigate('/host/quiz/new')}>
          + नया क्विज़
        </button>

        {quizzes.length === 0 && <p className="muted">अभी तक कोई क्विज़ नहीं है। शुरू करने के लिए एक बनाएं।</p>}

        {quizzes.map((quiz) => (
          <div className="quiz-list-row" key={quiz.id}>
            <div>
              <strong>{quiz.title}</strong>
              <div className="muted">{quiz.questionCount} प्रश्न</div>
            </div>
            <div className="btn-row" style={{ width: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px' }}
                onClick={() => navigate(`/host/quiz/${quiz.id}`)}
              >
                संपादित करें
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px', borderColor: 'var(--critical)', color: 'var(--critical)' }}
                onClick={() => handleDelete(quiz.id)}
              >
                हटाएं
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '8px 14px' }}
                disabled={starting === quiz.id}
                onClick={() => handleStart(quiz)}
              >
                {starting === quiz.id ? 'शुरू हो रहा है…' : 'सत्र शुरू करें'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
