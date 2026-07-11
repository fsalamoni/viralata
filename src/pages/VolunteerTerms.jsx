/**
 * @fileoverview Termo de Voluntariado (Fase 19).
 *
 * Termo individual para voluntários cadastrados na plataforma
 * (Fase 12 — gestão de voluntários). Aplicável tanto a voluntários
 * regulares quanto a eventuais (escala em vitrines e eventos).
 *
 * Base legal: Lei 9.608/1998 (Lei do Voluntariado).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  HeartHandshake,
  ScrollText,
  ShieldCheck,
  CalendarCheck,
  AlertTriangle,
  FileSignature,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

export default function VolunteerTerms() {
  return (
    <LegalPage
      eyebrow="Termo específico · voluntários"
      title="Termo de Adesão de Voluntário"
      description="Termo de adesão individual para voluntários da plataforma Viralata e dos abrigos parceiros, com base na Lei 9.608/1998 (Lei do Voluntariado) e nos princípios da LGPD."
      meta="Versão 2.0 · 10 de julho de 2026. Aplicável a todas as novas adesões e renovações."
    >
      <LegalSection
        icon={ScrollText}
        title="1. Partes e objeto"
        description="Quem é quem, e o que está sendo formalizado."
      >
        <p>
          Este Termo é celebrado entre o <strong>Abrigo</strong> (ONG parceira da Viralata) e o{' '}
          <strong>Voluntário</strong> (pessoa física maior e capaz), com a interveniência da
          plataforma Viralata, e tem por objeto formalizar a atividade voluntária, sem vínculo
          empregatício, conforme Lei 9.608/1998.
        </p>
        <p>
          O presente Termo <strong>não gera</strong> relação de emprego, subordinação,
          prestação de serviço remunerado ou qualquer outro vínculo que justifique percepção de
          salário, FGTS, INSS, 13º, férias ou qualquer outro direito trabalhista (Art. 3º Lei
          9.608/1998).
        </p>
      </LegalSection>

      <LegalSection
        icon={HeartHandshake}
        title="2. Atividades e responsabilidades do voluntário"
        description="O que se espera do voluntário."
      >
        <LegalList>
          <LegalListItem>Executar as atividades descritas no momento da adesão (manejo, banho, passeio, transporte, eventos, divulgação, administrativo) com zelo, responsabilidade e respeito aos animais.</LegalListItem>
          <LegalListItem>Cumprir os horários, escalas e turnos combinados, com aviso prévio de 24h em caso de ausência.</LegalListItem>
          <LegalListItem>Seguir as normas internas do abrigo, protocolos sanitários e orientações do Responsável Técnico (RT).</LegalListItem>
          <LegalListItem>Não ministrar medicamentos, aplicar vacinas, realizar procedimentos veterinários ou qualquer ato privativo de profissional habilitado.</LegalListItem>
          <LegalListItem>Zelar pelo patrimônio, equipamentos e suprimentos do abrigo, comunicando danos ou faltas ao responsável.</LegalListItem>
          <LegalListItem>Manter sigilo sobre dados pessoais de adotantes, doadores, funcionários e outros voluntários (LGPD).</LegalListItem>
          <LegalListItem>Tratar todos os animais com respeito, sem maus-tratos, abandono ou negligência (Lei 9.605/98 Art. 32 e Lei 14.064/2020).</LegalListItem>
          <LegalListItem>Reportar imediatamente qualquer situação de risco à saúde do animal, dos colegas ou à segurança do abrigo.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="3. Direitos do voluntário"
        description="O que o voluntário tem direito a receber."
      >
        <LegalList>
          <LegalListItem><strong>Certificado de horas</strong> (Lei 9.608/98 Art. 1º §2º), emitido pelo abrigo ao final do vínculo ou ao final de cada ano, com carga horária e atividades realizadas.</LegalListItem>
          <LegalListItem><strong>Capacitação</strong>: orientações iniciais sobre manejo, comportamento animal, primeiros socorros, zoonoses, LGPD e uso da plataforma.</LegalListItem>
          <LegalListItem><strong>Seguro de acidentes pessoais</strong>: o abrigo parceiro pode oferecer cobertura de acidentes pessoais durante o período de atividade, conforme Art. 2º-B Lei 9.608/98 (incluído pela Lei 13.297/2016).</LegalListItem>
          <LegalListItem><strong>Material de trabalho</strong>: equipamentos de proteção individual (luvas, máscara, calçado fechado) e materiais necessários às atividades.</LegalListItem>
          <LegalListItem><strong>Saúde e segurança</strong>: ambiente de trabalho adequado, com acesso a água, sanitários e áreas de descanso.</LegalListItem>
          <LegalListItem><strong>Livre desligamento</strong>: a qualquer tempo, sem necessidade de justificativa, mediante comunicação ao responsável pelo abrigo.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={CalendarCheck}
        title="4. Frequência, escala e RSVPs"
        description="Como a participação é registrada."
      >
        <p>
          A participação do voluntário é registrada na plataforma por meio de:
        </p>
        <LegalList>
          <LegalListItem><strong>Disponibilidade semanal</strong>: dias e horários preferenciais cadastrados no perfil.</LegalListItem>
          <LegalListItem><strong>RSVP</strong>: convocações para eventos (vitrines, feiras, mutirões) com resposta Sim/Não/Talvez.</LegalListItem>
          <LegalListItem><strong>Check-in / check-out</strong>: registro de presença em turnos e eventos (QR code, geolocalização ou manual).</LegalListItem>
          <LegalListItem><strong>Avaliação de participação</strong>: 360º entre voluntários e coordenação, para fins de melhoria contínua.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="5. Suspensão e desligamento"
        description="Hipóteses em que o vínculo é interrompido."
      >
        <p>
          O abrigo pode suspender ou desligar o voluntário nas seguintes hipóteses:
        </p>
        <LegalList>
          <LegalListItem>Maus-tratos, abandono ou negligência com qualquer animal (Lei 9.605/98 Art. 32).</LegalListItem>
          <LegalListItem>Furto, dano doloso ao patrimônio ou desvio de recursos do abrigo.</LegalListItem>
          <LegalListItem>Violação de sigilo de dados pessoais (LGPD Art. 42 — responsabilização civil e administrativa).</LegalListItem>
          <LegalListItem>Conduta inadequada, assédio, discriminação ou uso de substâncias durante o turno.</LegalListItem>
          <LegalListItem>Descumprimento reiterado de escalas e regras internas, sem justificativa.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={FileSignature}
        title="6. Assinatura eletrônica e LGPD"
      >
        <p>
          Este Termo é assinado por <strong>assinatura eletrônica avançada</strong> (Lei 14.063/2020),
          com hash SHA-256 do documento, timestamp, IP, user agent, liveness check opcional e
          texto da assinatura. O registro é imutável.
        </p>
        <p>
          O tratamento dos dados pessoais do voluntário (nome, CPF, RG, telefone, endereço,
          disponibilidade, habilidades) tem como base legal a <strong>execução do contrato</strong>{' '}
          de voluntariado (Art. 7º V LGPD) e é regido pela <a href="/politica-privacidade">Política
          de Privacidade</a> da Viralata.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="7. Foro e disposições finais"
      >
        <p>
          Este Termo é regido pela legislação brasileira, especialmente pela Lei 9.608/1998 e pela
          LGPD. Fica eleito o foro da Comarca de São Paulo/SP para dirimir eventuais controvérsias,
          com renúncia a qualquer outro, por mais privilegiado que seja. As cláusulas deste Termo
          são independentes — a nulidade de uma não afeta a validade das demais.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
