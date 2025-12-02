
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function verifyInventory() {
    console.log('Querying inventory collection...');
    const snapshot = await db.collection('inventory').get();

    if (snapshot.empty) {
        console.log('No inventory items found.');
        return;
    }

    console.log(`Found ${snapshot.size} inventory items:`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}, Name: ${data.productName}, LabID: ${data.labId}, CreatedBy: ${data.createdBy}`);
    });
}

verifyInventory().catch(console.error);
