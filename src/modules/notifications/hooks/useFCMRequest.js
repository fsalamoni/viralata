/**
 * @fileoverview useFCMRequest — requests FCM push permission after 1st relevant action.
 *
 * TASK-292: FCM v1 integration.
 *
 * Policy: NÃO pedir permissão no signup — isso é垃圾 (spam) e destruidor de confiança.
 * Em vez disso, pedimos permissão QUANDO o usuário faz uma ação que indica
 * que se importa com updates em tempo real:
 *   - Submete uma application de adoção
 *   - Recebe uma tarefa atribuída (kanban)
 *   - Se cadastra como voluntário
 *
 * A flag `fcmPermissionAsked` em localStorage impede que o modal seja
 * mostrado repetidamente. Once asked, never asked again (opt-out é o
 * caminho inverso: user vai nas configurações do browser).
 *
 * Feature flag: todas as operações são gated por SHELTER_FCM_V1.
 * Se a flag estiver OFF, o hook é no-op.
 *
 * @module useFCMRequest
 * @see TASK-292
 */

import { useCallback, useRef } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  registerFCMToken,
  isPushOptedOut,
  setupTokenRefresh,
} from '../services/fcmService';
import { logger } from '@/core/lib/logger';

const STORAGE_KEY_ASKED = 'viralata_fcm_permission_asked';

/**
 * Hook que expõe `requestPushIfAppropriate(uid)` — called after a
 * "relevant action" (não no signup).
 *
 * Não mostra notification permission banner/banner automático — o caller
 * decide como quer solicitar (toast, inline button, etc.).
 * O hook só faz o work de registrar o token.
 *
 * @returns {{ requestPushIfAppropriate: (uid: string) => Promise<void>, isEnabled: boolean }}
 */
export function useFCMRequest() {
  const isEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FCM_V1);
  const uidRef = useRef(null); // guarda uid entre calls
  const registeredRef = useRef(false);

  /**
   * Tenta registrar FCM push token para o uid fornecido.
   * Só executa se:
   *   1. Feature flag SHELTER_FCM_V1 está ON
   *   2. Ainda não foiasked nesta sessão
   *   3. Não está opted-out (Notification.permission === 'denied')
   *
   * @param {string} uid
   * @returns {Promise<void>}
   */
  const requestPushIfAppropriate = useCallback(
    async (uid) => {
      if (!isEnabled) return;
      if (!uid) return;
      uidRef.current = uid;

      // Já foi registrado nesta sessão — skip
      if (registeredRef.current) return;

      // localStorage: já pedimos nesta sessão
      if (localStorage.getItem(STORAGE_KEY_ASKED) === 'true') return;

      // Check opt-out (user bloqueou no passado)
      const optedOut = await isPushOptedOut();
      if (optedOut) {
        logger.info('[useFCMRequest] user opted out — skipping');
        localStorage.setItem(STORAGE_KEY_ASKED, 'true');
        return;
      }

      // Efetivamente pede permissão + registra token
      const result = await registerFCMToken(uid);

      if (result.ok) {
        logger.info('[useFCMRequest] FCM token registered:', result.token?.slice(0, 12) + '...');
        registeredRef.current = true;
        localStorage.setItem(STORAGE_KEY_ASKED, 'true');

        // Configura token refresh handler (sobrevive page reloads via SW)
        await setupTokenRefresh(uid);
      } else if (result.reason === 'permission_denied') {
        // User escolheu "não permitir" — marca como asked pra nunca mais pedir
        logger.info('[useFCMRequest] permission denied — marking as asked');
        localStorage.setItem(STORAGE_KEY_ASKED, 'true');
      } else {
        // Sem VAPID key, browser não suporta, etc. — tenta de novo na próxima ação
        logger.warn('[useFCMRequest] registration failed:', result.reason || result.error);
      }
    },
    [isEnabled],
  );

  return { requestPushIfAppropriate, isEnabled };
}
