/**
 * @fileoverview Gates de rota por persona COM escopo (lê o param da rota).
 *
 * O `PersonaGate` genérico não conhece os params da rota; estes wrappers
 * leem `:orgId` / `:communityId` via useParams e exigem que a persona ativa
 * seja a do abrigo/comunidade DAQUELE id — isolando a visão administrativa
 * por persona (Fatia C do §18).
 *
 * Segurança real continua nas Firestore rules; isto é isolamento de UX.
 * O `platform_admin` NUNCA é bloqueado (override dentro do PersonaGate).
 * Com a flag `V4_PERSONA_ENABLED` OFF, o PersonaGate é passthrough.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import PersonaGate from '@/components/guards/PersonaGate';
import { PERSONA_TYPE } from '@/core/domain/personas';

/** Exige persona `shelter_staff` do abrigo da rota (ou platform_admin). */
export function ShelterAdminGate({ children }) {
  const { orgId } = useParams();
  return (
    <PersonaGate
      require={(active) => active.type === PERSONA_TYPE.SHELTER_STAFF && active.scopeId === orgId}
    >
      {children}
    </PersonaGate>
  );
}

/** Exige persona `community_staff` da comunidade da rota (ou platform_admin). */
export function CommunityAdminGate({ children }) {
  const { communityId } = useParams();
  return (
    <PersonaGate
      require={(active) => active.type === PERSONA_TYPE.COMMUNITY_STAFF && active.scopeId === communityId}
    >
      {children}
    </PersonaGate>
  );
}

export default { ShelterAdminGate, CommunityAdminGate };
