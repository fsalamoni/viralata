import { FileText, Database, ShieldCheck, UserCheck, Eye, RefreshCw } from 'lucide-react';
import { LegalList, LegalListItem, LegalPage, LegalSection } from '@/components/legal-page';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Política de Privacidade"
      description="Como o Viralata coleta, usa e protege os dados de adotantes, doadores e organizações na plataforma de adoção responsável de pets."
      meta={`Versão 1.0 — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}. Ao usar a plataforma, você declara ciência e aceitação destas condições.`}
    >
      <LegalSection icon={FileText} title="Natureza da plataforma" description="Marketplace de adoção responsável de pets — não há venda de animais.">
        <p>
          O <strong>Viralata</strong> é uma plataforma que conecta pessoas físicas e ONGs/lojas parceiras que têm
          animais para doação com adotantes interessados. Um questionário de perfilamento comportamental (moradia,
          rotina, família, orçamento) é obrigatório antes do acesso ao catálogo, para reduzir devoluções e frustrações.
        </p>
        <p>
          A plataforma não vende animais, não intermedia pagamentos entre as partes e não garante a veracidade das
          informações fornecidas por quem cadastra um pet. Recomendamos que o adotante faça suas próprias verificações
          antes de concluir uma adoção.
        </p>
      </LegalSection>

      <LegalSection icon={ShieldCheck} title="Conduta e responsabilidade" description="Cada usuário responde pelos próprios atos.">
        <p>
          O uso deve respeitar a legislação de proteção animal e a boa-fé entre as partes. Cadastros falsos, maus-tratos,
          discriminação ou assédio no chat podem levar à suspensão da conta. Denúncias de maus-tratos podem ser
          registradas a qualquer momento pelo botão de denúncia — a plataforma gera um relatório para você mesmo
          encaminhar às autoridades competentes, sem assumir a investigação.
        </p>
      </LegalSection>

      <LegalSection icon={Database} title="Dados coletados" description="Coletamos o necessário para viabilizar o match e a adoção responsável.">
        <LegalList>
          <LegalListItem>Nome e e-mail (via login Google), foto de perfil, telefone e localização (cidade/estado).</LegalListItem>
          <LegalListItem>Perfil de adotante: tipo de moradia, rotina de passeios, presença de crianças/idosos, outros animais e orçamento — usado pelo algoritmo de compatibilidade.</LegalListItem>
          <LegalListItem>Pets cadastrados (fotos, saúde, comportamento) e interesses de adoção demonstrados.</LegalListItem>
          <LegalListItem>Mensagens trocadas no chat entre adotante e responsável pelo pet, incluindo anexos.</LegalListItem>
          <LegalListItem>Avaliações mútuas registradas após uma adoção concluída.</LegalListItem>
          <LegalListItem>Denúncias de maus-tratos, quando registradas por você.</LegalListItem>
          <LegalListItem>Logs de auditoria de ações administrativas (data, autor, descrição) — mantidos mesmo após a exclusão de uma conta, por exigência legal.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection icon={UserCheck} title="Visibilidade dos dados">
        <p>
          Nome de exibição e foto aparecem publicamente nos anúncios de pets, avaliações e diretório de organizações.
          Telefone e e-mail só ficam visíveis para a outra parte de uma conversa em andamento, e apenas se você optar
          por publicá-los. Administradores de organizações (ONGs/lojas) veem os dados de quem demonstrou interesse nos
          pets sob sua responsabilidade.
        </p>
      </LegalSection>

      <LegalSection icon={Eye} title="Seus direitos (LGPD)">
        <p>
          Você pode baixar uma cópia dos seus dados ou excluir sua conta a qualquer momento na página{' '}
          <strong>Meu Perfil</strong>. Ao excluir a conta, seu perfil é anonimizado e o acesso é removido; pets, posts
          e mensagens já publicados permanecem visíveis para não quebrar o histórico de terceiros, e os logs de
          auditoria são preservados conforme exigido em lei.
        </p>
      </LegalSection>

      <LegalSection icon={RefreshCw} title="Alterações">
        <p>
          Esta política pode ser atualizada para refletir mudanças de funcionalidade ou requisitos legais. A versão
          vigente é sempre a publicada nesta página.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
