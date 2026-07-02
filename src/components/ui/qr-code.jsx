import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renderiza um QR Code a partir de um texto/URL (data URL gerado no client). */
export function QrCode({ value, size = 160, className = '' }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) { setDataUrl(null); return; }
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [value, size]);

  if (!value || !dataUrl) return null;
  return <img src={dataUrl} alt="QR Code" width={size} height={size} className={className} />;
}
