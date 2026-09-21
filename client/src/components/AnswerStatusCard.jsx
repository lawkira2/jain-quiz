import { useLanguage } from '../lib/i18n.jsx';

export default function AnswerStatusCard({ locked }) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-surface-page p-3 shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
            locked ? 'bg-good/20 text-good' : 'bg-brand/20 text-brand'
          }`}
        >
          {locked ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold leading-none text-text-primary">
            {locked ? t('statusLocked') : t('statusTapToSubmit')}
          </span>
          <span className="mt-1 text-xs text-text-secondary">{locked ? t('playAnswerLocked') : t('statusSubtext')}</span>
        </div>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
        </span>
        <span className="text-xs font-semibold text-good">{t('statusLive')}</span>
      </div>
    </div>
  );
}
