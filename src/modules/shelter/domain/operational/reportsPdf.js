/**
 * @fileoverview exportToPDF — geração de PDF minimalista sem dependências
 * externas (TASK-154).
 *
 * **Por que sem dependência?** Manter bundle pequeno. jsPDF+jspdf-autotable
 * adicionaria ~150KB. Para relatórios simples de abrigo, PDF cru formatado
 * em texto monoespaçado é suficiente.
 *
 * **Formato**: PDF 1.4 com tabelas ASCII desenhadas com box-drawing
 * characters. Tamanho A4 retrato.
 *
 * **Alternativa futura**: substituir por jsPDF quando relatórios exigirem
 * gráficos/imagens.
 *
 * **LGPD compliance**: aplica sanitizePiiForReport (adopters que pediram
 * exclusão viram "[REMOVIDO]").
 */

import { sanitizePiiForReport } from '@/core/services/reportSanitizer';

/**
 * @param {object} options
 * @param {string} options.title - título do relatório
 * @param {string} [options.subtitle] - subtítulo (período, abrigo)
 * @param {object[][]} options.rows - array de linhas, cada linha = [col1, col2, ...]
 * @param {string[]} options.columns - nomes das colunas
 * @param {string} [options.filename] - nome do arquivo (default: relatorio.pdf)
 * @param {boolean} [options.sanitize] - aplicar LGPD sanitize (default: true)
 */
export function exportToPDF({ title, subtitle, rows, columns, filename = 'relatorio.pdf', sanitize = true }) {
  // Early return se vazio
  if (!rows || rows.length === 0) return;

  // Sanitiza dados (LGPD)
  let dataRows = rows;
  if (sanitize) {
    dataRows = rows.map((row) => row.map((cell) => {
      if (cell && typeof cell === 'object' && cell.uid) {
        return sanitizePiiForReport(cell);
      }
      if (typeof cell === 'string' && cell.includes('@')) {
        return sanitizePiiForReport({ email: cell });
      }
      return cell;
    }));
  }

  // Largura das colunas
  const colWidths = columns.map((col, i) => {
    const maxContentLen = Math.max(
      col.length,
      ...dataRows.map((row) => String(row[i] ?? '').length)
    );
    return Math.min(Math.max(maxContentLen, 8), 30);
  });

  // Helper: linha ASCII
  function makeBorder(char = '-') {
    return '+' + colWidths.map((w) => char.repeat(w + 2)).join('+') + '+';
  }
  function makeRow(values) {
    return '| ' + values.map((v, i) => {
      const s = String(v ?? '').slice(0, colWidths[i]);
      return s.padEnd(colWidths[i]);
    }).join(' | ') + ' |';
  }
  function makeHeader(values) {
    return '| ' + values.map((v, i) => {
      return String(v).padEnd(colWidths[i]);
    }).join(' | ') + ' |';
  }

  // Monta o conteúdo
  const lines = [];
  lines.push(title);
  if (subtitle) lines.push(subtitle);
  lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  lines.push(`Total de registros: ${dataRows.length}`);
  lines.push('');
  lines.push(makeBorder('='));
  lines.push(makeHeader(columns));
  lines.push(makeBorder('='));
  for (const row of dataRows) {
    lines.push(makeRow(row));
  }
  lines.push(makeBorder('='));
  const text = lines.join('\n');

  // Gera PDF minimalista (1 página, A4)
  const pdf = buildMinimalPdf(text);
  download(pdf, filename);
}

function buildMinimalPdf(text) {
  // PDF 1.4 — formato de texto cru
  // Estrutura: header + body (com content stream BT/ET) + trailer
  const lines = text.split('\n');
  const fontSize = 8;
  const lineHeight = fontSize * 1.2;
  const pageHeight = 842; // A4 portrait em pontos (1pt = 1/72 inch)
  const pageWidth = 595;
  const marginTop = 50;
  const marginLeft = 40;
  const linesPerPage = Math.floor((pageHeight - marginTop * 2) / lineHeight);

  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const pageLines = lines.slice(i, i + linesPerPage);
    let y = pageHeight - marginTop;
    const lineCmds = pageLines.map((line) => {
      // Escapa parênteses e barras (PDF literal string)
      const safe = line
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
      const cmd = `BT /F1 ${fontSize} Tf ${marginLeft} ${y} Td (${safe}) Tj ET`;
      y -= lineHeight;
      return cmd;
    }).join('\n');

    pages.push({
      objects: [
        // 1. Catalog
        '<< /Type /Catalog /Pages 2 0 R >>',
        // 2. Pages
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        // 3. Page
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        // 4. Content stream
        `<< /Length ${lineCmds.length} >>\nstream\n${lineCmds}\nendstream`,
        // 5. Font
        '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
      ],
    });
  }

  // Monta o PDF
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  let objectNum = 1;
  for (const page of pages) {
    for (const obj of page.objects) {
      offsets[objectNum] = pdf.length;
      pdf += `${objectNum} 0 obj\n${obj}\nendobj\n`;
      objectNum++;
    }
  }
  // xref
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objectNum}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objectNum; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  // trailer
  pdf += `trailer\n<< /Size ${objectNum} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

function download(content, filename) {
  const blob = new Blob([content], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
