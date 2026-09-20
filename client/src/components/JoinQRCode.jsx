import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

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
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 12,
        display: 'inline-flex',
        boxShadow: 'var(--shadow)',
      }}
    >
      <canvas ref={canvasRef} width={size} height={size} />
    </div>
  );
}
