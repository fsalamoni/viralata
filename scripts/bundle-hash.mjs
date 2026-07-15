/**
 * @fileoverview Bundle hash script for TASK-239.
 *
 * Runs `vite build`, computes SHA-256 of each output JS chunk, and prints
 * a JSON summary useful for PR descriptions and smoke tests.
 *
 * Usage:
 *   node scripts/bundle-hash.mjs [--no-build]
 *
 * Output format (stdout):
 *   { totalBytes, chunks: [{name, size, sha256}], overallHash }
 *
 * Exit codes:
 *   0 = success, 1 = build failed, 2 = hash computation failed
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const DIST_DIR = 'dist';
const BUILD_SCRIPT = 'npm run build';
const SKIP_BUILD = process.argv.includes('--no-build');

/**
 * Compute SHA-256 hex of a file.
 */
function sha256(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Collect all .js files under a directory recursively.
 */
function collectJsFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return collectJsFiles(full);
      if (entry.name.endsWith('.js') && !entry.name.endsWith('.map.js')) {
        return [full];
      }
      return [];
    });
  } catch {
    return [];
  }
}

/**
 * Run vite build unless --no-build is passed.
 */
function runBuild() {
  if (SKIP_BUILD) {
    console.log('[bundle-hash] Skipping build (--no-build)');
    return true;
  }
  console.log('[bundle-hash] Running build...');
  const result = spawnSync('npm', ['run', 'build'], {
    shell: true,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('[bundle-hash] Build failed with exit code', result.status);
    process.exit(1);
  }
  return true;
}

/**
 * Main.
 */
function main() {
  runBuild();

  const chunks = [];
  let totalBytes = 0;

  const files = collectJsFiles(join(DIST_DIR, 'assets'));
  if (files.length === 0) {
    // Fallback: try root dist (SPA entry)
    const rootFiles = collectJsFiles(DIST_DIR).filter(
      (f) => !f.includes('/assets/')
    );
    rootFiles.forEach((f) => {
      const hash = sha256(f);
      const size = statSync(f).size;
      chunks.push({ name: relative(DIST_DIR, f), size, sha256: hash });
      totalBytes += size;
    });
  } else {
    files.forEach((f) => {
      try {
        const hash = sha256(f);
        const size = statSync(f).size;
        chunks.push({ name: relative(DIST_DIR, f), size, sha256: hash });
        totalBytes += size;
      } catch (err) {
        console.warn('[bundle-hash] Could not hash', f, err.message);
      }
    });
  }

  // Overall hash: hash of all chunk hashes sorted
  const overallHash = createHash('sha256')
    .update(chunks.map((c) => c.sha256).sort().join(''))
    .digest('hex')
    .slice(0, 16);

  const result = {
    timestamp: new Date().toISOString(),
    totalBytes,
    chunkCount: chunks.length,
    overallHash,
    chunks,
  };

  console.log('\n[bundle-hash] Result:');
  console.log(JSON.stringify(result, null, 2));

  // Write to .bundle-hash.json for PR automation to pick up
  try {
    writeFileSync('.bundle-hash.json', JSON.stringify(result, null, 2));
    console.log('[bundle-hash] Written .bundle-hash.json');
  } catch {
    // ignore if read-only env
  }
}

main();
