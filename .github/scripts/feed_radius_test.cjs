// Verifies the PetFeed defaults are in the source
const fs = require('fs');
const src = fs.readFileSync('src/modules/pets/pages/PetFeed.v1.jsx', 'utf8');
const tests = [
  { name: 'RADIUS_OPTIONS includes 50', re: /RADIUS_OPTIONS\s*=\s*\[[^\]]*50/ },
  { name: 'Default radius 50 (not 25)', re: /radius,\s*setRadius\]\s*=\s*useState\(\(\)\s*=>\s*\(userProfile\?\.city\s*\?\s*50/ },
  { name: 'Fallback radius 25 (no profile)', re: /userProfile\?\.city\s*\?\s*50\s*:\s*25/ },
  { name: 'Chip "Sem limite" exists', re: /Sem limite/ },
  { name: 'data-testid for "Sem limite" exists', re: /data-testid="feed-radius-all"/ },
  { name: 'Comment about TASK-401 / radius default', re: /TASK-401/ },
];
let pass = 0;
for (const t of tests) {
  if (t.re.test(src)) { console.log('  OK   ' + t.name); pass++; }
  else { console.log('  FAIL ' + t.name); }
}
console.log(`\n${pass}/${tests.length} checks passed`);
process.exit(pass === tests.length ? 0 : 1);
