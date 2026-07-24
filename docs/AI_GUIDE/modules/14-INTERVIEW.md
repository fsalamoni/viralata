# Module 14 — Interview (Entrevistas de Adoção)

> Sistema de entrevistas entre ONGs e adotantes antes da adoção.

## §1. Visão Geral

**Path**: `src/modules/interview/`
**Linhas**: ~1000
**Tests**: ~10

## §2. Funcionalidades

### §2.1. Lista de entrevistas (shelter)

- `/abrigo/entrevistas`
- Pendentes, em andamento, concluídas

### §2.2. Detalhe de entrevista

- Respostas do adotante (do wizard de adoção)
- Notas do admin
- Aceitar/rejeitar

### §2.3. Questionário

- Definido pela ONG (custom)
- Respostas em `interviews/{interviewId}.answers`

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `ShelterInterviewsList.jsx` | Lista |
| `InterviewDetail.jsx` | Detalhe |
| `InterviewForm.jsx` | Form |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `interviewService.js` (em shelter) | CRUD |
| `interviewPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useInterviews` | Lista |
| `useInterview` | Query |
| `useUpdateInterview` | Mutation |

## §6. Schema

```typescript
interviews/{interviewId} {
  interest_id: string,  // link para interest
  pet_id: string,
  adopter_uid: string,
  shelter_id: string,
  questions: [{ id, text, type }],
  answers: [{ question_id, value }],
  notes: string?,
  status: 'pending' | 'in_progress' | 'approved' | 'rejected',
  interviewer_uid: string?,
  scheduled_at: timestamp?,
  completed_at: timestamp?,
  created_at: timestamp,
  updated_at: timestamp,
}
```

---

**Próximo módulo**: `modules/15-ONBOARDING.md`
