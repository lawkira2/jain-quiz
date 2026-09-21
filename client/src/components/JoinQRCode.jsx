import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const LOTUS_PATH = 'M12 2C12 7.52 7.52 12 2 12c5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10-5.52 0-10-4.48-10-10z';

function LotusCorner({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={LOTUS_PATH} />
    </svg>
  );
}

export default function JoinQRCode({ url, size = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#241f1a', light: '#ffffff' },
    }).catch(() => {});
  }, [url, size]);

  return (
    <div className="relative inline-flex rounded-3xl border border-brand/25 bg-surface-card p-3.5 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.8),0_0_30px_2px_rgba(230,178,61,0.12)]">
      <LotusCorner className="absolute -top-2.5 -left-2.5 text-brand opacity-80" />
      <LotusCorner className="absolute -top-2.5 -right-2.5 text-brand opacity-80" />
      <LotusCorner className="absolute -bottom-2.5 -left-2.5 text-brand opacity-80" />
      <LotusCorner className="absolute -bottom-2.5 -right-2.5 text-brand opacity-80" />
      <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5 shadow-inner">
        <canvas ref={canvasRef} width={size} height={size} />
      </div>
    </div>
  );
}
