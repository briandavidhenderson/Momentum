
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Attempt to load .env.local manually since dotenv might be flaky
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
} catch (e) {
    console.error("Error loading .env.local", e);
}

// Initialize Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
            : undefined;

        const opts = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { credential: admin.credential.applicationDefault() };

        admin.initializeApp(opts);
    } catch (e) { console.error("Init Error", e); process.exit(1); }
}

const db = admin.firestore();
const args = process.argv.slice(2);
const targetId = args[0] || 'c5cwKYCaYYVo8AceURMWKdImJ132';

async function run() {
    console.log(`\nChecking Profile for Target ID: ${targetId}`);

    // Try as User first
    const userSnap = await db.collection('users').doc(targetId).get();

    if (userSnap.exists) {
        const userData = userSnap.data();
        const pid = userData.profileId;
        console.log(`✅ User Document Found (${targetId})`);
        console.log(`   - profileId: ${pid}`);
        console.log(`   - email: ${userData.email}`);

        if (pid) {
            const pSnap = await db.collection('personProfiles').doc(pid).get();
            if (pSnap.exists) {
                const pData = pSnap.data();
                console.log(`✅ Linked Profile Document Found (${pid})`);
                console.log(`   - labId: ${pData.labId}`);
                console.log(`   - organisationId: ${pData.organisationId}`);
                console.log(`   - displayName: ${pData.displayName}`);
            } else {
                console.log(`❌ Linked Profile Document NOT FOUND at ID: ${pid}`);
            }
        } else {
            console.log(`❌ User Document has NO profileId field.`);
        }
    } else {
        console.log(`⚠️ User Document NOT FOUND at ID: ${targetId}. Inspecting as Profile ID directly...`);
        const pSnap = await db.collection('personProfiles').doc(targetId).get();
        if (pSnap.exists) {
            const pData = pSnap.data();
            console.log(`✅ Profile Document Found (${targetId})`);
            console.log(`   - labId: ${pData.labId}`);
            console.log(`   - organisationId: ${pData.organisationId}`);
        } else {
            console.log(`❌ Profile Document NOT FOUND at ID: ${targetId}`);
        }
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
