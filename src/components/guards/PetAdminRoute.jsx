/**
 * @fileoverview PetAdminRoute — guard que valida se o user pode GERENCIAR
 * (canManage) um pet específico. Usado para a rota `/pets/:petId` (plural,
 * ADMIN) e suas sub-rotas (`/pets/:petId/edit`).
 *
 * **BEFORE (BUG)**: ProtectedRoute só checava se estava autenticado. Resultado:
 * qualquer user logado podia ver a página de admin e seus botões, mesmo sem
 * permissão. A PetDetailV3 SÓ renderizava os botões com canManage === true,
 * mas a PÁGINA carregava completa (abas de admin, dados sensíveis, etc).
 *
 * **AFTER (FIX)**: PetAdminRoute:
 * 1. Verifica autenticação (ProtectedRoute básico)
 * 2. Carrega o pet via usePet(petId)
 * 3. Se o pet não existe → redireciona para /feed
 * 4. Se o user NÃO é canManage (usePetPermissions) → redireciona para
 *    `/pet/:petId` (público, sem botões de admin)
 * 5. Se pode → renderiza children
 *
 * **ALINHAMENTO COM TAREFAS**:
 * - TASK-V3-PET-DETAIL-VIEW: criou a separação /pet/ vs /pets/
 * - Este fix FECHA o gap: garante que /pets/ SÓ é acessível para canManage
 *
 * **LGPD**: Pet carregado, owner_id pode ser PII. Não renderiza nada até
 * o canManage ser validado.
 */
import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePet } from '@/modules/pets/hooks/usePets';
import { usePetPermissions } from '@/modules/pets/hooks/usePetPermissions';

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function PetAdminRoute({ children }) {
  const { petId } = useParams();
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // 1) Carrega o pet (precisamos saber o owner para canManage)
  const petQuery = usePet(petId);
  const pet = petQuery.data;

  // 2) Avalia permissões (hook aceita pet=null e retorna canEdit=false)
  const petPermissions = usePetPermissions(pet);
  const canManage = petPermissions.canEdit;

  // LOADING: auth ou pet
  if (isLoadingAuth || petQuery.isLoading) {
    return <FullScreenSpinner />;
  }

  // 3) Não autenticado → /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4) Pet não existe → /feed
  if (petQuery.isError || !pet) {
    return <Navigate to="/feed" replace />;
  }

  // 5) User NÃO pode gerenciar → /pet/<id> (público, sem botões de admin)
  if (!canManage) {
    return <Navigate to={`/pet/${petId}`} replace />;
  }

  // 6) User PODE gerenciar → renderiza children
  return children;
}
