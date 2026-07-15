/**
 * @fileoverview TASK-291: Core de sendEmail (adoption workflow).
 *
 * Lógica pura de envio de email — sem firebase-functions.
 * Separada do wrapper onCall para permitir testes unitários diretos.
 *
 * Templates: application_received, interview_scheduled, match_approved,
 * contract_ready, milestone_due, milestone_overdue, post_adoption_returned.
 *
 * @see functions/sendEmailOnCall.js
 */

/**
 * @typedef {Object} EmailTemplate
 * @property {string} subject
 * @property {string} html
 * @property {string} text
 * @property {'shelter'|'adopter'|'any'} recipientRole
 */

const TEMPLATES = {
  application_received: {
    subject: '🐾 Nova solicitação de adoção — {{petName}}',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#2d6a4f;margin-top:0">Nova solicitação de adoção</h2><p>Olá, <strong>{{shelterName}}</strong>!</p><p>Uma nova solicitação de adoção foi recebida para o pet <strong>{{petName}}</strong>.</p><div style="background:#f0fdf4;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>🐾 Pet:</strong> {{petName}} ({{petId}})</p><p style="margin:4px 0"><strong>👤 Solicitante:</strong> {{applicantName}}</p><p style="margin:4px 0"><strong>📋 Solicitação:</strong> <a href="https://viralata.app/admin/adoption/{{applicationId}}">Ver detalhes</a></p></div><p>Acesse o painel administrativo para analisar a solicitação.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: '[Viralata] Nova solicitação de adoção\n\nOlá {{shelterName}},\n\nUma nova solicitação foi recebida para {{petName}} ({{petId}}).\nSolicitante: {{applicantName}}\nVer detalhes: https://viralata.app/admin/adoption/{{applicationId}}',
    recipientRole: 'shelter',
  },
  interview_scheduled: {
    subject: '📅 Entrevista agendada — {{petName}}',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#1d4ed8;margin-top:0">Entrevista agendada!</h2><p>Olá, <strong>{{adopterName}}</strong>!</p><p>Sua entrevista para adoção de <strong>{{petName}}</strong> foi agendada:</p><div style="background:#eff6ff;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>📅 Data:</strong> {{interviewDate}}</p><p style="margin:4px 0"><strong>⏰ Horário:</strong> {{interviewTime}}</p><p style="margin:4px 0"><strong>🏠 Abrigo:</strong> {{shelterName}}</p></div><p>Prepare-se para a entrevista e traga os documentos solicitados.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: `[Viralata] Entrevista agendada\n\nOlá {{adopterName}},\n\nSua entrevista para {{petName}}:\nData: {{interviewDate}}\nHorário: {{interviewTime}}\nAbrigo: {{shelterName}}\n\nPrepare os documentos solicitados para a entrevista.`,
    recipientRole: 'adopter',
  },
  match_approved: {
    subject: '🎉 Parabéns! Sua adoção foi aprovada — {{petName}}',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#2d6a4f;margin-top:0">🎉 Parabéns, {{adopterName}}!</h2><p>Sua adoção de <strong>{{petName}}</strong> foi <strong style="color:#2d6a4f">APROVADA</strong>!</p><div style="background:#f0fdf4;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>🐾 Pet:</strong> {{petName}}</p><p style="margin:4px 0"><strong>🏠 Abrigo:</strong> {{shelterName}}</p><p style="margin:4px 0"><strong>📋 Solicitação:</strong> #{{applicationId}}</p></div><p>O próximo passo é assinar o Termo de Adoção Responsável. Você receberá um e-mail com o link para assinatura.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: `[Viralata] Parabéns! Sua adoção foi aprovada!\n\nOlá {{adopterName}},\n\nSua adoção de {{petName}} foi APROVADA!\nAbrigo: {{shelterName}}\nSolicitação: #{{applicationId}}\n\nO próximo passo é assinar o Termo de Adoção. Aguarde o e-mail com o link para assinatura.`,
    recipientRole: 'adopter',
  },
  contract_ready: {
    subject: '📝 Termo de Adoção pronto para assinatura — {{petName}}',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#7c3aed;margin-top:0">Termo de Adoção disponível</h2><p>Olá, <strong>{{adopterName}}</strong>!</p><p>O <strong>Termo de Adoção Responsável</strong> para <strong>{{petName}}</strong> está pronto para assinatura.</p><div style="background:#faf5ff;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>🐾 Pet:</strong> {{petName}}</p><p style="margin:4px 0"><strong>🏠 Abrigo:</strong> {{shelterName}}</p></div><p>📎 <a href="{{contractUrl}}">Clique aqui para assinar o Termo de Adoção</a></p><p style="color:#666;font-size:13px">A assinatura eletrônica é protegida pela Lei 14.063/2020.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: `[Viralata] Termo de Adoção disponível para assinatura\n\nOlá {{adopterName}},\n\nO Termo de Adoção Responsável para {{petName}} está pronto.\nAbrigo: {{shelterName}}\n\nClique para assinar: {{contractUrl}}\n\nA assinatura eletrônica é protegida pela Lei 14.063/2020.`,
    recipientRole: 'adopter',
  },
  milestone_due: {
    subject: '📅 Lembrete: marco de adoção pendente — {{petName}}',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#d97706;margin-top:0">Lembrete de marco de adoção</h2><p>Olá, <strong>{{adopterName}}</strong>!</p><p>Você tem um marco de adoção pendente para <strong>{{petName}}</strong>:</p><div style="background:#fffbeb;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>🐾 Pet:</strong> {{petName}}</p><p style="margin:4px 0"><strong>📋 Marco:</strong> {{milestoneLabel}}</p><p style="margin:4px 0"><strong>📅 Data prevista:</strong> {{milestoneDueDate}}</p></div><p>Acesse <a href="https://viralata.app/perfil#adocoes">seu perfil</a> para reportar o cumprimento do marco.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: `[Viralata] Lembrete: marco de adoção pendente\n\nOlá {{adopterName}},\n\nVocê tem um marco de adoção pendente para {{petName}}:\nMarco: {{milestoneLabel}}\nData: {{milestoneDueDate}}\n\nAcesse seu perfil para reportar: https://viralata.app/perfil#adocoes`,
    recipientRole: 'adopter',
  },
  milestone_overdue: {
    subject: '⚠️ Marco de adoção em atraso — {{petName}}',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#dc2626;margin-top:0">⚠️ Marco de adoção em atraso</h2><p>Olá, <strong>{{adopterName}}</strong>!</p><p>O seguinte marco de adoção para <strong>{{petName}}</strong> está em atraso há <strong style="color:#dc2626">{{daysOverdue}} dias</strong>:</p><div style="background:#fef2f2;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>🐾 Pet:</strong> {{petName}}</p><p style="margin:4px 0"><strong>📋 Marco:</strong> {{milestoneLabel}}</p><p style="margin:4px 0"><strong>📅 Data prevista:</strong> {{milestoneDueDate}}</p><p style="margin:4px 0;color:#dc2626"><strong>⚠️ Atrasado há:</strong> {{daysOverdue}} dias</p></div><p>Por favor, entre em contato com o abrigo {{shelterName}} ou <a href="https://viralata.app/perfil#adocoes">acesse seu perfil</a> para regularizar.</p><p style="color:#666;font-size:13px">O não cumprimento dos marcos pode afetar a guarda do animal.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: `[Viralata] ATENÇÃO: Marco de adoção em atraso\n\nOlá {{adopterName}},\n\nO marco "{{milestoneLabel}}" para {{petName}} está em atraso há {{daysOverdue}} dias.\nData prevista: {{milestoneDueDate}}\nAbrigo: {{shelterName}}\n\nEntre em contato com o abrigo ou acesse https://viralata.app/perfil#adocoes para regularizar.`,
    recipientRole: 'adopter',
  },
  post_adoption_returned: {
    subject: '⚠️ Animal devolvido — {{petName}} ({{daysOverdue}} dias após adoção)',
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9"><div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e0e0e0"><h2 style="color:#dc2626;margin-top:0">⚠️ Pet devolvido ao abrigo</h2><p>Olá, equipe do <strong>{{shelterName}}</strong>!</p><p>O pet <strong>{{petName}}</strong> foi devolvido ao abrigo.</p><div style="background:#fef2f2;border-radius:6px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>🐾 Pet:</strong> {{petName}} ({{petId}})</p><p style="margin:4px 0"><strong>👤 Ex-adotante:</strong> {{adopterName}}</p><p style="margin:4px 0"><strong>📅 Data da devolução:</strong> {{returnDate}}</p><p style="margin:4px 0"><strong>📋 Motivo:</strong> {{returnReason}}</p></div><p>Atualize o status do pet no sistema e registre o retorno na timeline.</p><hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0"><p style="color:#888;font-size:12px">Viralata — Sistema de Gestão do Abrigo</p></div></body></html>`,
    text: `[Viralata] Pet devolvido ao abrigo\n\nOlá equipe {{shelterName}},\n\nO pet {{petName}} ({{petId}}) foi devolvido ao abrigo.\nEx-adotante: {{adopterName}}\nData da devolução: {{returnDate}}\nMotivo: {{returnReason}}\n\nAtualize o status do pet no sistema e registre o retorno.`,
    recipientRole: 'shelter',
  },
};

function renderTemplate(templateStr, ctx) {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return ctx[key] !== undefined ? String(ctx[key]) : match;
  });
}

function validateTemplateType(templateType) {
  if (!templateType || !TEMPLATES[templateType]) {
    return {
      ok: false,
      error: `templateType inválido. Valores aceitos: ${Object.keys(TEMPLATES).join(', ')}.`,
    };
  }
  return { ok: true, template: TEMPLATES[templateType] };
}

function buildContext({
  applicationId,
  shelterClubId,
  petId,
  adopterUid,
  interviewDate,
  interviewTime,
  milestoneLabel,
  milestoneDueDate,
  daysOverdue,
  contractUrl,
  returnDate,
  returnReason,
  appDoc,
  petDoc,
  adopterName,
  shelterName,
}) {
  return {
    applicationId: applicationId || '',
    petId: petId || '',
    adopterUid: adopterUid || '',
    interviewDate: interviewDate || '',
    interviewTime: interviewTime || '',
    milestoneLabel: milestoneLabel || '',
    milestoneDueDate: milestoneDueDate || '',
    daysOverdue: String(daysOverdue || 0),
    contractUrl: contractUrl || 'https://viralata.app/perfil#adocoes',
    returnDate: returnDate || '',
    returnReason: returnReason || '',
    shelterName: shelterName || '',
    petName: petDoc?.name || petDoc?.title || petId || '',
    adopterName: adopterName || adopterUid || '',
    applicantName: appDoc?.applicant_form?.full_name || adopterName || '',
  };
}

function renderEmail(templateType, ctx) {
  const validation = validateTemplateType(templateType);
  if (!validation.ok) return validation;

  const { subject, html, text } = validation.template;
  return {
    ok: true,
    subject: renderTemplate(subject, ctx),
    html: renderTemplate(html, ctx),
    text: renderTemplate(text, ctx),
  };
}

module.exports = {
  TEMPLATES,
  validateTemplateType,
  buildContext,
  renderTemplate,
  renderEmail,
};
