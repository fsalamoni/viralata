const fs = require('fs');
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/sa.json';
const { initializeApp, cert } = require('firebase-admin/app');
const { Firestore } = require('firebase-admin/firestore');
const sa = JSON.parse(fs.readFileSync('/tmp/sa.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = new Firestore({ databaseId: 'viralata' });
(async () => {
  const all = await db.collection('pets').get();
  const byStatus = {};
  const byCity = {};
  for (const d of all.docs) {
    const s = d.data().status || '?';
    byStatus[s] = (byStatus[s] || 0) + 1;
    const c = (d.data().city || '?') + '/' + (d.data().state || '?');
    byCity[c] = (byCity[c] || 0) + 1;
  }
  console.log('Total pets:', all.size);
  console.log('By status:', JSON.stringify(byStatus));
  console.log('By city/state:', JSON.stringify(byCity));
  process.exit(0);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
