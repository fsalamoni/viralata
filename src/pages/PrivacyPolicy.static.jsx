/**
 * @fileoverview PrivacyPolicy — fallback estático (conteúdo integral).
 *
 * V3 (TASK-V3-LEGAL-5): este arquivo é o FALLBACK do PrivacyPolicyV3.
 * Era um wrapper recursivo (importava o próprio arquivo) — corrigido
 * para ter o CONTEÚDO real aqui, como PrivacyPolicy.v3.jsx espera.
 *
 * Cobre as 10 seções canônicas da LGPD (Lei 13.709/2018):
 *  1. Quem somos (controlador)
 *  2. Dados que coletamos
 *  3. Por que coletamos (finalidade)
 *  4. Compartilhamento
 *  5. Transferência internacional
 *  6. Cookies e tecnologias similares
 *  7. Direitos do titular (Art. 18 LGPD)
 *  8. Retenção e eliminação
 *  9. Segurança da informação
 * 10. Encarregado de dados (DPO) e contato
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

const VERSION = '2026-07-10';
const VERSION_LABEL = 'Versão 2.0 · 10 de julho de 2026';

export default function PrivacyPolicy() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-[13px] text-foreground">
        <strong>Modo offline.</strong> Exibindo versão estática deste documento
        (vigente desde 10 de julho de 2026). A versão canônica é editada
        pela equipe jurídica via Firestore (LGPD Art. 50 — transparência).
      </div>

      <section>
        <h2 className="text-xl font-bold text-foreground">1. Quem somos (controlador)</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          A <strong>Viralata</strong> é uma plataforma filantrópica de adoção responsável
          de pets, operada pela associação civil Viralata — Adoção Responsável
          (CNPJ XX.XXX.XXX/0001-XX). Somos o <strong>controlador</strong> dos dados pessoais
          que coletamos conforme descrito nesta política, conforme definido pela Lei Geral de
          Proteção de Dados (LGPD — Lei 13.709/2018).
        </p>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Para pets cadastrados por abrigos parceiras, o controlador pode ser
          compartilhado entre a Viralata (plataforma) e o abrigo (operador dos dados
          específicos do animal), conforme contrato de adesão.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">2. Dados que coletamos</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Coletamos as seguintes categorias de dados pessoais:
        </p>
        <ul className="mt-2 ml-6 list-disc space-y-1.5 text-[14px] leading-[1.7] text-foreground">
          <li><strong>Cadastro:</strong> nome completo, e-mail, telefone, foto de perfil, cidade/estado.</li>
          <li><strong>Perfil de adotante:</strong> tipo de moradia, presença de quintal, rotina de passeios, presença de crianças/idosos/outros pets, nível de renda.</li>
          <li><strong>Cadastro de pets:</strong> nome, espécie, raça, idade, fotos, características de saúde e temperamento, localização.</li>
          <li><strong>Comunicação:</strong> conteúdo de mensagens no chat, posts no mural, comentários em fóruns.</li>
          <li><strong>Localização:</strong> cidade e estado declarados no cadastro (não coletamos GPS sem consentimento explícito).</li>
          <li><strong>Uso da plataforma:</strong> páginas visitadas, horários de acesso, dispositivo, navegador, IP.</li>
          <li><strong>Pagamentos (quando aplicável):</strong> processados por provedores terceirizados (Stripe/PagSeguro). Não armazenamos dados completos de cartão.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">3. Por que coletamos (finalidade)</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Os dados são utilizados exclusivamente para:
        </p>
        <ul className="mt-2 ml-6 list-disc space-y-1.5 text-[14px] leading-[1.7] text-foreground">
          <li>Operacionalizar adoções responsáveis (matching entre adotantes e pets).</li>
          <li>Conectar usuários com abrigos e abrigos com adotantes.</li>
          <li>Enviar notificações sobre o processo de adoção e atualizações de pets.</li>
          <li>Cumprir obrigações legais (Art. 50 LGPD, Marco Civil da Internet).</li>
          <li>Prevenir fraudes e garantir segurança da plataforma.</li>
          <li>Melhorias de produto (análises agregadas e anonimizadas).</li>
        </ul>
        <p className="mt-3 text-[14px] leading-[1.7] text-foreground">
          <strong>Não usamos seus dados para:</strong> marketing de terceiros,
          venda de dados, perfilamento para fins discriminatórios, ou qualquer
          uso que não esteja alinhado com a missão filantrópica da plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">4. Compartilhamento</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Seus dados podem ser compartilhados com:
        </p>
        <ul className="mt-2 ml-6 list-disc space-y-1.5 text-[14px] leading-[1.7] text-foreground">
          <li><strong>Abrigos parceiros:</strong> quando você demonstra interesse em um pet ou se candidata à adoção.</li>
          <li><strong>Outros usuários:</strong> informações de perfil público (nome, foto, cidade) que você optou por tornar visíveis.</li>
          <li><strong>Provedores de infraestrutura:</strong> Firebase/Google Cloud (hospedagem), SendGrid (e-mails), provedores de pagamento.</li>
          <li><strong>Autoridades:</strong> mediante ordem judicial ou requisição legal fundamentada.</li>
        </ul>
        <p className="mt-3 text-[14px] leading-[1.7] text-foreground">
          Nenhum dado é vendido a terceiros para fins comerciais.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">5. Transferência internacional</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Alguns dos nossos provedores (Firebase/Google Cloud) podem processar
          dados em servidores fora do Brasil. Garantimos que todos os provedores
          operam sob cláusulas-padrão contratuais aprovadas pela ANPD ou em países
          com nível adequado de proteção de dados reconhecido.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">6. Cookies e tecnologias similares</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Usamos cookies essenciais para o funcionamento da plataforma (autenticação,
          preferências de tema, segurança). Não usamos cookies de marketing ou
          analytics de terceiros sem consentimento explícito. Veja nossa{' '}
          <a href="/legal/cookies" className="text-primary underline">Política de Cookies</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">7. Direitos do titular (Art. 18 LGPD)</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Você tem os seguintes direitos sobre seus dados pessoais:
        </p>
        <ul className="mt-2 ml-6 list-disc space-y-1.5 text-[14px] leading-[1.7] text-foreground">
          <li><strong>Confirmação e acesso:</strong> saber quais dados temos sobre você.</li>
          <li><strong>Correção:</strong> atualizar dados incompletos ou incorretos.</li>
          <li><strong>Anonimização, bloqueio ou eliminação:</strong> solicitar tratamento específico.</li>
          <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado (JSON/CSV).</li>
          <li><strong>Revogação do consentimento:</strong> a qualquer momento, sem efeito retroativo.</li>
          <li><strong>Oposição:</strong> opor-se a tratamento que considere indevido.</li>
        </ul>
        <p className="mt-3 text-[14px] leading-[1.7] text-foreground">
          Para exercer qualquer desses direitos, envie um e-mail para{' '}
          <a href="mailto:privacidade@viralata.org" className="text-primary underline">privacidade@viralata.org</a>{' '}
          ou use as ferramentas de autoatendimento em Configurações → Privacidade.
          Responderemos em até 15 dias úteis.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">8. Retenção e eliminação</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da
          conta (Configurações → Deletar conta), os dados pessoais são anonimizados
          em até 30 dias, exceto quando a manutenção for necessária para cumprimento
          de obrigação legal (ex.: registros de adoção mantidos por 5 anos — Art. 50 LGPD).
        </p>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Logs de acesso são mantidos por 6 meses (Marco Civil da Internet — Art. 10).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">9. Segurança da informação</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          Adotamos medidas técnicas e organizacionais para proteger seus dados:
        </p>
        <ul className="mt-2 ml-6 list-disc space-y-1.5 text-[14px] leading-[1.7] text-foreground">
          <li>Criptografia em trânsito (HTTPS/TLS 1.3) e em repouso (AES-256).</li>
          <li>Autenticação multifator opcional para contas de abrigo.</li>
          <li>Regras de acesso granulares no Firestore (Firestore Security Rules).</li>
          <li>Auditoria de acessos (audit log).</li>
          <li>Backups criptografados.</li>
          <li>Testes de penetração periódicos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground">10. Encarregado de dados (DPO) e contato</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-foreground">
          O <strong>Encarregado de Proteção de Dados (DPO)</strong> da Viralata é o
          ponto de contato para dúvidas, reclamações ou solicitações relacionadas
          a esta política.
        </p>
        <p className="mt-3 text-[14px] leading-[1.7] text-foreground">
          <strong>Nome:</strong> Dr. [Nome do DPO]<br />
          <strong>E-mail:</strong> <a href="mailto:dpo@viralata.org" className="text-primary underline">dpo@viralata.org</a><br />
          <strong>Endereço:</strong> [Endereço da associação]
        </p>
        <p className="mt-3 text-[14px] leading-[1.7] text-foreground">
          Você também tem o direito de apresentar reclamação à{' '}
          <strong>ANPD (Autoridade Nacional de Proteção de Dados)</strong>{' '}
          através do site{' '}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer" className="text-primary underline">
            www.gov.br/anpd
          </a>.
        </p>
      </section>

      <div className="border-t border-border pt-4 text-[12px] text-muted-foreground">
        <p><strong>Versão:</strong> {VERSION_LABEL}</p>
        <p><strong>Esta política pode ser atualizada.</strong> Notificaremos
          alterações significativas por e-mail e banner na plataforma.</p>
      </div>
    </div>
  );
}
