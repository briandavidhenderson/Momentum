
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

async function createInventory() {
    const item = {
        name: "Conical Tubes 50ml",
        category: "Consumables",
        description: "Sterile 50ml conical tubes for cell culture",
        currentQuantity: 100,
        minQuantity: 20,
        unit: "pcs",
        inventoryLevel: "full",
        createdAt: new Date(),
        labId: "iNqwCp8LOG0yhIum7ggY" // From previous script output
    };

    const res = await db.collection('inventory').add(item);
    console.log(`Created inventory item: ${res.id}`);
}

createInventory();
