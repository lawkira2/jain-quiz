import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getHostPasscode } from '../../lib/api.js';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import { useLanguage } from '../../lib/i18n.jsx';

const TARGET_QUESTIONS = 25;

function emptyQuestion() {
  return { text: '', options: ['', '', '', ''], correctIndex: 0 };
}

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, tServer } = useLanguage();
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
        .catch((err) => setError(tServer(err.message)))
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
    if (!title.trim()) return setError(t('editorTitleRequiredError'));
    const complete = questions.filter((q) => q.text.trim() && q.options.every((o) => o.trim()));
    if (complete.length === 0) return setError(t('editorMinQuestionError'));

    setSaving(true);
    try {
      if (isNew) {
        const { quiz } = await api.createQuiz({ title, questions: complete });
        navigate(`/host/quiz/${quiz.id}`);
      } else {
        await api.updateQuiz(id, { title, questions: complete });
        setNotice(t('editorSaved'));
      }
    } catch (err) {
      setError(tServer(err.message));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="screen">{t('loading')}</div>;

  return (
    <div className="screen" style={{ maxWidth: 760 }}>
      <LanguageToggle />
      <div className="card">
        <div className="top-bar">
          <h1 className="brand-title" style={{ margin: 0 }}>
            {isNew ? t('editorNewTitle') : t('editorEditTitle')}
          </h1>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => navigate('/host/dashboard')}>
            {t('editorBack')}
          </button>
        </div>

        <div className="field">
          <label htmlFor="title">{t('editorTitleLabel')}</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('editorTitlePlaceholder')} />
        </div>

        <p className="muted" style={{ textAlign: 'left', marginBottom: 16 }}>
          {t('editorFilledStatus', { filled: filledCount, total: questions.length, target: TARGET_QUESTIONS })}
        </p>

        {error && <p className="error-text">{error}</p>}
        {notice && <p style={{ color: 'var(--color-good)', marginTop: -6, marginBottom: 12 }}>{notice}</p>}

        {questions.map((q, qi) => (
          <div className="question-editor-row" key={qi}>
            <div className="top-bar">
              <strong>{t('editorQuestionLabel', { n: qi + 1 })}</strong>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '4px 10px', borderColor: 'var(--color-critical)', color: 'var(--color-critical)' }}
                onClick={() => removeQuestion(qi)}
              >
                {t('editorRemove')}
              </button>
            </div>
            <div className="field">
              <textarea
                rows={2}
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                placeholder={t('editorQuestionPlaceholder')}
              />
            </div>
            {q.options.map((opt, oi) => (
              <div className="option-editor" key={oi}>
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={q.correctIndex === oi}
                  onChange={() => updateQuestion(qi, { correctIndex: oi })}
                  title={t('editorCorrectRadioTitle')}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={t('editorOptionPlaceholder', { n: oi + 1 })}
                />
              </div>
            ))}
            <span className="muted">{t('editorCorrectHint')}</span>
          </div>
        ))}

        <button className="btn btn-secondary" style={{ marginBottom: 20 }} onClick={addQuestion}>
          {t('editorAddQuestion')}
        </button>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t('editorSaving') : t('editorSaveQuiz')}
        </button>
      </div>
    </div>
  );
}
