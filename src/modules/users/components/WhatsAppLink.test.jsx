import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WhatsAppLink, normalizePhoneToWhatsApp, buildWhatsAppUrl } from './WhatsAppLink';

describe('WhatsAppLink (TASK-322)', () => {
  it('normalizePhoneToWhatsApp normaliza (11) 98765-4321', () => { expect(normalizePhoneToWhatsApp('(11) 98765-4321')).toBe('5511987654321'); });
  it('normalizePhoneToWhatsApp mantém 55 prefixo', () => { expect(normalizePhoneToWhatsApp('5511987654321')).toBe('5511987654321'); });
  it('normalizePhoneToWhatsApp retorna null para curto', () => { expect(normalizePhoneToWhatsApp('123')).toBeNull(); });
  it('buildWhatsAppUrl gera URL wa.me', () => { expect(buildWhatsAppUrl('11987654321')).toBe('https://wa.me/5511987654321'); });
  it('buildWhatsAppUrl adiciona mensagem', () => { expect(buildWhatsAppUrl('11987654321', 'Olá!')).toBe('https://wa.me/5511987654321?text=Ol%C3%A1!'); });
  it('buildWhatsAppUrl retorna null para inválido', () => { expect(buildWhatsAppUrl('123')).toBeNull(); });
  it('renderiza link wa.me', () => {
    const { container } = render(<WhatsAppLink phone="11987654321" displayName="João" />);
    const link = container.querySelector('a[href*="wa.me"]');
    expect(link).toBeTruthy();
  });
  it('renderiza "Telefone privado" quando phonePublic=false', () => {
    const { container } = render(<WhatsAppLink phone="11987654321" phonePublic={false} />);
    expect(container.innerHTML).toContain('Telefone privado');
  });
});
