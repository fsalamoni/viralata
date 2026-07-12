/**
 * @fileoverview Agregações client-side para o dashboard de métricas do Super Admin.
 * Sem agregação no servidor — coleções pequenas o suficiente para reduzir no client
 * (mesmo padrão já usado em `petService.recalculatePriorityScores`).
 */
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Agrupa uma lista de documentos por mês (últimos `months` meses) de um campo de data. */
export function groupByMonth(docs, dateField, months = 6, now = new Date()) {
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: monthKey(d), label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), count: 0 });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.month, b]));
  (docs || []).forEach((entry) => {
    const date = toDate(entry?.[dateField]);
    if (!date) return;
    const bucket = byKey[monthKey(date)];
    if (bucket) bucket.count += 1;
  });
  return buckets;
}

/**
 * TASK-172: agrupa por dia dentro de uma janela de N dias — usado
 * pelas janelas 30/90 dias do AdminMetrics (por mês seria grosseiro).
 */
export function groupByDay(docs, dateField, days = 30, now = new Date()) {
  const buckets = [];
  const dayKey = (d) => d.toISOString().slice(0, 10);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({
      day: dayKey(d),
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      count: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.day, b]));
  (docs || []).forEach((entry) => {
    const date = toDate(entry?.[dateField]);
    if (!date) return;
    const bucket = byKey[dayKey(date)];
    if (bucket) bucket.count += 1;
  });
  return buckets;
}

/** Agrupa uma lista de documentos por um campo categórico (ex.: estado), do maior para o menor. */
export function groupByField(docs, field, limitCount = 10) {
  const counts = {};
  (docs || []).forEach((entry) => {
    const value = String(entry?.[field] || 'Não informado').trim() || 'Não informado';
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limitCount);
}

/** Busca os dados brutos usados pelo dashboard de métricas. */
export async function fetchMetricsData() {
  if (!db) return { pets: [], users: [], reports: [] };
  const [petsSnap, usersSnap, reportsSnap] = await Promise.all([
    getDocs(collection(db, 'pets')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'abuse_reports')),
  ]);
  return {
    pets: petsSnap.docs.map((d) => d.data()),
    users: usersSnap.docs.map((d) => d.data()),
    reports: reportsSnap.docs.map((d) => d.data()),
  };
}
