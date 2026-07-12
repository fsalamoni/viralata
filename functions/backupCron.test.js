/**
 * @fileoverview Testes do backupCronCore (TASK-240).
 *
 * O Cloud Function `scheduledFirestoreBackup` é testado indiretamente
 * via `runScheduledBackup` (núcleo puro, sem dependência de
 * `firebase-functions/v1` pubsub).
 *
 * Estratégia de mock:
 *   - `db` e `client` são injetados (não usamos `vi.mock`).
 *   - `fieldValue.serverTimestamp` é injetado como `vi.fn()`.
 *   - O `client.exportDocuments` é mockado para devolver uma
 *     `operation` com `name` ou `null`.
 *   - O `db.collection('backup_log').add(...)` é mockado e
 *     capturado para asserções.
 *
 * @see backupCronCore.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_BUCKET,
  folderNameForDate,
  buildOutputUri,
  buildBackupLogEntry,
  runScheduledBackup,
} from './backupCronCore';

const mockAdd = vi.fn();
const mockCollection = vi.fn(() => ({ add: mockAdd }));

const mockDb = {
  collection: mockCollection,
};

const mockServerTimestamp = vi.fn(() => ({ __serverTimestamp: true, ms: Date.now() }));
const mockFieldValue = { serverTimestamp: mockServerTimestamp };

const mockOperationSuccess = { name: 'projects/p/databases/(default)/operations/op-123' };
const mockExportDocuments = vi.fn();
const mockClient = {
  exportDocuments: mockExportDocuments,
};

const makeLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

beforeEach(() => {
  mockAdd.mockReset();
  mockCollection.mockReset();
  mockServerTimestamp.mockReset();
  mockExportDocuments.mockReset();
  mockCollection.mockImplementation(() => ({ add: mockAdd }));
  mockServerTimestamp.mockImplementation(() => ({ __serverTimestamp: true, ms: Date.now() }));
  mockAdd.mockResolvedValue({ id: 'backup-log-1' });
});

describe('backupCronCore — folderNameForDate', () => {
  it('formata YYYY-MM-DD/', () => {
    const d = new Date('2026-07-12T05:00:00.000Z');
    expect(folderNameForDate(d)).toBe('2026-07-12/');
  });

  it('formata corretamente em UTC mesmo se Date.now() é local', () => {
    const d = new Date(0); // 1970-01-01T00:00:00.000Z
    expect(folderNameForDate(d)).toBe('1970-01-01/');
  });

  it('default = new Date()', () => {
    const result = folderNameForDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}\/$/);
  });
});

describe('backupCronCore — buildOutputUri', () => {
  it('monta gs://<bucket>/<folder>/', () => {
    expect(buildOutputUri('viralata-backups', '2026-07-12/')).toBe('gs://viralata-backups/2026-07-12/');
  });

  it('aceita bucket customizado via env', () => {
    expect(buildOutputUri('custom-bucket', '2026-07-12/')).toBe('gs://custom-bucket/2026-07-12/');
  });
});

describe('backupCronCore — buildBackupLogEntry', () => {
  it('monta entry de sucesso (in_progress) com todos os campos', () => {
    const e = buildBackupLogEntry({
      date: '2026-07-12',
      operationName: 'projects/p/operations/1',
      bucket: 'viralata-backups',
      folder: '2026-07-12/',
      status: 'in_progress',
      serverTimestamp: mockServerTimestamp,
    });
    expect(e).toEqual({
      date: '2026-07-12',
      operation_name: 'projects/p/operations/1',
      bucket: 'viralata-backups',
      folder: '2026-07-12/',
      started_at: { __serverTimestamp: true, ms: expect.any(Number) },
      status: 'in_progress',
    });
  });

  it('inclui error quando fornecido (status=failed)', () => {
    const e = buildBackupLogEntry({
      date: '2026-07-12',
      operationName: null,
      bucket: 'viralata-backups',
      folder: '2026-07-12/',
      status: 'failed',
      error: 'PERMISSION_DENIED',
      serverTimestamp: mockServerTimestamp,
    });
    expect(e.status).toBe('failed');
    expect(e.error).toBe('PERMISSION_DENIED');
  });

  it('omite error quando null/undefined (sucesso)', () => {
    const e = buildBackupLogEntry({
      date: '2026-07-12',
      operationName: 'op',
      bucket: 'b',
      folder: '2026-07-12/',
      status: 'in_progress',
      serverTimestamp: mockServerTimestamp,
    });
    expect('error' in e).toBe(false);
  });
});

describe('backupCronCore — runScheduledBackup', () => {
  it('chama client.exportDocuments com outputUri correto', async () => {
    mockExportDocuments.mockResolvedValue([mockOperationSuccess]);
    const logger = makeLogger();
    const now = new Date('2026-07-12T05:00:00.000Z');

    const result = await runScheduledBackup({
      db: mockDb,
      client: mockClient,
      projectId: 'viralata-prod',
      bucketName: 'viralata-backups',
      now,
      fieldValue: mockFieldValue,
      logger,
    });

    expect(mockExportDocuments).toHaveBeenCalledWith({
      name: 'projects/viralata-prod/databases/(default)',
      outputUriPrefix: 'gs://viralata-backups/2026-07-12/',
      collectionIds: [],
    });
    expect(result).toEqual({
      date: '2026-07-12',
      operationName: 'projects/p/databases/(default)/operations/op-123',
      bucket: 'viralata-backups',
      folder: '2026-07-12/',
    });
  });

  it('registra backup_log com status=in_progress no caminho feliz', async () => {
    mockExportDocuments.mockResolvedValue([mockOperationSuccess]);
    const logger = makeLogger();

    await runScheduledBackup({
      db: mockDb,
      client: mockClient,
      projectId: 'viralata-prod',
      bucketName: 'viralata-backups',
      fieldValue: mockFieldValue,
      logger,
    });

    expect(mockCollection).toHaveBeenCalledWith('backup_log');
    expect(mockAdd).toHaveBeenCalledTimes(1);
    const entry = mockAdd.mock.calls[0][0];
    expect(entry.status).toBe('in_progress');
    expect(entry.operation_name).toBe('projects/p/databases/(default)/operations/op-123');
    expect(entry.bucket).toBe('viralata-backups');
    expect(entry.folder).toMatch(/^\d{4}-\d{2}-\d{2}\/$/);
  });

  it('usa DEFAULT_BUCKET quando bucketName não é fornecido', async () => {
    mockExportDocuments.mockResolvedValue([{ name: 'op-x' }]);
    await runScheduledBackup({
      db: mockDb,
      client: mockClient,
      projectId: 'p',
      fieldValue: mockFieldValue,
      logger: makeLogger(),
    });
    const callArgs = mockExportDocuments.mock.calls[0][0];
    expect(callArgs.outputUriPrefix).toMatch(new RegExp(`^gs://${DEFAULT_BUCKET}/\\d{4}-\\d{2}-\\d{2}/$`));
  });

  it('em caso de falha do export, registra backup_log failed e relança o erro', async () => {
    const exportErr = new Error('PERMISSION_DENIED: bucket not found');
    mockExportDocuments.mockRejectedValue(exportErr);
    const logger = makeLogger();

    await expect(
      runScheduledBackup({
        db: mockDb,
        client: mockClient,
        projectId: 'p',
        bucketName: 'b',
        fieldValue: mockFieldValue,
        logger,
      }),
    ).rejects.toThrow('PERMISSION_DENIED: bucket not found');

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const entry = mockAdd.mock.calls[0][0];
    expect(entry.status).toBe('failed');
    expect(entry.error).toContain('PERMISSION_DENIED');
    expect(entry.operation_name).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it('se db.collection().add() falhar no caminho feliz, NÃO relança (export foi disparado)', async () => {
    mockExportDocuments.mockResolvedValue([{ name: 'op-x' }]);
    mockAdd.mockRejectedValue(new Error('firestore quota exceeded'));
    const logger = makeLogger();

    const result = await runScheduledBackup({
      db: mockDb,
      client: mockClient,
      projectId: 'p',
      bucketName: 'b',
      fieldValue: mockFieldValue,
      logger,
    });

    expect(result.operationName).toBe('op-x');
    expect(logger.error).toHaveBeenCalledWith(
      'scheduledFirestoreBackup: failed to write backup_log (in_progress)',
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it('se db.collection().add() falhar no caminho failed, NÃO mascara o erro original', async () => {
    const exportErr = new Error('EXPORT_FAILED');
    mockExportDocuments.mockRejectedValue(exportErr);
    // First call to add() (in failure path) — reject
    mockAdd.mockRejectedValue(new Error('cannot write log'));

    await expect(
      runScheduledBackup({
        db: mockDb,
        client: mockClient,
        projectId: 'p',
        bucketName: 'b',
        fieldValue: mockFieldValue,
        logger: makeLogger(),
      }),
    ).rejects.toThrow('EXPORT_FAILED');

    // We attempted to log the failure once, and the error was caught + logged.
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('lida com operation.name ausente sem quebrar', async () => {
    mockExportDocuments.mockResolvedValue([{}]);
    const logger = makeLogger();

    const result = await runScheduledBackup({
      db: mockDb,
      client: mockClient,
      projectId: 'p',
      bucketName: 'b',
      fieldValue: mockFieldValue,
      logger,
    });

    expect(result.operationName).toBeNull();
    const entry = mockAdd.mock.calls[0][0];
    expect(entry.operation_name).toBeNull();
  });
});
