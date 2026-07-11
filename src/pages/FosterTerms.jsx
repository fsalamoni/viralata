/**
 * @fileoverview Termo de Lar Temporário (LT) — Fase 19.
 *
 * Termo individual para lares temporários (Fase 7). O LT recebe
 * animal sob guarda temporária SEM transferência de propriedade —
 * continua sendo o abrigo o responsável legal.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Home as HomeIcon,
  ScrollText,
  HeartHandshake,
  Stethoscope,
  AlertTriangle,
  ShieldCheck,
  RefreshCcw,
  FileSignature,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function FosterTerms() {
  return (
    <LegalPage
      eyebrow="Termo específico · lar temporário (LT)"
      title="Termo de Lar Temporário (LT)"
      description="Condições para atuação como lar temporário: guarda temporária do animal sob responsabilidade do abrigo, sem transferência de propriedade, com objetivos de socialização, recuperação ou reintegração."
      meta="Versão 2.0 · 10 de julho de 2026. Aplicável a todos os novos termos e renovações a partir desta data."
    >
      <LegalSection
        icon={ScrollText}
        title="1. Partes e natureza do vínculo"
        description="Lar temporário é guarda, não propriedade."
      >
        <p>
          Este Termo é celebrado entre o <strong>Abrigo</strong> (ONG parceira da Viralata) e o{' '}
          <strong>Lar Temporário (LT)</strong> (pessoa física maior e capaz, com residência
          adequada), com a interveniência da plataforma Viralata, e tem por objeto formalizar a
          guarda temporária do animal descrito neste Termo, pelo prazo e condições aqui ajustados.
        </p>
        <p>
          O presente Termo <strong>não transfere propriedade</strong> do animal ao LT. A propriedade
          permanece com o abrigo, e o LT atua como <strong>guardião temporário</strong>, com os
          deveres de proteção, cuidado, conservação e restituição (Art. 1.196 e Art. 1.198 CC).
        </p>
        <p>
          O vínculo <strong>não</strong> é de adoção: ao final do prazo ou mediante comunicação do
          abrigo, o animal deve ser restituído ou destinado à adoção responsável, conforme decisão
          do abrigo.
        </p>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="2. Obrigações do Lar Temporário"
        description="Tudo o que o LT se compromete a fazer."
      >
        <LegalList>
          <LegalListItem>Prover moradia adequada, alimentação balanceada, água fresca, higiene e enriquecimento ambiental.</LegalListItem>
          <LegalListItem>Seguir rigorosamente o protocolo veterinário indicado pelo RT do abrigo (vacinas, vermifugação, medicação, dieta, retorno para consulta).</LegalListItem>
          <LegalListItem>Não ministrar medicamentos ou realizar procedimentos veterinários sem autorização expressa do RT do abrigo.</LegalListItem>
          <LegalListItem>Não alterar permanentemente o animal (esterilização não-emergencial, tatuagens, amputações estéticas, etc.) sem autorização expressa.</LegalListItem>
          <LegalListItem>Manter o animal em ambiente seguro, com telas, portões, ausência de plantas tóxicas, restrição de acesso a produtos químicos.</LegalListItem>
          <LegalListItem>Não permitir que terceiros (familiares, amigos, vizinhos) tenham acesso direto ao animal sem sua supervisão.</LegalListItem>
          <LegalListItem>Não repassar, vender, alugar, doar ou dar em pagamento o animal, sob pena de rescisão imediata e responsabilização civil e criminal.</LegalListItem>
          <LegalListItem>Comunicar imediatamente ao abrigo qualquer alteração de saúde, comportamento, fuga, óbito ou incidente.</LegalListItem>
          <LegalListItem>Permitir visitas do abrigo ao LT e à residência para acompanhamento do animal (mediante agendamento prévio).</LegalListItem>
          <LegalListItem>Restituir o animal ao abrigo ao final do prazo ou quando solicitado, em plenas condições de saúde e higiene.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={HeartHandshake}
        title="3. Compromissos do abrigo"
        description="O que o LT pode esperar do abrigo."
      >
        <LegalList>
          <LegalListItem>Entregar o animal com prontuário veterinário atualizado, microchipado (quando aplicável) e em condições de saúde documentadas.</LegalListItem>
          <LegalListItem>Fornecer ração, medicamentos, suplementos e materiais necessários ao cuidado do animal durante o período do LT, conforme política interna.</LegalListItem>
          <LegalListItem>Arcar com despesas veterinárias decorrentes de doenças pré-existentes ou surgidas no período, mediante orçamento prévio e aprovação do abrigo.</LegalListItem>
          <LegalListItem>Oferecer suporte técnico e emocional ao LT, com canal direto ao RT e à coordenação de LT.</LegalListItem>
          <LegalListItem>Respeitar o período de descanso entre LTs, evitando sobrecarga ao guardião temporário.</LegalListItem>
          <LegalListItem>Emitir certificado de horas de LT, se solicitado, para fins curriculares e de comprovação de trabalho voluntário (Lei 9.608/1998).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Stethoscope}
        title="4. Responsabilidade veterinária e emergências"
        description="Como agir em emergências."
      >
        <p>
          Em caso de emergência veterinária fora do horário comercial ou em situações de risco
          iminente à vida do animal, o LT deve:
        </p>
        <LegalList>
          <LegalListItem>Comunicar imediatamente o abrigo pelo canal de emergência (telefone 24h, WhatsApp do RT, e-mail).</LegalListItem>
          <LegalListItem>Encaminhar o animal à clínica veterinária parceira indicada pelo abrigo, sempre que possível.</LegalListItem>
          <LegalListItem>Em caso de impossibilidade de contato com o abrigo, realizar o atendimento emergencial e comunicar em até 12h, apresentando notas fiscais para reembolso, conforme política.</LegalListItem>
          <LegalListItem>Não realizar eutanásia, salvo em estado terminal comprovado por laudo veterinário de dois profissionais.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={RefreshCcw}
        title="5. Prazo, devolução e transição"
        description="O que acontece no fim do período."
      >
        <p>
          O prazo do LT é definido no momento da assinatura, podendo ser prorrogado mediante acordo
          entre as partes. Em caso de incompatibilidade comprovada (doença, mudança, alergia, etc.),
          o LT deve comunicar ao abrigo imediatamente para devolução antecipada, sem penalidade.
        </p>
        <p>
          Ao final do prazo, o animal é restituído ao abrigo, que pode:
        </p>
        <LegalList>
          <LegalListItem>Devolver à adoção direta pelo LT (workflow simplificado, mediante aprovação do abrigo).</LegalListItem>
          <LegalListItem>Incluir no catálogo geral de adoção responsável.</LegalListItem>
          <LegalListItem>Encaminhar a outro LT ou ao abrigo de origem.</LegalListItem>
          <LegalListItem>Em caso de vínculo afetivo, formalizar adoção definitiva (workflow completo de adoção).</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="6. Cláusula de assunção de risco (Art. 936 CC)"
      >
        <p>
          O LT declara estar ciente de que:
        </p>
        <LegalList>
          <LegalListItem>O animal pode causar danos materiais ou físicos a terceiros (mordidas, arranhões, alergias), hipótese em que o LT responde civilmente (Art. 936 CC), salvo dolo ou culpa do abrigo.</LegalListItem>
          <LegalListItem>O animal pode apresentar alterações de comportamento durante o período de adaptação, especialmente após traumas prévios.</LegalListItem>
          <LegalListItem>Podem surgir doenças pré-existentes ou latentes não diagnosticadas no momento da entrega.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={FileSignature}
        title="7. Assinatura eletrônica e LGPD"
      >
        <p>
          Este Termo é assinado por <strong>assinatura eletrônica avançada</strong> (Lei 14.063/2020),
          com hash SHA-256 do documento, timestamp, IP, user agent, liveness check opcional e
          texto da assinatura. O registro é imutável.
        </p>
        <p>
          O tratamento dos dados pessoais do LT (nome, CPF, RG, endereço, telefone, dados
          socioeconômicos) tem como base legal a <strong>execução do contrato</strong> de LT (Art. 7º
          V LGPD) e o <strong>legítimo interesse</strong> (Art. 7º IX), sendo regido pela{' '}
          <a href="/politica-privacidade">Política de Privacidade</a> da Viralata.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="8. Foro e disposições finais"
      >
        <p>
          Este Termo é regido pela legislação brasileira. Fica eleito o foro da Comarca de São
          Paulo/SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais
          privilegiado que seja. As cláusulas deste Termo são independentes — a nulidade de uma
          não afeta a validade das demais.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
