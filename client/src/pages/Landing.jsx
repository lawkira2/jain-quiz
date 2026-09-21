import { useNavigate } from 'react-router-dom';
import WheelMark from '../components/WheelMark.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../lib/i18n.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="screen">
      <LanguageToggle />
      <div className="card">
        <WheelMark size={56} />
        <h1 className="brand-title">{t('landingTitle')}</h1>
        <p className="brand-subtitle">{t('landingSubtitle')}</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => navigate('/host')}>
            {t('landingHostBtn')}
          </button>
          <button className="btn btn-chhatra" onClick={() => navigate('/join')}>
            {t('landingJoinBtn')}
          </button>
        </div>
      </div>
      <p className="mt-6 text-center font-display text-sm tracking-wider text-brand-strong/75">{t('landingMantra')}</p>
    </div>
  );
}
