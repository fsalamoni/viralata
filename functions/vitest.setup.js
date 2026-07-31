/**
 * Setup do Vitest para functions/.
 *
 * Alguns testes desta pasta foram escritos no estilo Jest e usam o
 * global `jest` (ex.: `jest.fn()`, `jest.clearAllMocks()`). A API do
 * `vi` do Vitest é compatível com esses usos, então expomos `jest`
 * como alias de `vi` para não precisar reescrever esses testes.
 */
import { vi } from 'vitest';

globalThis.jest = vi;
