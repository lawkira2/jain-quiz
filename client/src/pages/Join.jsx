import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../lib/i18n.jsx';

export default function Join() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const pinFromLink = (searchParams.get('pin') || '').toUpperCase();
  const [pin, setPin] = useState(pinFromLink);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    const cleanName = name.trim();
    if (cleanPin.length < 4) return setError(t('joinErrorPin'));
    if (!cleanName) return setError(t('joinErrorName'));
    setError('');
    navigate(`/play/${cleanPin}`, { state: { name: cleanName } });
  }

  return (
    <div className="screen">
      <LanguageToggle />
      <div className="card">
        <h1 className="brand-title">{t('joinTitle')}</h1>
        <p className="brand-subtitle">{t('joinSubtitle')}</p>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="field">
            <label htmlFor="pin">{t('joinPinLabel')}</label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t('joinPinPlaceholder')}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
            />
          </div>
          <div className="field">
            <label htmlFor="name">{t('joinNameLabel')}</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('joinNamePlaceholder')}
              autoComplete="off"
              maxLength={24}
              autoFocus={!!pinFromLink}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary">
            {t('joinSubmit')}
          </button>
        </form>
      </div>
    </div>
  );
}
