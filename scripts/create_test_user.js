
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- Initialization ---
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

const auth = admin.auth();
const db = admin.firestore();

async function createTestUser() {
    const email = `test-orcid-${Date.now()}@example.com`;
    const password = 'Password123!';
    const displayName = 'ORCID Test User';

    try {
        console.log(`Creating user: ${email}`);
        const userRecord = await auth.createUser({
            email: email,
            emailVerified: true, // Bypass verification
            password: password,
            displayName: displayName,
            disabled: false
        });

        console.log(`Successfully created new user: ${userRecord.uid}`);

        // Create Firestore profile
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            displayName: displayName,
            photoURL: userRecord.photoURL || null,
            createdAt: new Date().toISOString(),
            isAdministrator: false
        });

        // Create PersonProfile
        const profileId = `profile-${userRecord.uid}`;
        await db.collection('personProfiles').doc(profileId).set({
            id: profileId,
            userId: userRecord.uid,
            firstName: "ORCID",
            lastName: "Test User",
            email: email,
            labId: "lab-123", // Dummy lab
            labName: "Test Lab",
            organisationId: "org-123",
            organisationName: "Test Org",
            instituteId: "inst-123",
            instituteName: "Test Institute",
            positionLevel: "phd_student",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // Update user with profileId
        await db.collection('users').doc(userRecord.uid).update({
            profileId: profileId
        });

        console.log(`✅ User and Profile created.`);
        console.log(`EMAIL: ${email}`);
        console.log(`PASSWORD: ${password}`);

    } catch (error) {
        console.error('Error creating new user:', error);
    }
}

createTestUser();
