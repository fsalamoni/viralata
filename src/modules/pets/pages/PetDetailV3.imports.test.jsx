/**
 * @fileoverview PetDetailV3.imports.test.jsx — Validação que TODOS os ícones
 * do lucide-react usados em PetDetailV3 estão importados.
 *
 * TASK-V3-PET-OPS-LOG-08 (sw-v72.5): bug recorrente. O user reportou que
 * "MessageSquare is not defined" quebrou a página de pet. Este teste
 * pega esse bug em CI/build, não em produção.
 *
 * D-PET-OPS-LUCIDE-IMPORT-TEST: para CADA página crítica V3, deve existir
 * um teste que valida imports de ícones.
 *
 * D-PET-OPS-LUCIDE-IMPORT-TEST: para CADA página crítica V3, deve existir
 * um teste que valida imports de ícones.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(__dirname, 'PetDetailV3.jsx');
const CONTENT = fs.readFileSync(FILE, 'utf-8');

function extractLucideImports(src) {
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
  const set = new Set();
  let m;
  while ((m = re.exec(src)) !== null) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    names.forEach((n) => set.add(n));
  }
  return set;
}

function extractUsedIcons(src) {
  // <X ... /> ou <X>...</X>
  const re = /<([A-Z][A-Za-z0-9]+)(?:\s|\/?>)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(src)) !== null) set.add(m[1]);
  return set;
}

// Componentes do projeto que NÃO são ícones do lucide
const PROJECT_COMPONENTS = new Set([
  'Badge', 'Link', 'Table', 'Button', 'Input', 'Tabs', 'Dialog', 'Toast', 'Form',
  'Avatar', 'Card', 'Switch', 'Checkbox', 'Label', 'Select', 'Skeleton', 'Popover',
  'DropdownMenu', 'Tooltip', 'EmptyState', 'Sonner', 'Toaster',
  'PetNotes', 'PetLog', 'PetTimelineView', 'PetsOpsTable',
]);

// Subset de ícones conhecidos do lucide-react (atualize se necessário)
const KNOWN_LUCIDE_ICONS = new Set([
  'Activity', 'AlertCircle', 'ArrowLeft', 'ArrowRight', 'Bath', 'Calendar',
  'CheckCircle', 'ChevronLeft', 'ChevronRight', 'Circle', 'Clock', 'Edit',
  'ExternalLink', 'Eye', 'FileText', 'Hash', 'Heart', 'HeartHandshake', 'History',
  'Info', 'ListChecks', 'Loader2', 'MapPin', 'MessageCircle', 'MessageSquare',
  'PawPrint', 'Pill', 'Plus', 'RotateCcw', 'Send', 'Share2', 'Sparkles', 'Stethoscope',
  'Trash2', 'User', 'Users', 'X',
]);

describe('PetDetailV3 — lucide-react imports', () => {
  it('has lucide-react import', () => {
    expect(CONTENT).toMatch(/from\s+['"]lucide-react['"]/);
  });

  it('uses only icons that are imported', () => {
    const imported = extractLucideImports(CONTENT);
    const used = extractUsedIcons(CONTENT);
    const missing = [];
    for (const name of used) {
      if (PROJECT_COMPONENTS.has(name)) continue;
      if (!KNOWN_LUCIDE_ICONS.has(name)) continue; // unknown = pode ser do projeto
      if (!imported.has(name)) {
        missing.push(name);
      }
    }
    expect(missing, `Missing icon imports: ${missing.join(', ')}`).toEqual([]);
  });

  it('MessageSquare is imported (regression for bug sw-v72.5)', () => {
    const imported = extractLucideImports(CONTENT);
    expect(imported.has('MessageSquare')).toBe(true);
  });

  it('MessageSquare is used (ensures test is meaningful)', () => {
    // Garante que MessageSquare é de fato usado no JSX
    const used = extractUsedIcons(CONTENT);
    expect(used.has('MessageSquare')).toBe(true);
  });
});
