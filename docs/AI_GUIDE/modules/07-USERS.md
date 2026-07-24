# Module 07 — Users (Perfil, Auth)

> Perfil do usuário + autenticação via Google OAuth.

## §1. Visão Geral

**Path**: `src/modules/users/`
**Linhas**: ~1500
**Tests**: ~30

## §2. Funcionalidades

### §2.1. Auth

- Google OAuth (Firebase Auth)
- Cadastro
- Login
- Recuperação de senha
- Aceites de termos (LGPD)

### §2.2. Perfil (`/perfil`)

- Foto, nome, email
- Cidade, estado
- Bio
- Pets do user

### §2.3. Editar perfil (`/perfil/editar`)

- Form com validação Zod

### §2.4. Preferências (`/preferencias`)

- UI (tema, idioma)
- Notificações
- Privacidade

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `Login.jsx` | Login |
| `Signup.jsx` | Cadastro |
| `ForgotPassword.jsx` | Recuperar senha |
| `Profile.jsx` | Perfil |
| `ProfileEdit.jsx` | Editar perfil |
| `Preferences.jsx` | Preferências |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `userService.js` | CRUD de user |
| `authService.js` | Auth |
| `termsService.js` | Aceites de termos |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useAuth` (core) | User atual |
| `useUser` | Query |
| `useUpdateUser` | Mutation |
| `useAcceptTerms` | Mutation de aceite |

## §6. Schema

Ver `02-DATA-MODEL.md` §2.1.

---

**Próximo módulo**: `modules/08-CHAT.md`
