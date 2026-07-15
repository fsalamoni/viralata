/**
 * Vitest config — functions/.
 *
 * O diretório `functions/` é a única parte do monorepo que
 * roda no Firebase Functions runtime (CommonJS, Node 20). Os
 * testes aqui não exercitam o runtime real — eles testam a
 * lógica pura extraída em módulos `*Core.js` (ex:
 * `securityAlertsCore.js`, `mockDataCore.js`). Como esses módulos só
 * dependem de `firebase-admin/firestore` (que pode não estar instalado
 * em CI), redirecionamos para um stub mínimo em
 * `__mocks__/*.cjs`.
 */

import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mocksDir = path.resolve(__dirname, '__mocks__');

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@core': path.resolve(__dirname, '../src/core'),
      '@modules': path.resolve(__dirname, '../src/modules'),
      'firebase-admin/firestore': path.join(mocksDir, 'firebase-admin-firestore.cjs'),
      'firebase-admin/app': path.join(mocksDir, 'firebase-admin-app.cjs'),
      'firebase-functions/v2/scheduler': path.join(mocksDir, 'firebase-functions-v2-scheduler.cjs'),
      'firebase-functions/v2/firestore': path.join(mocksDir, 'firebase-functions-v2-firestore.cjs'),
    },
  },
  test: {
    include: ['**/*.test.js'],
    environment: 'node',
  },
});
