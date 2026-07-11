/**
 * @fileoverview Política de Privacidade — Versão expandida (Fase 19).
 *
 * Conformidade:
 *  - LGPD (Lei 13.709/2018) — Art. 7º, 9º, 18, 33, 37, 48
 *  - Marco Civil (Lei 12.965/2014) — Art. 7º, 10, 15
 *  - GDPR (referência para usuários da UE)
 *  - CFMV 1.465/2022 (telemedicina veterinária)
 *
 * Inclui:
 *  - Identificação do Controlador e do Encarregado (DPO)
 *  - Base legal específica para cada tratamento
 *  - Direitos do titular (Art. 18) com canal de exercício
 *  - Política de retenção (6m logs de acesso — Marco Civil Art. 15)
 *  - Transferências internacionais
 *  - Protocolo de breach notification (Art. 48)
 *  - Cookies (LGPD Art. 9º — link para /politica-cookies)
 *  - Encarregado/DPO: canal permanente
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  FileText,
  Database,
  ShieldCheck,
  UserCheck,
  Eye,
  RefreshCw,
  ServerCog,
  AlertTriangle,
  GavelIcon as Gavel,
  Mail,
  Globe,
  Cookie,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
  LegalStat,
} from '@/components/legal-page';

const VERSION = '2026-07-10';
const DPO_EMAIL = 'dpo@viralata.app';
const DPO_PORTAL = 'https://viralata.app/dpo';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Política de Privacidade"
      description="Como a Viralata coleta, usa, compartilha e protege os dados pessoais de adotantes, doadores, abrigos, voluntários e lares temporários, em conformidade com a LGPD (Lei 13.709/2018)."
      meta={`Versão 2.0 — 10 de julho de 2026. Esta política aplica-se a todos os produtos, sites, APIs e serviços da Viralata.`}
    >
      <LegalSection
        icon={FileText}
        title="1. Quem somos (Controlador)"
        description="Identificação da pessoa jurídica responsável."
      >
        <p>
          <strong>Viralata Tecnologia e Bem-Estar Animal Ltda.</strong> (“Viralata”, “nós”), inscrita no
          CNPJ sob nº XX.XXX.XXX/0001-XX, com sede na Cidade de São Paulo/SP, é a <strong>controladora</strong>{' '}
          dos dados pessoais tratados por meio desta plataforma, nos termos do Art. 5º, VI da LGPD.
        </p>
        <p>
          Para qualquer assunto relativo a esta Política ou ao exercício dos seus direitos como titular,
          entre em contato com nosso <strong>Encarregado pelo Tratamento de Dados (DPO)</strong>:
        </p>
        <LegalList>
          <LegalListItem>E-mail: <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a></LegalListItem>
          <LegalListItem>Portal do titular: <a href={DPO_PORTAL} target="_blank" rel="noopener noreferrer">{DPO_PORTAL}</a></LegalListItem>
          <LegalListItem>Canal LGPD: “Solicitações LGPD” no rodapé da plataforma (até 15 dias, Art. 18 §5º).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="2. Dados que coletamos"
        description="Categorias de dados pessoais e finalidades específicas."
      >
        <p>Coletamos apenas o necessário para viabilizar o match, a adoção responsável e a operação da plataforma:</p>
        <LegalList>
          <LegalListItem><strong>Cadastro</strong>: nome, e-mail (login Google), foto, telefone, cidade/UF, CPF (opcional para perfil completo).</LegalListItem>
          <LegalListItem><strong>Perfil de adotante</strong>: tipo de moradia, rotina, presença de crianças/idosos, outros animais, renda mensal — usado pelo algoritmo de compatibilidade (Art. 7º II LGPD).</LegalListItem>
          <LegalListItem><strong>Pets</strong>: fotos, vídeos, dados de saúde, comportamento, microchip, pedigree, Asilomar, etc.</LegalListItem>
          <LegalListItem><strong>Chat</strong>: mensagens trocadas entre adotante e responsável pelo pet, incluindo anexos.</LegalListItem>
          <LegalListItem><strong>Avaliações</strong>: mútuas, registradas após cada adoção concluída.</LegalListItem>
          <LegalListItem><strong>Denúncias</strong>: registros de maus-tratos, abandono ou outras violações.</LegalListItem>
          <LegalListItem><strong>Prontuário veterinário</strong>: consultas, cirurgias, exames, vacinas, vermifugos, medicações — operados pelo Responsável Técnico do abrigo (CFMV 1.465/2022).</LegalListItem>
          <LegalListItem><strong>Logs de acesso</strong>: IP, user agent, data/hora, tela acessada — retidos por 6 meses (Marco Civil Art. 15).</LegalListItem>
          <LegalListItem><strong>Logs de auditoria</strong>: ações administrativas (data, autor, descrição) — retidos por 5 anos (CC Art. 205, prova legal).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Gavel}
        title="3. Bases legais para o tratamento (LGPD Art. 7º)"
        description="Cada tratamento tem uma hipótese legal explícita."
      >
        <LegalList>
          <LegalListItem><strong>Consentimento (Art. 7º I)</strong>: cookies não-essenciais, marketing, comunicações opcionais, liveness check.</LegalListItem>
          <LegalListItem><strong>Execução de contrato (Art. 7º V)</strong>: cadastro, perfil de adotante, workflow de adoção, prontuário veterinário, pagamento de planos.</LegalListItem>
          <LegalListItem><strong>Legítimo interesse (Art. 7º IX)</strong>: prevenção a fraudes, segurança da plataforma, combate a maus-tratos, melhoria de produto.</LegalListItem>
          <LegalListItem><strong>Cumprimento de obrigação legal (Art. 7º II)</strong>: retenção de logs (Marco Civil Art. 15), breach notification à ANPD (LGPD Art. 48), resposta a ordens judiciais.</LegalListItem>
          <LegalListItem><strong>Exercício regular de direitos (Art. 7º VI)</strong>: defesa em processos administrativos ou judiciais.</LegalListItem>
          <LegalListItem><strong>Proteção da vida (Art. 7º VII)</strong>: casos urgentes de maus-tratos, emergências veterinárias em parceria com abrigos.</LegalListItem>
          <LegalListItem><strong>Interesse público / segurança (Art. 7º III, IV)</strong>: cooperação com autoridades em investigações.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={UserCheck}
        title="4. Visibilidade e compartilhamento"
        description="Quem vê o quê, e quando."
      >
        <p>
          <strong>Visibilidade padrão</strong> (público para todos os usuários autenticados): nome de
          exibição, foto de perfil, pets cadastrados, avaliações, histórico de participações em eventos.
        </p>
        <p>
          <strong>Visibilidade condicional</strong> (visível só para a outra parte de uma conversa ou
          aplicação): telefone, e-mail, endereço, perfil de adotante completo, prontuário de saúde.
        </p>
        <p>
          <strong>Visibilidade restrita</strong> (apenas o próprio titular + administradores da plataforma):
          CPF, dados sensíveis de saúde, logs de auditoria, histórico de aceites legais.
        </p>
        <p>
          <strong>Compartilhamento com terceiros</strong>: a Viralata <strong>não vende</strong> dados pessoais.
          Eventuais compartilhamentos ocorrem com:
        </p>
        <LegalList>
          <LegalListItem>Abrigos parceiros, dentro do escopo da adoção ou do LT (Art. 7º V).</LegalListItem>
          <LegalListItem>Provedores de infraestrutura (Firebase/Google Cloud, southamerica-east1) sob DPA com cláusulas-padrão.</LegalListItem>
          <LegalListItem>Autoridades públicas mediante ordem judicial ou em caso de suspeita de crime (Lei 9.605/98).</LegalListItem>
          <LegalListItem>Em caso de fusão, aquisição ou reestruturação societária, com aviso prévio ao titular.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Database}
        title="5. Armazenamento, retenção e transferência internacional"
        description="Onde os dados ficam e por quanto tempo."
      >
        <p>
          Os dados são armazenados primariamente em servidores no Brasil (Google Cloud Platform, região{' '}
          <code>southamerica-east1</code>). Eventuais cópias de segurança podem ser mantidas em regiões
          geograficamente próximas, sempre sob cláusulas-padrão contratuais aprovadas.
        </p>
        <p>Prazos de retenção (Art. 16 LGPD):</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LegalStat label="Logs de acesso" value="6 meses" />
          <LegalStat label="Logs de auditoria" value="5 anos" />
          <LegalStat label="Dados de conta ativa" value="enquanto durar a relação" />
          <LegalStat label="Após exclusão de conta" value="soft delete 30d + purge" />
        </div>
        <p>
          Após a exclusão da conta, dados pessoais são anonimizados ou eliminados em até 30 dias, exceto
          quando a manutenção é necessária para cumprimento de obrigação legal (Art. 16 LGPD) ou exercício
          regular de direitos (Art. 7º VI).
        </p>
      </LegalSection>

      <LegalSection
        icon={Eye}
        title="6. Seus direitos (LGPD Art. 18)"
        description="Todos os direitos abaixo são gratuitos e podem ser exercidos a qualquer tempo."
      >
        <LegalList>
          <LegalListItem><strong>Confirmação e acesso</strong> (Art. 18 I, II): saber se tratamos seus dados e obter uma cópia.</LegalListItem>
          <LegalListItem><strong>Correção</strong> (Art. 18 III): atualizar dados incompletos, inexatos ou desatualizados.</LegalListItem>
          <LegalListItem><strong>Anonimização, bloqueio ou eliminação</strong> (Art. 18 IV): solicitar de dados desnecessários, excessivos ou tratados em desconformidade.</LegalListItem>
          <LegalListItem><strong>Portabilidade</strong> (Art. 18 V): exportar seus dados em formato estruturado (JSON/CSV) — botão “Baixar meus dados” no Perfil.</LegalListItem>
          <LegalListItem><strong>Eliminação</strong> (Art. 18 VI): apagar dados tratados com base em consentimento — soft delete 30d + purge.</LegalListItem>
          <LegalListItem><strong>Revogação do consentimento</strong> (Art. 18 IX): retirar consentimentos opcionais a qualquer momento, sem afetar tratamentos anteriores.</LegalListItem>
          <LegalListItem><strong>Oposição</strong> (Art. 18 §2º): opor-se a tratamento baseado em legítimo interesse, mediante análise caso a caso.</LegalListItem>
          <LegalListItem><strong>Revisão de decisões automatizadas</strong> (Art. 20): solicitar revisão de decisões que afetem seus interesses.</LegalListItem>
        </LegalList>
        <p>
          Para exercer seus direitos, acesse <a href={DPO_PORTAL}>{DPO_PORTAL}</a> ou envie e-mail para{' '}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>. Responderemos em até <strong>15 dias</strong> (Art. 18 §5º).
        </p>
      </LegalSection>

      <LegalSection
        icon={Cookie}
        title="7. Cookies e tecnologias de rastreamento"
        description="Veja a política completa de cookies."
      >
        <p>
          A Viralata utiliza cookies e tecnologias similares para garantir o funcionamento da plataforma,
          autenticar usuários, lembrar preferências e medir o desempenho agregado. A política detalhada
          está em <a href="/politica-cookies">/politica-cookies</a>, em conformidade com a LGPD Art. 9º.
        </p>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="8. Segurança da informação"
        description="Medidas técnicas e organizacionais."
      >
        <LegalList>
          <LegalListItem>Criptografia em trânsito (TLS 1.3) e em repouso (AES-256 nativo do Firestore).</LegalListItem>
          <LegalListItem>Controle de acesso baseado em papéis (RBAC) com princípio do menor privilégio.</LegalListItem>
          <LegalListItem>Logs de auditoria imutáveis para todas as ações administrativas.</LegalListItem>
          <LegalListItem>Testes de penetração semestrais e varreduras automatizadas de dependências.</LegalListItem>
          <LegalListItem>Plano de resposta a incidentes (IRP) com simulados anuais (Fase 20).</LegalListItem>
          <LegalListItem>Treinamento contínuo da equipe em segurança e LGPD.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ServerCog}
        title="9. Breach notification (LGPD Art. 48)"
        description="Como agimos em caso de incidente de segurança."
      >
        <p>
          Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a
          Viralata:
        </p>
        <LegalList>
          <LegalListItem>Notificará a <strong>ANPD</strong> em até <strong>2 dias úteis</strong> (Art. 48 §1º).</LegalListItem>
          <LegalListItem>Notificará os <strong>titulares afetados</strong> por e-mail e banner na plataforma, com informações sobre o ocorrido, riscos e medidas adotadas (Art. 48 §2º).</LegalListItem>
          <LegalListItem>Documentará o incidente em registro interno, mantido por no mínimo 5 anos.</LegalListItem>
          <LegalListItem>Cooperará integralmente com autoridades e titulares para mitigação dos danos.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Globe}
        title="10. Transferência internacional"
        description="Bases legais para dados que saem do Brasil."
      >
        <p>
          Operamos preferencialmente no Brasil. Quando houver transferência internacional (ex.: backup em
          outra região), ela ocorre mediante uma das hipóteses do Art. 33 LGPD:
        </p>
        <LegalList>
          <LegalListItem>Cláusulas-padrão contratuais aprovadas pela ANPD.</LegalListItem>
          <LegalListItem>Países com nível adequado de proteção reconhecido pela ANPD.</LegalListItem>
          <LegalListItem>Cooperação jurídica internacional.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Mail}
        title="11. Encarregado (DPO)"
        description="Canal permanente de comunicação."
      >
        <p>
          O Encarregado pelo Tratamento de Dados Pessoais (DPO) é o canal único e permanente entre a
          Viralata, os titulares e a ANPD:
        </p>
        <LegalList>
          <LegalListItem>Nome: a definir em portaria interna (publicada no portal do titular).</LegalListItem>
          <LegalListItem>E-mail: <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a></LegalListItem>
          <LegalListItem>Portal: <a href={DPO_PORTAL}>{DPO_PORTAL}</a></LegalListItem>
          <LegalListItem>Prazo de resposta: até 15 dias corridos (Art. 18 §5º LGPD).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={RefreshCw}
        title="12. Alterações desta Política"
        description="Histórico de versões e aviso prévio."
      >
        <p>
          Esta Política pode ser atualizada para refletir mudanças de funcionalidade, requisitos legais ou
          regulatórios. Alterações relevantes serão comunicadas com antecedência mínima de 30 dias por
          e-mail e banner na plataforma. A versão atual é sempre a publicada nesta página.
        </p>
        <p>
          <strong>Versão atual</strong>: {VERSION} · 10 de julho de 2026. Versões anteriores estão
          disponíveis mediante solicitação ao DPO.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
