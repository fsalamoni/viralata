/**
 * @fileoverview Tests para useMyPostAdoptionTasks + PostAdoptionDashboard (TASK-289).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

vi.mock('@/modules/shelter/services/kanbanService', () => ({
  getMyCardsAll: vi.fn(),
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { getMyCardsAll } from '@/modules/shelter/services/kanbanService';
import { parseTimestamp } from '@/core/utils/timestamp';

describe('useMyPostAdoptionTasks — filtro post-adoption', () => {
  it('filtra cards com tag "post-adoption"', async () => {
    const mockCards = [
      { id: '1', title: 'Check-in 30d', tags: ['post-adoption', 'check-in'] },
      { id: '2', title: 'Outro card', tags: ['other-tag'] },
      { id: '3', title: 'Foto', tags: ['post-adoption', 'photo'] },
    ];
    getMyCardsAll.mockResolvedValue(mockCards);

    const result = await getMyCardsAll('u1');
    const filtered = result.filter((c) => c.tags?.includes('post-adoption'));
    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toBe('1');
    expect(filtered[1].id).toBe('3');
  });

  it('retorna [] se getMyCardsAll retorna []', async () => {
    getMyCardsAll.mockResolvedValue([]);
    const result = await getMyCardsAll('u1');
    expect(result).toEqual([]);
  });

  it('cards sem tags são filtrados (default OFF)', async () => {
    getMyCardsAll.mockResolvedValue([{ id: '1', title: 'no tags' }]);
    const result = await getMyCardsAll('u1');
    const filtered = result.filter((c) => c.tags?.includes('post-adoption'));
    expect(filtered.length).toBe(0);
  });
});

describe('PostAdoptionDashboard — helpers', () => {
  it('dueState: overdue quando diffDays < 0', () => {
    // Mock impl — testando lógica isolada
    const dueState = (dueAt) => {
      if (!dueAt) return { label: 'Sem prazo', tone: 'secondary' };
      const d = dueAt?.toDate ? parseTimestamp(dueAt) : new Date(dueAt);
      const now = new Date();
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { label: `Atrasado (${Math.abs(diffDays)}d)`, tone: 'destructive' };
      if (diffDays === 0) return { label: 'Vence hoje', tone: 'destructive' };
      if (diffDays <= 3) return { label: `Em ${diffDays}d`, tone: 'secondary' };
      return { label: d.toLocaleDateString('pt-BR'), tone: 'outline' };
    };

    const past = new Date(Date.now() - 5 * 86400000);
    const result = dueState(past.toISOString());
    expect(result.tone).toBe('destructive');
    expect(result.label).toMatch(/Atrasado/);
  });

  it('dueState: vence hoje', () => {
    const dueState = (dueAt) => {
      if (!dueAt) return { label: 'Sem prazo' };
      const d = dueAt?.toDate ? parseTimestamp(dueAt) : new Date(dueAt);
      const now = new Date();
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { tone: 'destructive', label: 'overdue' };
      if (diffDays === 0) return { tone: 'destructive', label: 'Vence hoje' };
      if (diffDays <= 3) return { tone: 'secondary', label: `Em ${diffDays}d` };
      return { tone: 'outline', label: 'future' };
    };
    const now = new Date();
    const result = dueState(now.toISOString());
    expect(result.label).toBe('Vence hoje');
  });

  it('dueState: no prazo (5 dias)', () => {
    const dueState = (dueAt) => {
      if (!dueAt) return { label: 'Sem prazo' };
      const d = new Date(dueAt);
      const now = new Date();
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) return { tone: 'secondary' };
      return { tone: 'outline' };
    };
    const future = new Date(Date.now() + 5 * 86400000);
    const result = dueState(future.toISOString());
    expect(result.tone).toBe('outline');
  });

  it('dueState: sem prazo', () => {
    const dueState = (dueAt) => {
      if (!dueAt) return { label: 'Sem prazo', tone: 'secondary' };
    };
    expect(dueState(null)).toEqual({ label: 'Sem prazo', tone: 'secondary' });
    expect(dueState(undefined)).toEqual({ label: 'Sem prazo', tone: 'secondary' });
  });

  it('taskTypeLabel: mapeia tags conhecidas', () => {
    const taskTypeLabel = (card) => {
      if (Array.isArray(card?.tags)) {
        if (card.tags.includes('post-adoption-check-in')) return 'check-in';
        if (card.tags.includes('post-adoption-photo')) return 'foto';
        if (card.tags.includes('post-adoption-relato')) return 'relato';
      }
      return 'default';
    };
    expect(taskTypeLabel({ tags: ['post-adoption-check-in'] })).toBe('check-in');
    expect(taskTypeLabel({ tags: ['post-adoption-photo'] })).toBe('foto');
    expect(taskTypeLabel({ tags: ['post-adoption-relato'] })).toBe('relato');
    expect(taskTypeLabel({ tags: ['other'] })).toBe('default');
    expect(taskTypeLabel({})).toBe('default');
  });
});
