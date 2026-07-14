// Use Firestore Admin SDK with service account directly
const fs = require('fs');
const path = require('path');

process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/sa.json';

(async () => {
  const { Firestore } = require('firebase-admin/firestore');
  const { initializeApp, cert, getApps } = require('firebase-admin/app');

  const sa = JSON.parse(fs.readFileSync('/tmp/sa.json', 'utf8'));
  if (getApps().length === 0) {
    initializeApp({ credential: cert(sa) });
  }
  const db = new Firestore({ databaseId: 'viralata' });

  const target = process.argv[2] || 'all';
  const collections = ['pets', 'users', 'communities', 'clubs'];
  const toList = target === 'all' ? collections : [target];

  for (const coll of toList) {
    const snap = await db.collection(coll).limit(15).get();
    console.log('\n=== ' + coll + ' (' + snap.size + ' shown) ===');
    for (const doc of snap.docs) {
      const data = doc.data();
      const name = data.title || data.name || data.display_name || '?';
      const status = data.status || '';
      const city = data.city || '';
      const state = data.state || '';
      const owner = data.owner_id || data.owner || '';
      console.log('  ' + doc.id + ' | ' + name + ' | ' + status + ' | ' + city + ' | ' + state + ' | ' + owner);
    }
  }

  process.exit(0);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
