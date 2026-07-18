# V3 PET DETAIL — Planejamento Completo

> **Status**: 🟡 PLANEJAMENTO (2026-07-18)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Comando do user**: "Cada pet tem que ter tudo: timeline, medicamentos, cuidados, consultas, tratamentos, informações, adotantes, devolução. Todo o histórico. RG de pet nacional. ID próprio."

---

## 0. Diagnóstico

A página `/pets/{petId}` (e `/pets/:petId`) está **fora do ar** mostrando "Algo deu errado" porque o arquivo `PetDetail.v1.jsx` (V1) tem **import recursivo** — ele importa de si mesmo. O usuário vê o erro porque a flag `V3_PAGE_PET_DETAIL` está OFF e o wrapper renderiza V1 (que está quebrada).

**Bug crítico encontrado**: `src/modules/pets/pages/PetDetail.v1.jsx` tem 38 linhas e seu conteúdo é IGUAL ao wrapper `PetDetail.jsx` (importa `./PetDetail.v1` recursivamente, causando loop infinito / tela branca).

### O que a V3 atual tem (PetDetailV3.jsx, 604 linhas)

✅ **Já implementado** (TASK-927):
- Galeria com swipe + thumbs + zoom (PetGallery)
- Favoritar persistente (PetFavoriteButton)
- Reportar (PetReportButton)
- Mapa com pin da cidade (PetMap)
- Pets similares em carrossel (PetSimilar)
- Temperamento com ícones (PetTemperament)
- Timeline de eventos (PetTimeline)
- Sumário de avaliação (PetRatingSummary)
- Sticky CTA em mobile (PetStickyCta)
- "Sobre mim" com Collapsible
- Health record público (vaccines/dewormings/ectoparasites)
- Painel de interessados (dono)
- Rating pós-adoção

### O que FALTA (comando do user)

❌ **NÃO implementado** (a implementar nesta task):
1. **Medicamentos completos** (uso contínuo, doses, próximas doses)
2. **Consultas veterinárias** (data, veterinário, clínica, motivo, diagnóstico)
3. **Tratamentos** (sarna, ferida, doença, reabilitação)
4. **Cuidados** (banho, tosa, escovação, dental, unhas)
5. **Devolução** (registro formal de devolução + motivo)
6. **Adotantes anteriores** (histórico de quem adotou)
7. **RG de pet nacional** (campo `national_pet_id` — CNP/ABRADOG)
8. **ID próprio do pet** (campo `pet_code` — ex: VLT-000123)

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Pet = registro único completo | % pets com histórico completo | ≥ 80% |
| O2 | Identificação via RG/ID | Cliques em "ver RG" | ≥ 30% |
| O3 | Histórico de saúde acessível | Visualização por adotante | ≥ 60% |
| O4 | Devolução registrada | Devoluções com motivo | ≥ 90% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | Sem tela branca | Bug fix V1 | 100% |

### Anti-objetivos

- **AO1**: NÃO mostrar "Algo deu errado" — bug do V1 deve ser corrigido
- **AO2**: NÃO permitir edição do RG/ID por não-owners
- **AO3**: NÃO misturar dados sensíveis (vet privado) com vista pública

---

## 2. Schema do Pet (estendido)

### Campos do documento `pets/{petId}`

```js
{
  // ... campos existentes (name, species, breed, etc)
  pet_code: "VLT-000123",                    // NOVO — ID público do pet
  national_pet_id: "ABRADOG-12345-BR",       // NOVO — RG do pet (cif não-oficial)
  microchip: "985112004523...",              // NOVO — microchip ISO 11784
  created_at: Timestamp,                     // JÁ EXISTE
  ... // demais campos
}
```

### Subcoleções (`pets/{petId}/`)

| Subcoleção | Status atual | Comportamento |
|---|---|---|
| `timeline` | ✅ Existe (V3) | Eventos: cadastro, mudança status, adoção, devolução, transferência |
| `medical` | ✅ Existe (privado) | Prontuário interno (vet_notes, prescription) |
| `medications` | ✅ Existe (V1) | Medicação contínua + sub-doses |
| `vet_visits` | ❌ CRIAR | Consultas veterinárias: data, vet, clínica, motivo, diagnóstico |
| `treatments` | ❌ CRIAR | Tratamentos: tipo (sarna/ferida/etc), início, fim, status |
| `care_log` | ❌ CRIAR | Cuidados: banho, tosa, escovação, dental, unhas |
| `devolutions` | ❌ CRIAR | Devoluções: data, motivo, devolvido por (uid), observações |
| `adopters_history` | ❌ CRIAR | Histórico de adotantes: uid, data início/fim, status |

### Firestore Rules (a adicionar)

```js
match /vet_visits/{visitId} {
  allow read: if true; // público
  allow create, update: if canManagePet(get(/databases/.../pets/$(petId)).data);
  allow delete: if isPlatformAdmin();
}
match /treatments/{treatmentId} { ... }
match /care_log/{careId} { ... }
match /devolutions/{devId} { ... }
match /adopters_history/{historyId} { ... }
```

---

## 3. Estrutura da Página V3 (tabs)

### Tabs

1. **Sobre** (default) — Foto, badges, descrição, requisitos, mapa
2. **Saúde** — Medications, Vet Visits, Treatments, Health Records
3. **Cuidados** — Care log (banho, tosa, escovação, dental)
4. **Histórico** — Timeline, Devoluções, Adotantes

### Topo

- **Hero com foto** + nome + status
- **ID strip** abaixo do nome: `VLT-000123 · RG: ABRADOG-12345-BR · Chip: 985112004523...`
- Botões: favorite, report, share, edit, delete (dono)

### Tab: Sobre
- Galeria + temperamento + rating
- Badges (espécie, porte, idade, sexo, raça, castrado, vacinado, vermifugado)
- Mapa + cidade
- Descrição (Collapsible)
- Saúde pública (vaccines/dewormings/ectoparasites)
- Requisitos
- Responsável + chat CTA

### Tab: Saúde
- **Vacinas** (próximas doses + histórico)
- **Vermifugação** (próximas + histórico)
- **Antipulgas/carrapatos**
- **Medicações contínuas** (com doses próximas)
- **Consultas veterinárias** (data, vet, clínica, motivo, diagnóstico)
- **Tratamentos em curso** (sarna, ferida, etc)

### Tab: Cuidados
- **Banho** (data, próximo agendado)
- **Tosa** (data, próximo agendado)
- **Escovação** (frequência + última)
- **Dental** (última + próxima)
- **Unhas** (última + próxima)
- **Exercícios** (rotina)

### Tab: Histórico
- **Timeline completa** (todos os eventos)
- **Devoluções** (motivo, data, devolvido por)
- **Adotantes** (histórico completo desde cadastro)
- **Transferências** (entre abrigos, se aplicável)

---

## 4. Componentes NOVOS (a criar)

| Componente | Tamanho estimado | Função |
|---|---|---|
| `PetIDStrip.jsx` | 1KB | Exibe VLT-000123 + RG + chip |
| `PetMedications.jsx` | 4KB | Lista meds contínuas + doses |
| `PetVetVisits.jsx` | 4KB | Lista consultas |
| `PetTreatments.jsx` | 3KB | Lista tratamentos em curso |
| `PetCareLog.jsx` | 4KB | Lista cuidados (banho, tosa, etc) |
| `PetDevolutions.jsx` | 2KB | Lista devoluções |
| `PetAdoptersHistory.jsx` | 2KB | Lista histórico de adotantes |
| `PetHealthTab.jsx` | 2KB | Wrapper da tab Saúde |
| `PetCareTab.jsx` | 2KB | Wrapper da tab Cuidados |
| `PetHistoryTab.jsx` | 2KB | Wrapper da tab Histórico |

## 5. Hooks NOVOS (a criar)

| Hook | Função |
|---|---|
| `usePetVetVisits(petId)` | Lista consultas (subscribes) |
| `usePetTreatments(petId)` | Lista tratamentos |
| `usePetCareLog(petId)` | Lista cuidados |
| `usePetDevolutions(petId)` | Lista devoluções |
| `usePetAdoptersHistory(petId)` | Lista histórico adotantes |

## 6. Services NOVOS (a criar)

| Service | Função |
|---|---|
| `petMedicalService.js` | CRUD de consultas, tratamentos, cuidados |
| `petHistoryService.js` | CRUD de devoluções, adotantes, timeline |
| `petCodeGenerator.js` | Gera VLT-XXXXXX único |

---

## 7. Tarefas Filhas (SCRUM)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-PET-DETAIL-FULL-1 | Fix V1 (import recursivo) | 30min | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-2 | Schema pet_code + national_pet_id + microchip | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-3 | petCodeGenerator service (VLT-XXXXXX) | 1h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-4 | petMedicalService (vet_visits, treatments, care_log) | 3h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-5 | petHistoryService (devolutions, adopters_history) | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-6 | 5 hooks novos (usePetVetVisits etc) | 1h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-7 | Componente PetIDStrip | 1h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-8 | Componente PetMedications (com doses) | 3h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-9 | Componente PetVetVisits | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-10 | Componente PetTreatments | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-11 | Componente PetCareLog | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-12 | Componente PetDevolutions | 1h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-13 | Componente PetAdoptersHistory | 1h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-14 | Tabs (Sobre / Saúde / Cuidados / Histórico) | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-15 | Página V3 nova (consolidação) | 3h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-16 | Firestore rules (5 subcoleções novas) | 1h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-17 | Regência final 15 seções | 2h | ⏳ TODO |
| TASK-V3-PET-DETAIL-FULL-18 | Build + deploy + SCRUM | 1h | ⏳ TODO |

**Total**: ~30h

---

## 8. Decisões Arquiteturais (D-*)

| ID | Decisão | Justificativa |
|---|---|---|
| D-PET-FULL-01 | Tabs Sobre/Saúde/Cuidados/Histórico | Separação clara de concerns |
| D-PET-FULL-02 | pet_code no formato VLT-000123 | ID curto, legível, único |
| D-PET-FULL-03 | RG nacional segue padrão CNP-ABRADOG (ou placeholder) | Cada país tem seu padrão |
| D-PET-FULL-04 | Microchip segue ISO 11784 (15 dígitos) | Padrão internacional |
| D-PET-FULL-05 | 5 novas subcoleções no Firestore | Separação por tipo de evento |
| D-PET-FULL-06 | Health records (vaccines) PRIVADO ao abrigo | LGPD — evitar expor |
| D-PET-FULL-07 | Public health record (whitelist) já existe | Manter para transparência |
| D-PET-FULL-08 | Tab Histórico com TODOS os eventos | "Todo o histórico do pet" |
| D-PET-FULL-09 | Adotantes anteriores visíveis (público) | Confiança para adotante |
| D-PET-FULL-10 | Devolução exige motivo ≥ 10 chars | Validação LGPD |
| D-PET-FULL-11 | Care log com próxima data calculada | UX — saber o que vem |
| D-PET-FULL-12 | Doses próximas aparecem em "alerta" | Saúde preventiva |
| D-PET-FULL-13 | A11y WCAG AA | Padrão plataforma |
| D-PET-FULL-14 | Dark mode | Padrão plataforma |
| D-PET-FULL-15 | Reduced motion | Padrão plataforma |

---

## 9. Pendências de Design

- [ ] Definir formato do RG nacional (ABRADOG? CNP? outro?)
- [ ] Definir se a aba "Histórico" inclui adotantes
- [ ] Validar regras de privacidade (adoção anterior pode ser sensível?)

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Schema migration quebra pets existentes | Tornar novos campos opcionais + fallback |
| Firestore rules deployment exige deploy manual | Documentar passo a passo |
| Performance com 5+ subcoleções | Cache 5min por hook, paginação |
| RG é dado sensível (LGPD) | Cifrar? Mostrar parcial (XXX-XXX-1234)? |
| Pet com 100+ eventos na timeline | Virtualização + paginação |
