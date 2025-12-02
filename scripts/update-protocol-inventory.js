
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

async function updateProtocol() {
    const protocolId = 'CatanXV32AofkpKnJHlV';

    // Find correct inventory item
    const snapshot = await db.collection('inventory').where('name', '==', 'Conical Tubes 50ml').get();

    if (snapshot.empty) {
        console.error('Inventory "Conical Tubes 50ml" still not found!');
        // Debug: list all names
        const all = await db.collection('inventory').get();
        all.forEach(d => console.log(d.data().name));
        return;
    }

    const inventoryId = snapshot.docs[0].id;
    console.log(`Found correct inventory ID: ${inventoryId}`);

    // Update protocol
    const protocolRef = db.collection('protocols').doc(protocolId);
    const protocolDoc = await protocolRef.get();

    if (!protocolDoc.exists) {
        console.error('Protocol not found');
        return;
    }

    const steps = protocolDoc.data().steps;
    // Update step 1
    steps[0].requiredReagents = [{
        id: inventoryId,
        name: "Conical Tubes 50ml",
        quantity: "1",
        unit: "tube"
    }];

    await protocolRef.update({ steps });
    console.log('Protocol updated successfully.');
}

updateProtocol();
