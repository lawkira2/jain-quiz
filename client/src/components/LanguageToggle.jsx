import { useLanguage } from '../lib/i18n.jsx';

export default function LanguageToggle({ inline = false }) {
  const { lang, toggle, t } = useLanguage();
  return (
    <button
      type="button"
      className={inline ? 'lang-toggle lang-toggle--inline' : 'lang-toggle'}
      onClick={toggle}
      aria-label={lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
    >
      {t('langToggleLabel')}
    </button>
  );
}
