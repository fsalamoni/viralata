/**
 * @fileoverview Testes da Cloud Function Google Forms webhook.
 */

import { describe, it, expect, vi } from 'vitest';
import { processFormsWebhook, getGoogleFormsConfigByFormId } from './googleFormsWebhook';

const mockAdd = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
// Cada chamada de collection() retorna uma chain com doc() que também
// tem collection() e update(). Assim `db.collection('clubs').doc(c).collection('x').add(...)` funciona.
const makeDoc = () => ({
  collection: mockCollection,
  update: mockUpdate,
});
const mockCollection = vi.fn(() => ({
  add: mockAdd,
  doc: makeDoc,
  get: mockGet,
}));
const collectionGroupChain = {
  where: vi.fn(() => collectionGroupChain),
  limit: vi.fn(() => collectionGroupChain),
  get: mockGet,
};
const mockCollectionGroup = vi.fn(() => collectionGroupChain);
const mockDb = {
  collection: (...args) => mockCollection(...args),
  collectionGroup: (...args) => mockCollectionGroup(...args),
};

const sampleConfig = {
  field_map: {
    full_name: 'Nome',
    email: 'E-mail',
    reason_to_adopt: 'Por que quer adotar?',
    pet_id: 'Qual pet?',
    has_yard: 'Tem quintal?',
    household_size: 'Quantas pessoas na casa',
  },
};

const samplePayload = {
  form_id: 'form-abc',
  response_id: 'r-1',
  timestamp: '2026-07-10T12:00:00.000Z',
  responses: {
    'Nome': 'Maria Silva',
    'E-mail': 'maria@example.com',
    'Por que quer adotar?': 'Quero um amigo',
    'Qual pet?': 'pet-1',
    'Tem quintal?': 'Sim',
    'Quantas pessoas na casa': '3',
  },
  secret: 'a-very-long-secret-token-1234567890',
  shelter_club_id: 'c1',
};

describe('getGoogleFormsConfigByFormId', () => {
  it('retorna null se form_id não está configurado em lugar nenhum', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    expect(await getGoogleFormsConfigByFormId(mockDb, 'form-x')).toBeNull();
  });

  it('retorna config com shelter_club_id extraído do path', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{
        id: 'google_forms',
        ref: { path: 'clubs/club-abc/integrations/google_forms' },
        data: () => ({ form_id: 'form-x', enabled: true }),
      }],
    });
    const r = await getGoogleFormsConfigByFormId(mockDb, 'form-x');
    expect(r.shelter_club_id).toBe('club-abc');
    expect(r.form_id).toBe('form-x');
  });
});

describe('processFormsWebhook', () => {
  it('cria application + atualiza config metrics', async () => {
    mockAdd.mockResolvedValue({ id: 'app-new' });
    const r = await processFormsWebhook(mockDb, samplePayload, sampleConfig);
    expect(r.application_id).toBe('app-new');
    expect(r.status).toBe('applied');
    expect(mockAdd).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('lança se pet_id field não está nas responses', async () => {
    await expect(
      processFormsWebhook(mockDb, { ...samplePayload, responses: { Nome: 'X' } }, sampleConfig),
    ).rejects.toThrow(/não encontrado/);
  });

  it('lança se field_map não tem pet_id', async () => {
    await expect(
      processFormsWebhook(mockDb, samplePayload, { field_map: {} }),
    ).rejects.toThrow(/pet_id/);
  });

  it('converte boolean do Forms para applicant_form', async () => {
    mockAdd.mockResolvedValue({ id: 'app-new' });
    await processFormsWebhook(mockDb, samplePayload, sampleConfig);
    const callArgs = mockAdd.mock.calls[0][0];
    expect(callArgs.applicant_form.has_yard).toBe(true);
    expect(callArgs.applicant_form.full_name).toBe('Maria Silva');
    expect(callArgs.applicant_form.household_size).toBe(3);
    expect(callArgs.applicant_form.email).toBe('maria@example.com');
  });

  it('gera applicant_uid determinístico baseado em hash do email', async () => {
    mockAdd.mockResolvedValue({ id: 'app-new' });
    await processFormsWebhook(mockDb, samplePayload, sampleConfig);
    const callArgs = mockAdd.mock.calls[0][0];
    expect(callArgs.applicant_uid).toMatch(/^gforms_[a-f0-9]{28}$/);
    expect(callArgs.source).toBe('google_forms');
    expect(callArgs.google_forms_response_id).toBe('r-1');
  });
});
