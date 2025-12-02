
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const fs = require('fs');
const path = require('path');

// --- Initialization ---
// Find the service account key in the root directory (one level up from scripts)
const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir);
const serviceAccountFile = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));

if (!serviceAccountFile) {
    console.error('❌ Error: Service account key not found in root.');
    process.exit(1);
}

const serviceAccountPath = path.join(rootDir, serviceAccountFile);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = getFirestore();

async function createProtocol() {
    try {
        console.log('Creating protocol...');

        // 1. Get Equipment and Inventory IDs
        const equipmentSnapshot = await db.collection('equipment')
            .where('name', '==', 'High-Speed Centrifuge')
            .limit(1)
            .get();

        let equipmentId = null;
        if (!equipmentSnapshot.empty) {
            equipmentId = equipmentSnapshot.docs[0].id;
            console.log(`Found Equipment: ${equipmentId}`);
        } else {
            console.log('Equipment "High-Speed Centrifuge" not found.');
        }

        const inventorySnapshot = await db.collection('inventory')
            .where('productName', '==', 'Conical Tubes 50ml')
            .limit(1)
            .get();

        let inventoryId = null;
        if (!inventorySnapshot.empty) {
            inventoryId = inventorySnapshot.docs[0].id;
            console.log(`Found Inventory: ${inventoryId}`);
        } else {
            console.log('Inventory "Conical Tubes 50ml" not found. Listing all inventory:');
            const allInventory = await db.collection('inventory').get();
            allInventory.forEach(doc => {
                console.log(` - ${doc.id}: ${doc.data().productName}`);
            });
            // Fallback: use the first inventory item if available
            if (!allInventory.empty) {
                inventoryId = allInventory.docs[0].id;
                console.log(`Using fallback inventory: ${inventoryId}`);
            }
        }

        // Fetch PI User
        let piUserId = null;
        let piLabId = null;
        let piProfileId = null;

        const userSnapshot = await db.collection('users')
            .where('email', '==', 'test_pi@example.com')
            .limit(1)
            .get();

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            piUserId = userDoc.id;
            const userData = userDoc.data();
            piProfileId = userData.profileId;
            console.log(`Found PI User UID: ${piUserId}, ProfileID: ${piProfileId}`);

            if (piProfileId) {
                const profileDoc = await db.collection('personProfiles').doc(piProfileId).get();
                if (profileDoc.exists) {
                    piLabId = profileDoc.data().labId;
                    console.log(`Found PI Lab ID: ${piLabId}`);
                }
            }
        } else {
            console.error("Could not find PI user 'test_pi@example.com'");
            return;
        }

        // 2. Define Protocol Data
        const protocolId = db.collection('protocols').doc().id;
        const protocol = {
            id: protocolId,
            title: "Standard Cell Isolation",
            description: "Protocol for isolating cells using centrifugation.",
            steps: [
                {
                    id: "step_1",
                    order: 1,
                    instruction: "Prepare tubes",
                    expectedDuration: 10,
                    phaseType: "active",
                    requiredReagents: inventoryId ? [{
                        id: inventoryId,
                        name: "Conical Tubes 50ml",
                        quantity: "1",
                        unit: "tube"
                    }] : [],
                    requiredEquipment: []
                },
                {
                    id: "step_2",
                    order: 2,
                    instruction: "Centrifuge sample",
                    expectedDuration: 20,
                    phaseType: "active",
                    requiredReagents: [],
                    requiredEquipment: equipmentId ? [{
                        id: equipmentId,
                        name: "High-Speed Centrifuge"
                    }] : []
                }
            ],
            createdBy: piProfileId || piUserId,
            ownerId: piProfileId || piUserId,
            labId: piLabId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            isTemplate: false,
            tags: ["cell-biology", "isolation"],
            estimatedDuration: 30,
            isPublic: false,
            activeVersionId: "v1", // Dummy version ID
        };

        // 3. Save to Firestore
        await db.collection('protocols').doc(protocolId).set(protocol);
        console.log(`Protocol created successfully with ID: ${protocolId}`);

    } catch (error) {
        console.error('Error creating protocol:', error);
    }
}

createProtocol();
