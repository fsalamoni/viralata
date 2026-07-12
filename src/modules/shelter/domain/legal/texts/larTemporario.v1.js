/**
 * @fileoverview Texto integral — Termo de Responsabilidade de Lar Temporário (LT) (Documento v2).
 *
 * Texto exibido em /legal/termo-lar-temporario. Gerado a partir do arquivo
 * '11_Termo_Lar_Temporario.md' do pacote
 * `Viralata_Documentos_Legais_Completos_v2.zip`
 * (10/07/2026) e convertido em template string pelo script
 * `scripts/import-legal-docs-v2.mjs`.
 *
 * IMPORTANTE: este texto é a base operacional da plataforma.
 * A versão definitiva deve passar por revisão jurídica humana
 * (vide SCRUM_TASKS.json — TASK-006/007/008). O texto v2 é
 * o que vai para produção hoje; correções jurídicas serão
 * aplicadas em v3 com changelog.
 *
 * Marco legal: Marco Civil da Internet (Lei 12.965/2014), LGPD
 * (Lei 13.709/2018), Lei 14.063/2020 (assinatura eletrônica),
 * Decreto 24.645/34, Lei 9.605/98 (crimes ambientais), Lei
 * 14.064/2020 (Lei Sansão), Resolução CFMV 1.236/2018 e
 * 1.465/2022, ANPD Resolução CD/ANPD 15/2024 e 32/2026.
 */


export const FOSTER_TERMS_VERSION = '2026-07-10';

export const FOSTER_TERMS_TEXT = `# TERMO DE RESPONSABILIDADE DE LAR TEMPORÁRIO (LT)

**Aceite obrigatório ao aceitar receber um animal como Lar Temporário. O sistema deve gerar este documento dinamicamente, preenchendo os dados do LT, do Abrigo e do Animal, e registrar o aceite eletrônico (IP + timestamp) no audit_log.**

---

Pelo presente instrumento particular, de um lado o **ABRIGO/ONG** responsável pelo animal (doravante denominado "CEDENTE TEMPORÁRIO"), cujos dados constam do perfil cadastrado na Plataforma Viralata, e de outro lado o **RESPONSÁVEL PELO LAR TEMPORÁRIO** (doravante denominado "LT"), cujos dados de qualificação civil, CPF, RG e endereço foram validados e registrados eletronicamente na Plataforma Viralata, celebram o presente Termo de Responsabilidade de Lar Temporário, que se regerá pelas seguintes cláusulas:

---

## CLÁUSULA 1ª — DO OBJETO E DA NATUREZA DA POSSE

O CEDENTE TEMPORÁRIO transfere ao LT a **posse provisória e precária** do animal qualificado no sistema (ID do Animal, Nome, Espécie, Sexo, Porte, Condição de Saúde no momento da transferência), para fins exclusivos de acolhimento temporário, socialização e preparação para adoção definitiva.

**1.1.** A guarda definitiva, a propriedade legal e a responsabilidade institucional pelo animal permanecem integralmente com o CEDENTE TEMPORÁRIO durante todo o período de acolhimento.

**1.2.** Este termo não configura adoção, não transfere a propriedade do animal e não gera qualquer direito de posse permanente ao LT.

---

## CLÁUSULA 2ª — DOS DEVERES DO LAR TEMPORÁRIO (BEM-ESTAR ANIMAL)

O LT compromete-se a:

1. Fornecer ao animal alimentação adequada à sua espécie, porte e condição de saúde, água limpa e fresca em quantidade suficiente, e abrigo seguro, protegido de sol, chuva, frio e intempéries.
2. Não manter o animal acorrentado de forma permanente, nem em espaços que configurem confinamento abusivo, nos termos da Lei nº 9.605/1998 e da Lei nº 14.064/2020.
3. Manter o animal em ambiente seguro, impedindo fugas, acesso livre à rua e contato com outros animais que possam representar risco à sua saúde.
4. Seguir rigorosamente o protocolo de medicações, vacinas e tratamentos veterinários indicados pelo CEDENTE TEMPORÁRIO e registrados no prontuário do animal na Plataforma Viralata.
5. Comunicar imediatamente ao CEDENTE TEMPORÁRIO, via chat da Plataforma, qualquer alteração no estado de saúde, comportamento ou bem-estar do animal.
6. Não submeter o animal a situações de estresse, violência, exposição a substâncias tóxicas ou qualquer forma de maus-tratos, sob pena de responsabilização civil e criminal.

---

## CLÁUSULA 3ª — DA PROIBIÇÃO DE REPASSE E ADOÇÃO NÃO AUTORIZADA

**3.1.** É terminantemente proibido ao LT vender, permutar, repassar, sublavar ou promover a adoção do animal a terceiros por conta própria, sem a aprovação formal e expressa do CEDENTE TEMPORÁRIO através da Plataforma Viralata.

**3.2.** Caso o LT deseje adotar definitivamente o animal, deverá formalizar seu interesse através do módulo de adoção da Plataforma, passando pelo mesmo processo de avaliação aplicado a qualquer adotante, conforme critérios do CEDENTE TEMPORÁRIO.

**3.3.** A realização de adoção não autorizada configura apropriação indébita do animal (Art. 168 do Código Penal Brasileiro) e poderá ensejar ação de reintegração de posse, além de responsabilização por perdas e danos.

---

## CLÁUSULA 4ª — DA DEVOLUÇÃO OBRIGATÓRIA

**4.1.** O LT obriga-se a devolver o animal ao CEDENTE TEMPORÁRIO imediatamente quando:
- O animal for oficialmente adotado por terceiros através da Plataforma Viralata;
- O CEDENTE TEMPORÁRIO solicitar a devolução, por qualquer motivo, com aviso prévio de 48 horas (salvo emergências);
- O LT não puder mais manter as condições adequadas de acolhimento.

**4.2.** A recusa injustificada em devolver o animal, após notificação formal pelo CEDENTE TEMPORÁRIO via Plataforma, configura esbulho possessório e poderá ensejar medidas judiciais de reintegração de posse.

**4.3.** O LT não terá direito a qualquer indenização, ressarcimento ou retenção do animal por despesas incorridas durante o período de acolhimento, salvo acordo prévio e expresso com o CEDENTE TEMPORÁRIO.

---

## CLÁUSULA 5ª — DO ACOMPANHAMENTO E MONITORAMENTO

**5.1.** O LT autoriza o CEDENTE TEMPORÁRIO a realizar visitas presenciais ao local de acolhimento, previamente agendadas com antecedência mínima de 24 horas, para verificação das condições de bem-estar do animal.

**5.2.** O LT compromete-se a responder às solicitações de acompanhamento enviadas pelo CEDENTE TEMPORÁRIO através da Plataforma (fotos, vídeos, relatórios de saúde) no prazo máximo de 48 horas.

**5.3.** O não atendimento reiterado às solicitações de acompanhamento poderá ser interpretado como descumprimento deste Termo, autorizando o CEDENTE TEMPORÁRIO a solicitar a devolução imediata do animal.

---

## CLÁUSULA 6ª — DA RESPONSABILIDADE CIVIL

**6.1.** O LT assume responsabilidade civil pelos danos materiais, morais ou físicos que o animal venha a causar a terceiros durante o período de acolhimento, nos termos do Art. 936 do Código Civil Brasileiro, que estabelece a responsabilidade objetiva do detentor do animal.

**6.2.** O CEDENTE TEMPORÁRIO e a Plataforma Viralata estão isentos de qualquer responsabilidade solidária ou subsidiária por danos causados pelo animal durante o período em que estiver sob os cuidados do LT.

---

## CLÁUSULA 7ª — DO ESTADO DE SAÚDE DO ANIMAL

O LT declara receber o animal no estado de saúde descrito no prontuário veterinário registrado na Plataforma no momento da transferência. Eventuais doenças incubadas, não aparentes ou não diagnosticadas até a presente data são de responsabilidade do CEDENTE TEMPORÁRIO, que deverá custear o tratamento correspondente.

---

## CLÁUSULA 8ª — DA VIGÊNCIA

Este Termo entra em vigor na data do aceite eletrônico pelo LT e permanece válido até a devolução formal do animal ao CEDENTE TEMPORÁRIO, registrada no sistema da Plataforma Viralata.

---

Por estarem de acordo, as partes aceitam eletronicamente o presente termo, cujo registro de IP, data e hora (*timestamp*) e ID do usuário, armazenados imutavelmente no sistema de auditoria da Plataforma Viralata, servem como prova de autoria, integridade e validade jurídica deste instrumento.
`;
