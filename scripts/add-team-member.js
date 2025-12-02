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
    const projectId = 'sZYoShKUAzCeYOGThApb';
    const postdocUid = 'lepe2gRMoKOcDdWXTIf5HgaSnb92'; // From previous inspection

    console.log(`🚀 Adding Postdoc (${postdocUid}) to Project ${projectId}...`);

    const projectRef = db.collection('masterProjects').doc(projectId);
    const doc = await projectRef.get();

    if (!doc.exists) {
        console.error('Project not found!');
        return;
    }

    const data = doc.data();
    const teamMemberIds = data.teamMemberIds || [];

    if (!teamMemberIds.includes(postdocUid)) {
        teamMemberIds.push(postdocUid);
        await projectRef.update({ teamMemberIds });
        console.log('✅ Postdoc added to teamMemberIds.');
    } else {
        console.log('ℹ️ Postdoc is already a team member.');
    }
}

main().catch(console.error);
