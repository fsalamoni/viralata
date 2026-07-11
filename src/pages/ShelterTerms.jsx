/**
 * @fileoverview Termo de Adesão de Abrigos/ONGs + DPA (Fase 19).
 *
 * Termo de adesão COM DPA completo (Data Processing Agreement) para
 * ONGs parceiras, exigido na formalização do cadastro organizacional.
 *
 * Inclui:
 *  - Cláusulas de adesão, representação legal, regularidade
 *  - DPA conforme Art. 39 LGPD
 *  - Transferência internacional
 *  - Sub-operadores (Firebase/Google Cloud)
 *  - Medidas de segurança, breach notification
 *  - Auditoria e cooperação
 *  - Vigência, rescisão, transição
 *  - Foro
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Building2,
  ShieldCheck,
  Database,
  ServerCog,
  AlertTriangle,
  FileSignature,
  ScrollText,
  Globe,
  Users,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function ShelterTerms() {
  return (
    <LegalPage
      eyebrow="Termo específico · abrigos e ONGs"
      title="Termo de Adesão de Abrigo/ONG + DPA"
      description="Termo de adesão de abrigos e ONGs parceiras da Viralata, com cláusulas de regularidade institucional, operação do abrigo e Acordo de Processamento de Dados (DPA) conforme LGPD Art. 39."
      meta="Versão 2.0 · 10 de julho de 2026. Substitui versões anteriores. Aplicável a todos os novos cadastros e renovações a partir desta data."
    >
      <LegalSection
        icon={Building2}
        title="1. Partes e natureza do vínculo"
        description="A Viralata como plataforma, o abrigo/ONG como parceiro autônomo."
      >
        <p>
          Este Termo é celebrado entre a <strong>Viralata Tecnologia e Bem-Estar Animal Ltda.</strong>{' '}
          (“Viralata”) e a pessoa jurídica aderente (“Abrigo” ou “ONG”), qualificada no momento da
          adesão, e estabelece as condições para uso da plataforma como ferramenta de gestão,
          divulgação de animais para adoção responsável e atendimento à comunidade.
        </p>
        <p>
          O Abrigo atua como <strong>controlador autônomo</strong> dos dados pessoais que coleta de
          seus adotantes, doadores, voluntários, lares temporários e animais. A Viralata é a
          controladora dos dados da conta do Abrigo na plataforma e <strong>operadora</strong> dos
          dados que o Abrinho insere no sistema, na qualidade de “encarregada de tratamento de
          dados” (LGPD Art. 5º, VII).
        </p>
        <p>
          Este vínculo <strong>não</strong> é de emprego, subordinação, representação comercial,
          franquia ou joint venture. O Abrigo mantém autonomia operacional, financeira e jurídica
          sobre suas atividades internas.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="2. Representação, regularidade e declarações"
        description="O que o abrigo deve declarar e manter atualizado."
      >
        <p>O representante legal que assina este Termo declara, sob as penas da lei, que:</p>
        <LegalList>
          <LegalListItem>É maior de 18 anos, com capacidade civil plena e poderes específicos para vincular a pessoa jurídica.</LegalListItem>
          <LegalListItem>A pessoa jurídica está regularmente constituída, com CNPJ ativo, situação regular perante a Receita Federal, FGTS, INSS e, quando aplicável, perante a Secretaria da Fazenda Estadual.</LegalListItem>
          <LegalListItem>Possui inscrição no Cadastro Nacional de Entidades Ambientalistas (CNEA) ou em cadastros municipais/estaduais de organizações da sociedade civil, quando exigível.</LegalListItem>
          <LegalListItem>Possui Responsável Técnico Veterinário (RT) com CRMV ativo, com Anotação de Responsabilidade Técnica (ART) vigente junto ao abrigo.</LegalListItem>
          <LegalListItem>Cumpre a legislação ambiental, sanitária e de proteção animal (Lei 9.605/98, Lei 14.064/2020, legislação estadual e municipal aplicável).</LegalListItem>
          <LegalListItem>Manterá atualizadas as informações cadastrais (endereço, RT, contatos, quadro social) durante toda a vigência deste Termo.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Users}
        title="3. Obrigações do abrigo"
        description="Condutas esperadas na operação diária."
      >
        <LegalList>
          <LegalListItem>Cadastrar animais com informações verdadeiras, completas e atualizadas (saúde, comportamento, procedência, microchip, Asilomar).</LegalListItem>
          <LegalListItem>Manter prontuário veterinário completo, incluindo exames, vacinas, vermifugação, castração e medicações.</LegalListItem>
          <LegalListItem>Seguir o workflow de adoção da plataforma (aplicação, entrevista, home check quando aplicável, aprovação, formalização do termo, pós-adoção).</LegalListItem>
          <LegalListItem>Respeitar a curadoria de candidatos: não aprovar adoções por motivos discriminatórios, mesmo quando o perfil é compatível.</LegalListItem>
          <LegalListItem>Manter canal de comunicação ativo com adotantes durante o período mínimo de pós-adoção (3 anos).</LegalListItem>
          <LegalListItem>Manter sigilo sobre dados pessoais de adotantes, doadores, voluntários e LTs que acessar pela plataforma, utilizando-os exclusivamente para finalidades da operação do abrigo.</LegalListItem>
          <LegalListItem>Não repassar, vender ou alugar a base de usuários a terceiros, mesmo que agregada ou anonimizada.</LegalListItem>
          <LegalListItem>Notificar a Viralata em até 48h sobre qualquer incidente de segurança que envolva dados tratados na plataforma.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Database}
        title="4. DPA — Acordo de Processamento de Dados (LGPD Art. 39)"
        description="Cláusulas obrigatórias de tratamento de dados."
      >
        <LegalSection icon={ShieldCheck} title="4.1. Finalidade e instruções" className="bg-white/40">
          <p>
            A Viralata trata os dados pessoais inseridos pelo Abrigo <strong>exclusivamente</strong>{' '}
            para viabilizar as funcionalidades contratadas (cadastro de animais, perfil de adotante,
            workflow de adoção, prontuário, pós-adoção, indicadores). A Viralata observará as
            instruções do Abrigo e não destinará os dados a finalidade própria diversa da execução
            do contrato, salvo ordem legal ou judicial.
          </p>
        </LegalSection>

        <LegalSection icon={ShieldCheck} title="4.2. Confidencialidade" className="bg-white/40">
          <p>
            A Viralata manterá sigilo sobre os dados tratados, exigindo o mesmo compromisso de seus
            funcionários, prepostos, sub-operadores e prestadores de serviço, mediante cláusula
            contratual específica.
          </p>
        </LegalSection>

        <LegalSection icon={ShieldCheck} title="4.3. Bases legais" className="bg-white/40">
          <p>
            Os tratamentos de dados pessoais sob este DPA têm como base legal, conforme aplicável a
            cada fluxo: execução de contrato (Art. 7º V LGPD), cumprimento de obrigação legal (Art. 7º II),
            legítimo interesse (Art. 7º IX) e, quando aplicável, consentimento (Art. 7º I). O Abrigo
            declara possuir base legal adequada para coletar e inserir os dados na plataforma.
          </p>
        </LegalSection>

        <LegalSection icon={ShieldCheck} title="4.4. Direitos dos titulares" className="bg-white/40">
          <p>
            A Viralata disponibilizará ferramentas ao Abrigo para que ele próprio atenda os direitos
            dos titulares (Art. 18 LGPD) — acesso, correção, portabilidade, eliminação. Quando o
            titular procurar diretamente a Viralata com pedido relacionado aos dados do Abrigo, a
            Viralata direcionará ao Abrigo em até 5 dias úteis.
          </p>
        </LegalSection>

        <LegalSection icon={ShieldCheck} title="4.5. Medidas de segurança" className="bg-white/40">
          <LegalList>
            <LegalListItem>Criptografia em trânsito (TLS 1.3) e em repouso (AES-256 nativo do Firestore).</LegalListItem>
            <LegalListItem>Autenticação multifator (MFA) obrigatória para contas administrativas.</LegalListItem>
            <LegalListItem>Logs de auditoria imutáveis para todas as ações administrativas (retenção 5 anos).</LegalListItem>
            <LegalListItem>Testes de penetração semestrais e varredura automatizada de dependências (CI/CD).</LegalListItem>
            <LegalListItem>Plano de resposta a incidentes (IRP) com simulados anuais.</LegalListItem>
            <LegalListItem>Treinamento contínuo de equipe em segurança e LGPD.</LegalListItem>
          </LegalList>
        </LegalSection>

        <LegalSection icon={ShieldCheck} title="4.6. Retenção e eliminação" className="bg-white/40">
          <p>
            A Viralata reterá os dados enquanto a conta do Abrigo estiver ativa. Após o término do
            vínculo, os dados pessoais serão mantidos por 30 dias (período de transição) e, depois,
            anonimizados ou eliminados, exceto quando a manutenção for necessária para cumprimento
            de obrigação legal (Art. 16 LGPD) ou exercício regular de direitos (Art. 7º VI).
          </p>
        </LegalSection>
      </LegalSection>

      <LegalSection
        icon={ServerCog}
        title="5. Sub-operadores (LGPD Art. 39 §1º)"
        description="Quem a Viralata contrata para operar a plataforma."
      >
        <p>
          A Viralata contrata os seguintes sub-operadores, que tratam dados pessoais em nome do
          Abrigo:
        </p>
        <LegalList>
          <LegalListItem><strong>Google Cloud Platform (GCP) / Firebase</strong> — hospedagem, banco de dados (Firestore), autenticação, funções serverless. Região: <code>southamerica-east1</code> (São Paulo).</LegalListItem>
          <LegalListItem><strong>Google Forms</strong> — quando configurado pelo abrigo, formulário público de aplicação é processado em infraestrutura Google, sob DPA Google-Viralata.</LegalListItem>
          <LegalListItem><strong>SendGrid / provedores de e-mail transacional</strong> — envio de notificações e e-mails do sistema.</LegalListItem>
          <LegalListItem><strong>Sentry / Datadog</strong> — observabilidade e monitoramento de erros (dados agregados e pseudonimizados).</LegalListItem>
          <LegalListItem><strong>Provedor de pagamento</strong> (quando aplicável) — para doações e planos Pro, sob PCI-DSS.</LegalListItem>
        </LegalList>
        <p>
          Lista atualizada em <code>viralata.app/dpa/sub-operadores</code>. A Viralata notificará o
          Abrigo com antecedência mínima de 30 dias sobre inclusão de novos sub-operadores.
        </p>
      </LegalSection>

      <LegalSection
        icon={Globe}
        title="6. Transferência internacional"
        description="Quando dados saem do Brasil."
      >
        <p>
          Operamos preferencialmente no Brasil. Quando houver transferência internacional (ex.:
          backup em outra região), ela ocorre mediante cláusula-padrão contratual aprovada pela
          ANPD, país com nível adequado de proteção, ou cooperação jurídica internacional (Art. 33
          LGPD). O Abrigo será previamente notificado.
        </p>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="7. Breach notification (LGPD Art. 48)"
        description="Protocolo em caso de incidente de segurança."
      >
        <LegalList>
          <LegalListItem>Viralata notificará o Abrigo em até <strong>24h</strong> após a detecção de qualquer incidente que afete dados do Abrigo.</LegalListItem>
          <LegalListItem>Notificará a ANPD em até <strong>2 dias úteis</strong> quando o incidente acarretar risco ou dano relevante aos titulares (Art. 48 §1º).</LegalListItem>
          <LegalListItem>Notificará os titulares afetados com informações sobre o ocorrido, riscos e medidas (Art. 48 §2º).</LegalListItem>
          <LegalListItem>Documentará o incidente em registro interno, mantido por no mínimo 5 anos.</LegalListItem>
          <LegalListItem>Cooperará integralmente com o Abrigo em análise, mitigação e resposta ao incidente.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="8. Auditoria e cooperação"
        description="Como o abrigo pode verificar a conformidade."
      >
        <p>
          O Abrigo pode solicitar, mediante agendamento prévio de 30 dias e em periodicidade
          razoável (até 1 (uma) vez por ano), relatório de conformidade da Viralata com este DPA
          (certificações, política de segurança, lista de sub-operadores, incidentes reportados).
        </p>
        <p>
          Em caso de fiscalização pela ANPD, ambas as partes cooperarão mutuamente, com troca
          tempestiva de informações e documentos pertinentes.
        </p>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="9. RT, ART e telemedicina (CFMV 1.465/2022)"
        description="Disclaimers permanentes sobre ato médico veterinário."
      >
        <LegalList>
          <LegalListItem>O Abrigo designa Responsável Técnico (RT) com CRMV ativo e ART vigente. A Viralata oferece tela para registro, mas a regularidade perante o CRMV é responsabilidade do abrigo.</LegalListItem>
          <LegalListItem>A Viralata é software inerte — <strong>não exerce ato médico veterinário</strong>. Toda prescrição, diagnóstico e telemedicina é de responsabilidade do RT do abrigo.</LegalListItem>
          <LegalListItem>A Viralata não realiza teleconsulta inaugural, não permite renovações de receita remota por mais de 180 dias e bloqueia módulos de telemedicina em emergências.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={FileSignature}
        title="10. Assinatura eletrônica (Lei 14.063/2020)"
      >
        <p>
          Este Termo é assinado por <strong>assinatura eletrônica avançada</strong> (Lei 14.063/2020
          Art. 4º), com hash SHA-256 do documento, timestamp, IP, user agent, liveness check e
          texto da assinatura do representante legal. O registro é imutável.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="11. Vigência, rescisão e transição"
        description="Como o vínculo termina e o que acontece com os dados."
      >
        <p>
          Este Termo tem vigência indeterminada, entrando em vigor na data da assinatura
          eletrônica. Pode ser rescindido:
        </p>
        <LegalList>
          <LegalListItem>Por qualquer das partes, mediante aviso prévio de 30 dias, sem ônus.</LegalListItem>
          <LegalListItem>Por descumprimento, mediante notificação com 15 dias para sanação.</LegalListItem>
          <LegalListItem>Por justa causa, em caso de: violação de LGPD, prática de maus-tratos, fraude, falsidade ideológica ou uso indevido da plataforma.</LegalListItem>
        </LegalList>
        <p>
          Após a rescisão, o Abrigo terá 30 dias para exportar seus dados (período de transição).
          Decorrido esse prazo, os dados serão anonimizados ou eliminados, mantendo-se apenas os
          registros de aceite deste Termo e os logs de auditoria, conforme Arts. 16 e 37 LGPD.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="12. Foro e disposições finais"
      >
        <p>
          Este Termo é regido pela legislação brasileira. Fica eleito o foro da Comarca de São
          Paulo/SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais
          privilegiado que seja. As cláusulas deste Termo são independentes — a nulidade de uma
          não afeta a validade das demais. Este Termo substitui todas as versões anteriores do
          Termo de Adesão de Abrigos/ONGs e seu DPA.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
