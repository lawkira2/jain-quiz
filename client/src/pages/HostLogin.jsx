import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setHostPasscode, getHostPasscode } from '../lib/api.js';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../lib/i18n.jsx';

export default function HostLogin() {
  const navigate = useNavigate();
  const { t, tServer } = useLanguage();
  const [passcode, setPasscode] = useState(getHostPasscode());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.hostLogin(passcode.trim());
      setHostPasscode(passcode.trim());
      navigate('/host/dashboard');
    } catch (err) {
      setError(tServer(err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <LanguageToggle />
      <div className="card">
        <h1 className="brand-title">{t('hostLoginTitle')}</h1>
        <p className="brand-subtitle">{t('hostLoginSubtitle')}</p>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="field">
            <label htmlFor="passcode">{t('hostLoginPasscodeLabel')}</label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t('hostLoginChecking') : t('hostLoginContinue')}
          </button>
        </form>
      </div>
    </div>
  );
}
