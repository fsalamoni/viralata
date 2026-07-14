// Simula o que o feed faz: getAvailablePets({limitCount: 500})
// sem filtro de city (sem radiusActive)
const fs = require('fs');
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/sa.json';
const { initializeApp, cert } = require('firebase-admin/app');
const { Firestore } = require('firebase-admin/firestore');
const sa = JSON.parse(fs.readFileSync('/tmp/sa.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = new Firestore({ databaseId: 'viralata' });

(async () => {
  // Same as getAvailablePets({limitCount: 500})
  const snap = await db.collection('pets')
    .where('status', '==', 'available')
    .orderBy('created_at', 'desc')
    .limit(500)
    .get();
  console.log('Total available pets (no city filter):', snap.size);
  for (const doc of snap.docs.slice(0, 10)) {
    const d = doc.data();
    console.log('  ' + doc.id + ' | ' + d.title + ' | ' + d.city + '/' + d.state + ' | ' + d.status);
  }
  process.exit(0);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
