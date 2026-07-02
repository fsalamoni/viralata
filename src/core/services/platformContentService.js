/**
 * Conteúdo institucional editável (Termos, Privacidade, Legislação), guardado
 * como Markdown em `platform_content/{pageKey}`. Só o admin master edita; a
 * leitura é pública. Se o documento não existir (ainda não editado), as
 * páginas usam o texto padrão embutido — ver DEFAULT_PLATFORM_CONTENT.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';

const COL = 'platform_content';

export const PLATFORM_CONTENT_PAGES = Object.freeze({
  TERMOS: 'termos',
  PRIVACIDADE: 'privacidade',
  LEGISLACAO: 'legislacao',
});

export const PLATFORM_CONTENT_LABELS = Object.freeze({
  [PLATFORM_CONTENT_PAGES.TERMOS]: 'Termos de Uso',
  [PLATFORM_CONTENT_PAGES.PRIVACIDADE]: 'Política de Privacidade',
  [PLATFORM_CONTENT_PAGES.LEGISLACAO]: 'Legislação e Posse Responsável',
});

function contentRef(pageKey) {
  return doc(db, COL, pageKey);
}

/**
 * Texto padrão de cada página institucional, usado enquanto o admin master
 * não editou nada em `platform_content`. Mantém o conteúdo que já existia
 * nas páginas antes da CMS (mesmo teor jurídico/educativo).
 */
export const DEFAULT_PLATFORM_CONTENT = Object.freeze({
  [PLATFORM_CONTENT_PAGES.TERMOS]: `## Papel da plataforma

Intermediária facilitadora, não parte na adoção.

O Viralata conecta pessoas e organizações que têm animais para doação com adotantes interessados. A plataforma **não é responsável** pelo comportamento dos usuários, pela saúde do animal após a adoção, pela veracidade das informações cadastradas ou por qualquer disputa entre as partes. Não há venda de animais nem intermediação de valores — eventuais doações financeiras a ONGs (Pix, vaquinha) são transações diretas entre doador e organização, fora da plataforma.

## Responsabilidades do adotante e do doador

- O doador é responsável pela veracidade dos dados do pet (saúde, temperamento, castração, vacinação).
- O adotante é responsável por verificar as condições do animal antes de concluir a adoção.
- Recomenda-se formalizar a adoção com um termo de responsabilidade entre as partes, fora da plataforma.

## Uso do chat e conteúdo

Apenas o responsável pelo pet pode iniciar uma conversa com um interessado, para manter a curadoria dos candidatos. É proibido o uso do chat para assédio, spam ou negociação de venda de animais. Fotos e descrições devem representar fielmente o animal anunciado.

## Condutas proibidas e suspensão

- Maus-tratos, abandono ou venda disfarçada de animais.
- Cadastros falsos de pets ou de organizações.
- Assédio, discriminação ou ofensas a outros usuários.

O descumprimento pode levar à suspensão da conta ou exclusão de anúncios pela administração da plataforma, sem aviso prévio em casos graves.

## Foro e legislação aplicável

Estes termos são regidos pela legislação brasileira, incluindo a Lei Geral de Proteção de Dados (LGPD) e as normas de proteção animal vigentes. Dúvidas sobre tratamento de dados pessoais estão detalhadas na nossa Política de Privacidade.
`,
  [PLATFORM_CONTENT_PAGES.PRIVACIDADE]: `## Natureza da plataforma

Marketplace de adoção responsável de pets — não há venda de animais.

O **Viralata** é uma plataforma que conecta pessoas físicas e ONGs/lojas parceiras que têm animais para doação com adotantes interessados. Um questionário de perfilamento comportamental (moradia, rotina, família, orçamento) é obrigatório antes do acesso ao catálogo, para reduzir devoluções e frustrações.

A plataforma não vende animais, não intermedia pagamentos entre as partes e não garante a veracidade das informações fornecidas por quem cadastra um pet. Recomendamos que o adotante faça suas próprias verificações antes de concluir uma adoção.

## Conduta e responsabilidade

Cada usuário responde pelos próprios atos.

O uso deve respeitar a legislação de proteção animal e a boa-fé entre as partes. Cadastros falsos, maus-tratos, discriminação ou assédio no chat podem levar à suspensão da conta. Denúncias de maus-tratos podem ser registradas a qualquer momento pelo botão de denúncia — a plataforma gera um relatório para você mesmo encaminhar às autoridades competentes, sem assumir a investigação.

## Dados coletados

Coletamos o necessário para viabilizar o match e a adoção responsável.

- Nome e e-mail (via login Google), foto de perfil, telefone e localização (cidade/estado).
- Perfil de adotante: tipo de moradia, rotina de passeios, presença de crianças/idosos, outros animais e orçamento — usado pelo algoritmo de compatibilidade.
- Pets cadastrados (fotos, saúde, comportamento) e interesses de adoção demonstrados.
- Mensagens trocadas no chat entre adotante e responsável pelo pet, incluindo anexos.
- Avaliações mútuas registradas após uma adoção concluída.
- Denúncias de maus-tratos, quando registradas por você.
- Logs de auditoria de ações administrativas (data, autor, descrição) — mantidos mesmo após a exclusão de uma conta, por exigência legal.

## Visibilidade dos dados

Nome de exibição e foto aparecem publicamente nos anúncios de pets, avaliações e diretório de organizações. Telefone e e-mail só ficam visíveis para a outra parte de uma conversa em andamento, e apenas se você optar por publicá-los. Administradores de organizações (ONGs/lojas) veem os dados de quem demonstrou interesse nos pets sob sua responsabilidade.

## Seus direitos (LGPD)

Você pode baixar uma cópia dos seus dados ou excluir sua conta a qualquer momento na página **Meu Perfil**. Ao excluir a conta, seu perfil é anonimizado e o acesso é removido; pets, posts e mensagens já publicados permanecem visíveis para não quebrar o histórico de terceiros, e os logs de auditoria são preservados conforme exigido em lei.

## Alterações

Esta política pode ser atualizada para refletir mudanças de funcionalidade ou requisitos legais. A versão vigente é sempre a publicada nesta página.
`,
  [PLATFORM_CONTENT_PAGES.LEGISLACAO]: `## Legislação de proteção animal

Panorama federal — consulte também leis estaduais e municipais da sua região.

- **Lei Federal nº 9.605/1998 (Lei de Crimes Ambientais)** — tipifica maus-tratos a animais como crime, com penas de detenção e multa.
- **Lei Federal nº 14.064/2020** — aumentou as penas para maus-tratos a cães e gatos.
- **Decreto nº 24.645/1934** — ainda referenciado em decisões judiciais como fundamento de proteção animal.

Este resumo é meramente informativo. Para uma denúncia formal, utilize o botão "Fazer Denúncia" da plataforma, que gera um relatório para encaminhamento à Polícia Civil ou órgão ambiental competente.

## Antes de adotar

Uma adoção responsável começa antes do pet chegar em casa.

- Avalie se sua rotina, moradia e orçamento são compatíveis com as necessidades do animal (é exatamente o que o nosso questionário de perfil ajuda a mapear).
- Converse com todos os moradores da casa antes de decidir.
- Prepare o espaço: pet-proofing, telas de proteção em janelas/sacadas, remoção de plantas tóxicas.
- Planeje o orçamento mensal: ração, vacinas, vermífugo e uma reserva para imprevistos veterinários.

## Vacinação e castração

Cães e gatos devem receber o protocolo de vacinas (V8/V10 ou quádrupla/quíntupla felina, antirrábica) e reforços anuais conforme orientação veterinária. A castração é a principal ferramenta de controle populacional e reduz riscos de saúde e comportamento — muitas prefeituras e ONGs oferecem castração gratuita ou subsidiada.

## Cuidados contínuos

- Consultas veterinárias periódicas, mesmo sem sintomas aparentes.
- Vermifugação regular e controle de pulgas/carrapatos.
- Enriquecimento ambiental: brinquedos, passeios e estímulo mental, especialmente para pets que ficam sozinhos durante o dia.

## Aviso legal

Este conteúdo tem finalidade educativa e não substitui orientação jurídica, veterinária ou de um profissional de comportamento animal qualificado. A legislação pode mudar; consulte sempre as fontes oficiais e a legislação municipal/estadual da sua cidade.
`,
});

/**
 * Lê o Markdown editado de uma página institucional. Devolve `null` se ainda
 * não foi editada (o chamador deve usar o texto padrão embutido) ou em
 * qualquer erro (Firebase indisponível, sem permissão, etc.).
 * @param {string} pageKey
 * @returns {Promise<{ body: string, updated_at: any } | null>}
 */
export async function getPlatformContent(pageKey) {
  try {
    if (!db) return null;
    const snap = await getDoc(contentRef(pageKey));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data?.body?.trim()) return null;
    return { body: data.body, updated_at: data.updated_at || null };
  } catch {
    return null;
  }
}

/**
 * Salva o Markdown de uma página institucional. Apenas platform_admin deve
 * chamar (reforçado por firestore.rules).
 * @param {string} pageKey
 * @param {string} body
 * @param {object} actor — usuário autenticado (para auditoria)
 */
export async function setPlatformContent(pageKey, body, actor) {
  if (!Object.values(PLATFORM_CONTENT_PAGES).includes(pageKey)) {
    throw new Error(`Página institucional desconhecida: ${pageKey}`);
  }
  await setDoc(
    contentRef(pageKey),
    { body, updated_at: serverTimestamp() },
    { merge: true },
  );
  await createAuditLog({
    action: 'platform_content_updated',
    actor,
    details: { page: pageKey },
  });
}
