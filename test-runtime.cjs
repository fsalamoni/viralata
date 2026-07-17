process.chdir('/workspace/viralata');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://viralata.web.app/' });
const w = dom.window;
const rq = require('/workspace/viralata/node_modules/@tanstack/react-query');
const c = new rq.QueryClient();
const cache = c.getQueryCache();
console.log('cache type:', cache?.constructor?.name);
console.log('cache.get type:', typeof cache.get);
console.log('cache.onFocus type:', typeof cache.onFocus);
try { cache.get('test'); console.log('cache.get OK'); } catch (e) { console.log('cache.get FAILED:', e.message); }
try { cache.onFocus(); console.log('cache.onFocus OK'); } catch (e) { console.log('cache.onFocus FAILED:', e.message); }

// Verifica a versão do @tanstack
const pkg = require('/workspace/viralata/node_modules/@tanstack/react-query/package.json');
console.log('@tanstack/react-query version:', pkg.version);
const core = require('/workspace/viralata/node_modules/@tanstack/query-core/package.json');
console.log('@tanstack/query-core version:', core.version);

// Verifica se há dois query-core
const fs = require('fs');
const path = require('path');
function findQueryCore(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f === 'query-core' && fs.statSync(p).isDirectory()) found.push(p);
    else if (f !== 'node_modules' && fs.statSync(p).isDirectory()) findQueryCore(p, found);
  }
  return found;
}
const qcores = findQueryCore('/workspace/viralata/node_modules');
console.log('query-core copies:', qcores);
