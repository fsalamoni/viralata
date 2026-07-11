/**
 * @fileoverview Termos de Uso — Versão expandida (Fase 19).
 *
 * Cobre as 13 seções canônicas do termo de uso geral:
 *  1. Aceitação e vinculação
 *  2. Definições (plataforma, usuário, abrigo, adotante, etc.)
 *  3. Natureza da plataforma (marketplace de adoção responsável)
 *  4. Cadastro e capacidade
 *  5. Uso da plataforma (adoption, chat, doacoes, eventos)
 *  6. Conteúdo do usuário (propriedade, licenças, retirada)
 *  7. Condutas proibidas
 *  8. Suspensão e encerramento
 *  9. Pagamentos (não intermediação)
 * 10. Propriedade intelectual
 * 11. Isenção de responsabilidade (Art. 936 CC + Marco Civil)
 * 12. Limitação de responsabilidade
 * 13. Disposições finais (LGPD, foro, alterações)
 *
 * Versão canônica: 2026-07-10. Mudanças incrementais devem atualizar
 * `CURRENT_TERMS_VERSION.termos` em `domain/legal/terms.js`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Scale,
  Ban,
  HeartHandshake,
  MessagesSquare,
  Gavel,
  BookOpen,
  ShieldCheck,
  Coins,
  Copyright,
  AlertTriangle,
  UserX,
  LogIn,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
} from '@/components/legal-page';

const VERSION = '2026-07-10';
const VERSION_LABEL = 'Versão 2.0 · 10 de julho de 2026';

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Termos de Uso e Condições Gerais"
      description="Condições para uso da plataforma Viralata por adotantes, doadores, voluntários, lares temporários e organizações (abrigos/ONGs)."
      meta={`${VERSION_LABEL}. Ao usar a plataforma, você declara ciência e aceitação destas condições. Veja também a Política de Privacidade (LGPD) e os termos específicos de cada papel.`}
    >
      <LegalSection
        icon={BookOpen}
        title="1. Aceitação e vinculação"
        description="Estes Termos regem toda a relação entre você e a Viralata."
      >
        <p>
          Bem-vindo(a) à <strong>Viralata</strong>. Ao criar conta, acessar ou utilizar qualquer funcionalidade da
          plataforma, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso e Condições
          Gerais, nossa <a href="/politica-privacidade">Política de Privacidade</a> e o{' '}
          <a href="/codigo-conduta">Código de Conduta</a>. Se você não concordar com qualquer disposição, não
          utilize a plataforma.
        </p>
        <p>
          Estes Termos constituem um contrato eletrônico entre você e a Viralata, na forma do Art. 10 da Lei
          14.063/2020 (assinatura eletrônica), e são vinculantes para todos os usuários, independentemente de
          seu papel (adotante, doador, voluntário, lar temporário, abrigo ou ONG).
        </p>
      </LegalSection>

      <LegalSection
        icon={Scale}
        title="2. Definições"
        description="Para estes Termos, considera-se:"
      >
        <LegalList>
          <LegalListItem><strong>Plataforma</strong>: o software, sites, APIs e serviços da Viralata, operados pela pessoa jurídica responsável.</LegalListItem>
          <LegalListItem><strong>Usuário</strong>: toda pessoa física ou jurídica cadastrada, qualquer que seja seu papel.</LegalListItem>
          <LegalListItem><strong>Abrigo / ONG</strong>: organização parceira que cadastra animais para adoção responsável.</LegalListItem>
          <LegalListItem><strong>Adotante</strong>: pessoa interessada em adotar, que preencheu o questionário de perfilamento.</LegalListItem>
          <LegalListItem><strong>Doador</strong>: pessoa ou organização que cadastrou um pet para adoção.</LegalListItem>
          <LegalListItem><strong>Voluntário</strong>: membro cadastrado para auxiliar em eventos, lares temporários ou rotinas do abrigo.</LegalListItem>
          <LegalListItem><strong>Lar Temporário (LT)</strong>: pessoa física que recebe animal sob guarda temporária, sem transferência de propriedade.</LegalListItem>
          <LegalListItem><strong>Pet / Animal</strong>: cão ou gato cadastrado para adoção responsável, com identificação, perfil e histórico.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="3. Natureza da plataforma"
        description="Marketplace de adoção responsável — não há venda de animais."
      >
        <p>
          A Viralata é uma plataforma que <strong>conecta</strong> doadores e adotantes, oferecendo ferramentas
          de perfilamento, matching, curadoria, chat, prontuário, pós-adoção e indicadores. A Viralata{' '}
          <strong>não comercializa animais</strong>, não intermedia pagamentos relativos à adoção e não é
          parte na relação jurídica entre doador e adotante.
        </p>
        <p>
          Eventuais doações financeiras a abrigos (Pix, vaquinha, crowdfunding) são transações diretas entre
          doador e organização, fora da plataforma. A Viralata pode oferecer ferramentas de arrecadação, mas
          não se responsabiliza pela aplicação dos recursos arrecadados.
        </p>
      </LegalSection>

      <LegalSection
        icon={LogIn}
        title="4. Cadastro e capacidade"
        description="Cadastro pessoal, verdade das informações e capacidade civil."
      >
        <LegalList>
          <LegalListItem>O cadastro é pessoal e intransferível. Você deve ter ao menos 18 anos e plena capacidade civil (Art. 5º CC) para aceitar estes Termos.</LegalListItem>
          <LegalListItem>No caso de Organização (abrigo/ONG), o cadastro é feito por representante legal com poderes específicos, que declara estar autorizado a vincular a entidade.</LegalListItem>
          <LegalListItem>As informações fornecidas (nome, e-mail, telefone, CPF/CNPJ, endereço) devem ser verdadeiras, atualizadas e completas. A Viralata pode confirmar os dados por meios lícitos (Art. 37 LGPD).</LegalListItem>
          <LegalListItem>Você é responsável por manter a confidencialidade da sua senha e por todas as ações realizadas na sua conta.</LegalListItem>
          <LegalListItem>Em caso de suspeita de acesso não autorizado, você deve notificar imediatamente a Viralata através do canal de suporte.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={MessagesSquare}
        title="5. Uso da plataforma"
        description="Funcionalidades e regras operacionais."
      >
        <p>O uso da plataforma é gratuito para o catálogo base. Funcionalidades premium (destacadas como
          “Pro”) podem ser oferecidas a abrigo, conforme termos específicos.</p>
        <LegalList>
          <LegalListItem><strong>Questionário de perfilamento</strong>: obrigatório para acesso ao catálogo. Suas respostas alimentam o algoritmo de compatibilidade e o snapshot do aplicante.</LegalListItem>
          <LegalListItem><strong>Adoção</strong>: somente após aprovação do abrigo responsável. Toda adoção gera um Termo de Adoção registrado (vide <a href="/termos-adocao">/termos-adocao</a>).</LegalListItem>
          <LegalListItem><strong>Chat</strong>: apenas o responsável pelo pet pode iniciar conversa. Proibido assédio, spam, venda disfarçada.</LegalListItem>
          <LegalListItem><strong>Doações</strong>: arrecadação para abrigo segue o <a href="/termos-doador">Termo de Doação</a> e a legislação tributária aplicável (ITCMD).</LegalListItem>
          <LegalListItem><strong>Eventos</strong>: vitrines, feiras e exposições têm regras próprias em <a href="/termos-voluntario">/termos-voluntario</a>.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Copyright}
        title="6. Conteúdo do usuário"
        description="Propriedade, licença de uso e retirada."
      >
        <p>
          Você mantém a propriedade de todo o conteúdo que envia (fotos, descrições, vídeos, prontuários).
          Ao publicar, você concede à Viralata uma licença <strong>não exclusiva, gratuita, mundial e
          temporária</strong> para hospedar, exibir, distribuir e criar thumbnails desse conteúdo, exclusivamente
          para operação da plataforma, pelo prazo em que ele permanecer publicado.
        </p>
        <p>
          Você declara ter todos os direitos necessários sobre o conteúdo, incluindo direitos de imagem de
          terceiros eventualmente retratados (Art. 20 CC). Conteúdos que violem direitos de terceiros ou a
          legislação podem ser retirados pela Viralata, com ou sem aviso prévio, sem prejuízo de outras medidas.
        </p>
      </LegalSection>

      <LegalSection
        icon={Ban}
        title="7. Condutas proibidas"
        description="Tolerância zero a violações graves."
      >
        <LegalList>
          <LegalListItem>Maus-tratos, crueldade, abandono, mutilação, envenenamento ou qualquer forma de violência contra animais (Lei 9.605/98 Art. 32 e seguintes).</LegalListItem>
          <LegalListItem>Venda disfarçada de animais, tráfico de fauna, rinhas, exposição a sofrimento.</LegalListItem>
          <LegalListItem>Cadastros falsos de pets, pessoas ou organizações, ou apropriação indevida de identidade.</LegalListItem>
          <LegalListItem>Assédio, discriminação, discurso de ódio, ameaça ou coerção a outros usuários.</LegalListItem>
          <LegalListItem>Uso de robôs, scrapers ou automação para coleta de dados da plataforma (Marco Civil Art. 7º).</LegalListItem>
          <LegalListItem>Envio de malware, phishing, engenharia social ou qualquer prática que comprometa a segurança.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={UserX}
        title="8. Suspensão e encerramento"
        description="Critérios e procedimentos."
      >
        <p>
          A Viralata pode, a seu critério, suspender ou encerrar contas que violem estes Termos, a Política
          de Privacidade ou o Código de Conduta. Em casos graves (maus-tratos, crimes), a suspensão é imediata
          e pode ser comunicada às autoridades competentes.
        </p>
        <p>
          O usuário pode solicitar o encerramento da conta a qualquer momento, hipótese em que os dados
          pessoais serão tratados conforme a Política de Privacidade (LGPD Art. 18). Registros de aceite
          destes Termos são mantidos por até 5 anos para fins de prova legal (Código Civil Art. 205).
        </p>
      </LegalSection>

      <LegalSection
        icon={Coins}
        title="9. Pagamentos e não-intermediação"
        description="A Viralata não intermedia valores relativos à adoção."
      >
        <p>
          A Viralata <strong>não recebe, processa ou repassa</strong> valores relativos à adoção de animais.
          Eventuais taxas de “castração obrigatória” cobradas por abrigos parceiros são de responsabilidade
          exclusiva do abrigo e devem ser informadas previamente ao adotante. A Viralata pode oferecer
          ferramentas de pagamento (gateway, Pix) para doações, eventos ou serviços acessórios, sempre
          identificando claramente o recebedor.
        </p>
      </LegalSection>

      <LegalSection
        icon={Copyright}
        title="10. Propriedade intelectual da plataforma"
        description="Marcas, software, layout e banco de dados."
      >
        <p>
          A marca “Viralata”, o software, layout, textos, ilustrações, código-fonte e banco de dados da
          plataforma são de titularidade da Viralata ou de seus licenciadores, protegidos pela Lei
          9.610/98 (direito autoral), Lei 9.279/96 (propriedade industrial) e Lei 9.609/98 (software).
          É vedada a reprodução, distribuição, engenharia reversa ou criação de obras derivadas sem
          autorização expressa.
        </p>
      </LegalSection>

      <LegalSection
        icon={AlertTriangle}
        title="11. Isenção de responsabilidade (Art. 936 CC)"
        description="A Viralata é software inerte — não exerce ato médico, não garante resultados."
      >
        <p>
          A Viralata <strong>não se responsabiliza</strong> por:
        </p>
        <LegalList>
          <LegalListItem>Veracidade das informações cadastradas pelo doador quanto ao pet (saúde, comportamento, procedência).</LegalListItem>
          <LegalListItem>Vícios redibitórios do animal, doenças pré-existentes não declaradas, ou alterações de comportamento após a adoção.</LegalListItem>
          <LegalListItem>Ato médico veterinário, prescrição, diagnóstico ou telemedicina — funcionalidades correlatas operam como ferramenta inerte, sob responsabilidade do Responsável Técnico (RT) do abrigo (CFMV 1.465/2022).</LegalListItem>
          <LegalListItem>Danos causados pelo animal ao adotante, a terceiros ou a outros animais após a entrega.</LegalListItem>
          <LegalListItem>Disputas entre usuários fora do escopo da plataforma.</LegalListItem>
          <LegalListItem>Indisponibilidade temporária da plataforma, perda de dados ou ataques cibernéticos, salvo dolo ou culpa grave.</LegalListItem>
        </LegalList>
        <p>
          Em nenhuma hipótese a Viralata será responsável por danos indiretos, lucros cessantes, perdas
          patrimoniais ou morais decorrentes do uso da plataforma, ressalvada a hipótese de dolo.
        </p>
      </LegalSection>

      <LegalSection
        icon={Scale}
        title="12. Limitação de responsabilidade"
        description="Teto máximo de indenização."
      >
        <p>
          Caso a Viralata venha a ser responsabilizada judicialmente, o valor da indenização ficará limitado
          ao montante efetivamente pago pelo usuário à Viralata nos 12 (doze) meses anteriores ao fato
          gerador, ou a 1 (um) salário mínimo, o que for maior.
        </p>
      </LegalSection>

      <LegalSection
        icon={Gavel}
        title="13. Disposições finais — LGPD, foro e alterações"
        description="Foro, legislação aplicável e alterações destes Termos."
      >
        <LegalList>
          <LegalListItem><strong>Legislação aplicável</strong>: estes Termos são regidos pela legislação brasileira, especialmente LGPD (Lei 13.709/2018), Marco Civil da Internet (Lei 12.965/2014), CDC (Lei 8.078/90) e CC/02.</LegalListItem>
          <LegalListItem><strong>LGPD</strong>: o tratamento de dados pessoais é regido pela <a href="/politica-privacidade">Política de Privacidade</a> e pelo nosso Encarregado/DPO (canal no rodapé).</LegalListItem>
          <LegalListItem><strong>Cookies</strong>: a plataforma utiliza cookies conforme a <a href="/politica-cookies">Política de Cookies</a> (LGPD Art. 9º).</LegalListItem>
          <LegalListItem><strong>Foro</strong>: fica eleito o foro da Comarca de São Paulo/SP como competente para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</LegalListItem>
          <LegalListItem><strong>Alterações</strong>: a Viralata pode alterar estes Termos a qualquer tempo, mediante aviso prévio de 30 (trinta) dias por e-mail e banner na plataforma. A continuação de uso após o prazo implica aceitação.</LegalListItem>
          <LegalListItem><strong>Versão</strong>: estes Termos estão na <strong>{VERSION}</strong>. O histórico de versões está disponível mediante solicitação ao DPO.</LegalListItem>
        </LegalList>
      </LegalSection>
    </LegalPage>
  );
}
