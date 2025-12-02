
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

async function createTask() {
    try {
        // 1. Get Postdoc Profile ID
        const postdocSnapshot = await db.collection('users').where('email', '==', 'test_postdoc@example.com').limit(1).get();
        if (postdocSnapshot.empty) {
            console.error('Postdoc user not found');
            return;
        }
        const postdocData = postdocSnapshot.docs[0].data();
        const postdocProfileId = postdocData.profileId;

        // 2. Get PI Profile ID
        const piSnapshot = await db.collection('users').where('email', '==', 'test_pi@example.com').limit(1).get();
        if (piSnapshot.empty) {
            console.error('PI user not found');
            return;
        }
        const piData = piSnapshot.docs[0].data();
        const piProfileId = piData.profileId;
        const piLabId = (await db.collection('personProfiles').doc(piProfileId).get()).data().labId;

        // 3. Create Task
        const taskData = {
            title: "Execute Cell Isolation Protocol",
            description: "Please run the 'Standard Cell Isolation' protocol. Protocol ID: CatanXV32AofkpKnJHlV",
            status: "todo",
            importance: "high",
            priority: "high",
            assigneeIds: [postdocProfileId],
            createdBy: piProfileId, // User ID or Profile ID? Type says User ID but usually it's Profile ID in this app. Let's use Profile ID to be safe or check usage.
            // Actually type says "createdBy: string // User ID". But let's check if it matters.
            // Usually createdBy is UID.
            // But assigneeIds are Profile IDs.
            // Let's use UID for createdBy.
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            linkedProjectId: "sZYoShKUAzCeYOGThApb",
            labId: piLabId,
            tags: ["protocol:CatanXV32AofkpKnJHlV", "isolation"],
            order: 0
        };

        // Use UID for createdBy
        taskData.createdBy = piSnapshot.docs[0].id;

        const res = await db.collection('dayToDayTasks').add(taskData);
        console.log(`Created Task: ${res.id}`);

    } catch (error) {
        console.error('Error creating task:', error);
    }
}

createTask();
