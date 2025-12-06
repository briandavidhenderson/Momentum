
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
        process.exit(1);
    }
}

const db = admin.firestore();
const TARGET_USER_ID = 'c5cwKYCaYYVo8AceURMWKdImJ132';

async function diagnoseUser() {
    console.log(`Diagnosing user: ${TARGET_USER_ID}`);

    try {
        // 1. Check User Document
        const userDoc = await db.collection('users').doc(TARGET_USER_ID).get();
        if (!userDoc.exists) {
            console.error('❌ User document NOT FOUND in "users" collection.');
        } else {
            console.log('✅ User document found:');
            console.log(JSON.stringify(userDoc.data(), null, 2));
        }

        const userData = userDoc.data();
        const profileId = userData?.profileId;

        if (!profileId) {
            console.error('❌ User document has NO profileId.');
            return;
        }

        // 2. Check Profile Document
        console.log(`\nChecking Profile: ${profileId}`);
        const profileDoc = await db.collection('personProfiles').doc(profileId).get();

        if (!profileDoc.exists) {
            console.error(`❌ Profile document ${profileId} NOT FOUND.`);
        } else {
            console.log('✅ Profile document found:');
            const profileData = profileDoc.data();
            console.log(JSON.stringify(profileData, null, 2));

            // Specific checks
            if (profileData.labId) {
                console.log(`\n✅ labId is present: ${profileData.labId}`);
            } else {
                console.error('\n❌ labId is MISSING or undefined in profile.');
            }

            if (profileData.organisationId) {
                console.log(`✅ organisationId is present: ${profileData.organisationId}`);
            } else {
                console.error('❌ organisationId is MISSING or undefined in profile.');
            }
        }

    } catch (error) {
        console.error('Diagnosis failed:', error);
    }
}

diagnoseUser();
