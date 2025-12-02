const admin = require('firebase-admin');
const fs = require('fs');

// --- Initialization ---

const files = fs.readdirSync('.');
const serviceAccountFile = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));

if (!serviceAccountFile) {
    console.error('❌ Error: Service account key not found in root.');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function main() {
    console.log('🚀 Inspecting Work Packages...');

    const snapshot = await db.collection('workpackages')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

    console.log(`Found ${snapshot.size} work packages.`);

    if (snapshot.empty) {
        console.log('No work packages found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n📦 Work Package: ${doc.id}`);
        console.log(`   Name: ${data.name}`);
        console.log(`   Created By: ${data.createdBy}`);
        console.log(`   Project ID (profileProjectId): ${data.profileProjectId}`);
        console.log(`   Lab ID: ${data.labId}`); // Check this specifically
        console.log(`   Created At: ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt}`);
    });

    // Inspect the specific project
    const projectId = 'sZYoShKUAzCeYOGThApb';
    const projectDoc = await db.collection('masterProjects').doc(projectId).get();
    if (projectDoc.exists) {
        const pData = projectDoc.data();
        console.log(`\n📂 Project: ${projectId}`);
        console.log(`   Name: ${pData.name}`);
        console.log(`   Lab ID: ${pData.labId}`);
    } else {
        console.log(`\n❌ Project ${projectId} not found.`);
    }
}

main().catch(console.error);
