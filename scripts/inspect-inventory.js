
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir);
const serviceAccountFile = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));
const serviceAccountPath = path.join(rootDir, serviceAccountFile);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspect() {
    const doc = await db.collection('inventory').doc('84aCv3XvuhgCGqCzD50J').get();
    console.log(JSON.stringify(doc.data(), null, 2));
}

inspect();
