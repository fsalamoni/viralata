/**
 * .harness/_lock.cjs
 *
 * Módulo compartilhado de single-instance lock + atomic write.
 * Usado por autosync.cjs e sync.cjs para prevenir race conditions.
 *
 * TASK-300 — race condition fix: lock cross-platform + atomic write.
 *
 * Lock: fs.openSync(path, 'wx') — flag exclusiva, falha com EEXIST se existir.
 *   - Stale lock detection: se PID dentro do lock não existe, remove e retenta
 *   - Fail-open: se filesystem não suportar lock, prossegue (log warn)
 *
 * Atomic write: tmp file + fs.renameSync. Rename é atômico no mesmo FS.
 *   - tmp file com PID + timestamp no nome (evita colisão entre processos)
 *   - fsync antes do rename (garante flush pro disco)
 *   - cleanup do tmp em caso de erro
 */
'use strict';

const fs = require('fs');
const path = require('path');

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // existe mas sem permissão = vivo
  }
}

/**
 * Tenta adquirir lock single-instance.
 *
 * @param {string} lockPath - path do lock file
 * @param {boolean} [force=false] - se true, pula lock (debug only)
 * @returns {{acquired: boolean, holder?: number, reason?: string}}
 */
function acquireLock(lockPath, force = false) {
  if (force) {
    return { acquired: true, reason: 'FORCE flag set' };
  }

  const myPid = process.pid;

  for (let attempt = 0; attempt < 2; attempt++) {
    let fd;
    try {
      fd = fs.openSync(lockPath, 'wx'); // exclusivo: falha se existe
      const payload = JSON.stringify({ pid: myPid, startedAt: new Date().toISOString() });
      fs.writeSync(fd, payload);
      try { fs.fsyncSync(fd); } catch {} // best-effort
      fs.closeSync(fd);
      return { acquired: true };
    } catch (e) {
      if (fd) {
        try { fs.closeSync(fd); } catch {}
      }
      if (e.code !== 'EEXIST') {
        // Erro inesperado — fail-open com warning
        return { acquired: true, reason: `unexpected error ${e.code}` };
      }

      // Lock existe — verifica se é stale
      try {
        const content = fs.readFileSync(lockPath, 'utf8');
        const lockData = JSON.parse(content);
        if (lockData.pid && isPidAlive(lockData.pid)) {
          return { acquired: false, holder: lockData.pid };
        }
        // Stale lock: PID não existe mais
        try { fs.unlinkSync(lockPath); } catch {}
        continue;
      } catch {
        // Lock corrompido
        try { fs.unlinkSync(lockPath); } catch {}
        continue;
      }
    }
  }
  return { acquired: false, reason: 'max attempts reached' };
}

function releaseLock(lockPath) {
  try {
    const content = fs.readFileSync(lockPath, 'utf8');
    const lockData = JSON.parse(content);
    if (lockData.pid === process.pid) {
      fs.unlinkSync(lockPath);
    }
  } catch {
    // Lock não existe ou corrompido — ignora
  }
}

/**
 * Atomic write: tmp file + fs.renameSync.
 *
 * @param {string} targetPath
 * @param {string|Buffer} content
 */
function atomicWrite(targetPath, content) {
  const tmpPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`
  );
  let fd;
  try {
    fd = fs.openSync(tmpPath, 'w');
    fs.writeSync(fd, content);
    try { fs.fsyncSync(fd); } catch {} // best-effort
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmpPath, targetPath);
  } catch (e) {
    if (fd) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.unlinkSync(tmpPath); } catch {}
    throw e;
  }
}

module.exports = { acquireLock, releaseLock, atomicWrite, isPidAlive };
