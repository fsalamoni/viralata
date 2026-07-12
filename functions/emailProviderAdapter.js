/**
 * @fileoverview emailProviderAdapter — abstração sobre provedores de email.
 *
 * Duas implementações:
 *   - StubProvider: loga no console (dev, default). Não envia email real.
 *   - SendGridProvider: SendGrid real (produção, set EMAIL_PROVIDER=sendgrid).
 *
 * Por que abstrair: evita hardcodar SendGrid em todo lugar; permite trocar
 * para Mailgun/AWS SES no futuro sem refactor espalhado.
 *
 * Por que stub default: dev não precisa de API keys; nenhum email enviado
 * por acidente durante testes locais.
 *
 * Bounce handling: o SendGrid Event Webhook (Cloud Function separada)
 * atualiza `email_delivery_log/{messageId}` com status de 'delivered' a
 * 'bounce'. Hard bounces desativam automaticamente a flag
 * `email_consent_promotional` do recipient.
 *
 * Compliance:
 *   - CAN-SPAM: header `List-Unsubscribe` adicionado automaticamente.
 *   - LGPD Art. 7º IV: emails 'transactional' (shifts, BG check) enviados
 *     sem opt-in; emails 'promotional' (milestone 100h) exigem
 *     `email_consent_promotional=true`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22 (Volunteer Critical Fixes)
 * @see TASK-229
 */

const crypto = require('crypto');

class StubProvider {
  async send({ to, subject, html, text, from = 'noreply@viralata.app', headers = {} }) {
    const messageId = 'stub-' + crypto.randomBytes(8).toString('hex');
    console.log(`[email STUB] Would send to ${to}: ${subject}`);
    const bodyPreview = text?.slice(0, 200) || html?.slice(0, 200) || '(no body)';
    console.log(`[email STUB] body: ${bodyPreview}`);
    return { ok: true, messageId, provider: 'stub' };
  }
}

class SendGridProvider {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY required for SendGridProvider');
    }
    this.sgMail = require('@sendgrid/mail');
    this.sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async send({ to, subject, html, text, from = 'noreply@viralata.app', headers = {} }) {
    const msg = {
      to,
      from,
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@viralata.app>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        ...headers,
      },
    };
    try {
      const [response] = await this.sgMail.send(msg);
      const messageId = response.headers?.['x-message-id'];
      console.log(`[email SendGrid] Sent to ${to}: ${subject} (${messageId})`);
      return { ok: true, messageId, provider: 'sendgrid' };
    } catch (err) {
      console.error('[email SendGrid] Failed:', err.message);
      return { ok: false, error: err.message, provider: 'sendgrid' };
    }
  }
}

let instance = null;

/**
 * Retorna o provider de email configurado.
 * Singleton: a primeira chamada instancia, chamadas subsequentes reusam.
 * A escolha é feita via env var `EMAIL_PROVIDER`:
 *   - 'sendgrid' → SendGridProvider (requer SENDGRID_API_KEY)
 *   - qualquer outro / ausente → StubProvider (default dev-safe)
 */
function getEmailProvider() {
  if (instance) return instance;
  if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    instance = new SendGridProvider();
  } else {
    instance = new StubProvider();
  }
  return instance;
}

function _resetEmailProviderForTests() {
  instance = null;
}

module.exports = {
  getEmailProvider,
  StubProvider,
  SendGridProvider,
  _resetEmailProviderForTests,
};
