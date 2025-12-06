
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
        for (const k in envConfig) process.env[k] = envConfig[k];
    }
} catch (e) { console.error(e); }

if (!admin.apps.length) {
    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : undefined;
        const opts = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { credential: admin.credential.applicationDefault() };
        admin.initializeApp(opts);
    } catch (e) { console.error(e); process.exit(1); }
}

const db = admin.firestore();
const profileId = 'V1BYzEeBND3V6ap3CrhS'; // The broken profile ID we found

async function repair() {
    console.log(`🔧 Repairing Profile: ${profileId}`);

    const profileRef = db.collection('personProfiles').doc(profileId);

    // Data from 'lab_byrne' seed
    const updateData = {
        labId: "lab_byrne",
        labName: "Byrne Lab for Molecular Oncology",
        organisationId: "org_nui_galway",
        organisationName: "National University of Ireland, Galway",
        instituteId: "inst_medicine",
        instituteName: "School of Medicine",
        onboardingComplete: true,
        profileComplete: true,
        displayName: "Repaired User", // Placeholder
        updatedAt: new Date().toISOString()
    };

    await profileRef.set(updateData, { merge: true });
    console.log("✅ Profile repaired with default Lab data.");
}

repair().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
