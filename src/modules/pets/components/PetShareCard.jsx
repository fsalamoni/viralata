import React, { forwardRef } from 'react';
import { QrCode } from '@/components/ui/qr-code';

const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };
const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };

/**
 * Card no formato "story" (proporção 9:16) usado para gerar a imagem de
 * compartilhamento de um pet (Instagram/WhatsApp/TikTok). Renderizado fora
 * da tela em tamanho fixo — ver usePetShareImage.js — e capturado com
 * html-to-image, o mesmo padrão já usado em reports/CreateReport.jsx.
 */
const PetShareCard = forwardRef(({ pet, shareUrl }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(160deg, #a8431f 0%, #c1522a 45%, #e0a83a 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
      }}
    >
      <div style={{ padding: '64px 64px 0' }}>
        <span style={{ fontSize: 56, fontWeight: 800 }}>🐾 Viralata</span>
      </div>

      <div style={{ flex: 1, margin: '32px 64px', borderRadius: 40, overflow: 'hidden', background: '#00000020' }}>
        <img
          src={pet.photos?.[0]}
          alt=""
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div style={{ padding: '0 64px 64px' }}>
        <h1 style={{ fontSize: 72, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
          {pet.name || pet.title}
        </h1>
        <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          {[SPECIES_LABEL[pet.species], SIZE_LABEL[pet.size], [pet.city, pet.state].filter(Boolean).join('/')]
            .filter(Boolean)
            .map((label) => (
              <span
                key={label}
                style={{
                  background: '#ffffff33', borderRadius: 999, padding: '12px 28px',
                  fontSize: 34, fontWeight: 600,
                }}
              >
                {label}
              </span>
            ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 48 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 12, lineHeight: 0 }}>
            <QrCode value={shareUrl} size={168} />
          </div>
          <div>
            <p style={{ fontSize: 38, fontWeight: 700, margin: 0 }}>Quer adotar?</p>
            <p style={{ fontSize: 30, margin: '8px 0 0', opacity: 0.9 }}>Aponte a câmera ou acesse viralata.web.app</p>
          </div>
        </div>
      </div>
    </div>
  );
});
PetShareCard.displayName = 'PetShareCard';

export default PetShareCard;
