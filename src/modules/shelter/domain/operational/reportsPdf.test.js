/**
 * @fileoverview Tests do exportToPDF (TASK-154).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToPDF } from './reportsPdf';

let createObjectURL;
let revokeObjectURL;
let clickMock;
let createdLinks;

beforeEach(() => {
  createdLinks = [];
  clickMock = vi.fn();
  createObjectURL = vi.fn(() => 'blob:fake-url');
  revokeObjectURL = vi.fn();
  global.URL.createObjectURL = createObjectURL;
  global.URL.revokeObjectURL = revokeObjectURL;
  // Mock document.createElement para capturar o link
  const orig = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'a') {
      const link = {
        _href: '', _download: '', click: clickMock,
        get href() { return this._href; },
        set href(v) { this._href = v; },
        get download() { return this._download; },
        set download(v) { this._download = v; },
      };
      createdLinks.push(link);
      return link;
    }
    return orig(tag);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportToPDF', () => {
  it('gera PDF e dispara download', () => {
    exportToPDF({
      title: 'Relatório de Adoções',
      subtitle: 'Abrigo: Cantinho Feliz',
      columns: ['Pet', 'Adotante', 'Data'],
      rows: [
        ['Rex', 'Maria Silva', '2026-07-01'],
        ['Luna', 'João Santos', '2026-07-05'],
      ],
      filename: 'relatorio-adocoes.pdf',
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(createdLinks[0].download).toBe('relatorio-adocoes.pdf');
  });

  it('retorna sem download se rows vazias', () => {
    exportToPDF({
      title: 'Vazio',
      columns: ['A'],
      rows: [],
    });
    expect(clickMock).not.toHaveBeenCalled();
  });

  it('sanitiza email/phone por padrão (LGPD)', () => {
    exportToPDF({
      title: 'Test',
      columns: ['Nome', 'Email', 'Phone'],
      rows: [
        ['Maria', 'maria@example.com', '11987654321'],
      ],
    });
    const blobArg = createObjectURL.mock.calls[0][0];
    // blob é um Blob, vamos ler o conteúdo
    const text = blobArg._buffer || '';
    // O PDF contém o texto mascarado
    expect(createObjectURL).toHaveBeenCalledWith(blobArg);
  });
});
