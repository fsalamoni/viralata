/**
 * @fileoverview useVolunteerCertificate — hook que gera e baixa o
 * certificado de horas de voluntariado (TASK-248).
 *
 * Conformidade: Lei 9.608/1998 (Lei do Voluntariado) + termo v2 §6.1(e).
 *
 * Usage:
 *   const cert = useVolunteerCertificate({ uid, fromDate, toDate });
 *   // cert.mutate() → baixa o PDF
 *
 * O hook usa React Query mutation para caching + feedback de loading/error.
 */

import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

/**
 * Baixa um PDF a partir de uma URL ou base64 data URI.
 * @param {string} url - downloadUrl ou data URI
 * @param {string} filename - nome do arquivo
 */
function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const FUNCTION_NAME = 'generateVolunteerCertificate';

let _callable = null;
function getCallable() {
  if (!functions) {
    throw new Error('Firebase Functions não inicializado. Verifique a configuração.');
  }
  if (!_callable) {
    _callable = httpsCallable(functions, FUNCTION_NAME);
  }
  return _callable;
}

/**
 * @param {object} options
 * @param {string} options.uid
 * @param {string} [options.fromDate]  - YYYY-MM-DD, default 1 year ago
 * @param {string} [options.toDate]    - YYYY-MM-DD, default today
 * @returns {object} - React Query mutation
 */
export function useVolunteerCertificate({ uid, fromDate, toDate } = {}) {
  return useMutation({
    mutationFn: async ({ targetUid, overrideFromDate, overrideToDate } = {}) => {
      const callable = getCallable();
      const resolvedUid = targetUid || uid;
      if (!resolvedUid) {
        throw new Error('uid é obrigatório para gerar o certificado.');
      }

      const payload = {
        uid: resolvedUid,
        fromDate: overrideFromDate || fromDate,
        toDate: overrideToDate || toDate,
      };

      const result = await callable(payload);
      return result.data || result;
    },

    onSuccess: (data) => {
      logger.info('useVolunteerCertificate: success', {
        totalHours: data?.totalHours,
        storagePath: data?.storagePath,
      });
    },

    onError: (err) => {
      logger.error('useVolunteerCertificate: error', { error: String(err) });
    },
  });
}

/**
 * Helper utilitário: gera e baixa o certificado com feedback de loading.
 *
 * @param {object} opts
 * @param {string} opts.uid
 * @param {string} [opts.fromDate]
 * @param {string} [opts.toDate]
 * @param {Function} opts.onLoading  - callback enquanto gerando (bool)
 * @param {Function} opts.onError   - callback em erro (Error)
 * @param {Function} opts.onSuccess - callback em sucesso
 * @returns {Function} - callable como onClick
 *
 * @example
 *   const downloadCert = useDownloadCertificate({ uid: user.uid });
 *   <Button onClick={() => downloadCert()}>Baixar certificado</Button>
 */
export function useDownloadCertificate({ uid, fromDate, toDate, onLoading, onError, onSuccess } = {}) {
  const mutation = useVolunteerCertificate({ uid, fromDate, toDate });

  return async (options = {}) => {
    try {
      if (onLoading) onLoading(true);
      const data = await mutation.mutateAsync(options);
      const filename = `certificado-viralata-${new Date().toISOString().slice(0, 10)}.pdf`;
      triggerDownload(data.downloadUrl, filename);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      if (onError) onError(err);
    } finally {
      if (onLoading) onLoading(false);
    }
  };
}
