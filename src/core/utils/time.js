/**
 * @fileoverview Helpers de formatação de tempo (TASK-126).
 */

/**
 * Formata uma data ISO ou Timestamp em string relativa (ex: "2 dias atrás").
 *
 * @param {string|number|Date|object} dateLike
 * @returns {string}
 */
export function formatRelativeTime(dateLike) {
  if (!dateLike) return '—';
  let date;
  if (typeof dateLike === 'string') {
    date = new Date(dateLike);
  } else if (dateLike?.toDate) {
    date = dateLike.toDate();
  } else if (dateLike instanceof Date) {
    date = dateLike;
  } else {
    return '—';
  }
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (Math.abs(diffSec) < 60) return 'agora';

  const diffMin = Math.floor(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return diffMin > 0 ? `há ${diffMin} min` : `em ${-diffMin} min`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (Math.abs(diffHour) < 24) {
    return diffHour > 0 ? `há ${diffHour}h` : `em ${-diffHour}h`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (Math.abs(diffDay) < 30) {
    return diffDay > 0 ? `há ${diffDay} dia${diffDay > 1 ? 's' : ''}` : `em ${-diffDay} dias`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (Math.abs(diffMonth) < 12) {
    return diffMonth > 0 ? `há ${diffMonth} ${diffMonth > 1 ? 'meses' : 'mês'}` : `em ${-diffMonth} meses`;
  }

  const diffYear = Math.floor(diffDay / 365);
  return diffYear > 0 ? `há ${diffYear} ${diffYear > 1 ? 'anos' : 'ano'}` : `em ${-diffYear} anos`;
}
