// Shim for scrum.cjs that injects proper-lockfile from /tmp/sc
// Usage: node .harness/_scrum-shim.cjs <args>
const Module = require('module');
const orig = Module.prototype.require;
Module.prototype.require = function(name) {
  if (name === 'proper-lockfile') {
    return require('/tmp/sc/node_modules/proper-lockfile');
  }
  return orig.apply(this, arguments);
};
require('/workspace/viralata/.harness/scrum.cjs');
