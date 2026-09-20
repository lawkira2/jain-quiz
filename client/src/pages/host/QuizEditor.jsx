import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getHostPasscode } from '../../lib/api.js';

const TARGET_QUESTIONS = 25;

function emptyQuestion() {
  return { text: '', options: ['', '', '', ''], correctIndex: 0 };
}

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(() =>
    isNew ? Array.from({ length: TARGET_QUESTIONS }, emptyQuestion) : [],
  );
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!getHostPasscode()) {
      navigate('/host');
      return;
    }
    if (!isNew) {
      api
        .getQuiz(id)
        .then(({ quiz }) => {
          setTitle(quiz.title);
          setQuestions(
            quiz.questions.length ? quiz.questions : Array.from({ length: TARGET_QUESTIONS }, emptyQuestion),
          );
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  function updateQuestion(index, patch) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex, optIndex, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === optIndex ? value : o)) } : q)),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  const filledCount = questions.filter((q) => q.text.trim() && q.options.every((o) => o.trim())).length;

  async function handleSave() {
    setError('');
    setNotice('');
    if (!title.trim()) return setError('क्विज़ को एक शीर्षक दें।');
    const complete = questions.filter((q) => q.text.trim() && q.options.every((o) => o.trim()));
    if (complete.length === 0) return setError('कम से कम एक पूरी तरह भरा हुआ प्रश्न जोड़ें (पाठ + 4 विकल्प)।');

    setSaving(true);
    try {
      if (isNew) {
        const { quiz } = await api.createQuiz({ title, questions: complete });
        navigate(`/host/quiz/${quiz.id}`);
      } else {
        await api.updateQuiz(id, { title, questions: complete });
        setNotice('सहेजा गया।');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="screen">लोड हो रहा है…</div>;

  return (
    <div className="screen" style={{ maxWidth: 760 }}>
      <div className="card">
        <div className="top-bar">
          <h1 className="brand-title" style={{ margin: 0 }}>
            {isNew ? 'नया क्विज़' : 'क्विज़ संपादित करें'}
          </h1>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => navigate('/host/dashboard')}>
            वापस
          </button>
        </div>

        <div className="field">
          <label htmlFor="title">क्विज़ शीर्षक</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="उदाहरण: जैन तीर्थंकर क्विज़" />
        </div>

        <p className="muted" style={{ textAlign: 'left', marginBottom: 16 }}>
          {filledCount} / {questions.length} प्रश्न पूरी तरह भरे गए हैं ({TARGET_QUESTIONS} पूरे राउंड के लिए अनुशंसित हैं)।
          केवल पूरी तरह भरे गए प्रश्न (पाठ + 4 विकल्प) सहेजे जाते हैं।
        </p>

        {error && <p className="error-text">{error}</p>}
        {notice && <p style={{ color: 'var(--good)', marginTop: -6, marginBottom: 12 }}>{notice}</p>}

        {questions.map((q, qi) => (
          <div className="question-editor-row" key={qi}>
            <div className="top-bar">
              <strong>प्रश्न {qi + 1}</strong>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '4px 10px', borderColor: 'var(--critical)', color: 'var(--critical)' }}
                onClick={() => removeQuestion(qi)}
              >
                हटाएं
              </button>
            </div>
            <div className="field">
              <textarea
                rows={2}
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                placeholder="प्रश्न का पाठ"
              />
            </div>
            {q.options.map((opt, oi) => (
              <div className="option-editor" key={oi}>
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={q.correctIndex === oi}
                  onChange={() => updateQuestion(qi, { correctIndex: oi })}
                  title="सही उत्तर के रूप में चिह्नित करें"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`विकल्प ${oi + 1}`}
                />
              </div>
            ))}
            <span className="muted">सही विकल्प के आगे रेडियो चुनें।</span>
          </div>
        ))}

        <button className="btn btn-secondary" style={{ marginBottom: 20 }} onClick={addQuestion}>
          + प्रश्न जोड़ें
        </button>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'सहेजा जा रहा है…' : 'क्विज़ सहेजें'}
        </button>
      </div>
    </div>
  );
}
