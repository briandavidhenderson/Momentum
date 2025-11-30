
/**
 * Migration script to fix whiteboards
 * 1. Converts createdBy from Profile ID to Firebase Auth UID
 * 2. Ensures labId is present (backfills from creator's profile if missing)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateWhiteboards() {
    console.log('Starting Whiteboard migration...');

    try {
        const whiteboardsSnapshot = await db.collection('whiteboards').get();
        console.log(`Found ${whiteboardsSnapshot.size} whiteboards`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const doc of whiteboardsSnapshot.docs) {
            const data = doc.data();
            const whiteboardId = doc.id;
            console.log(`\nProcessing whiteboard: ${whiteboardId} - "${data.name}"`);

            let updates: any = {};
            let needsUpdate = false;

            // 1. Fix createdBy (Profile ID -> Auth UID)
            let creatorUserId = data.createdBy;
            if (data.createdBy && data.createdBy.length !== 28) {
                console.log(`  Converting createdBy profile ID: ${data.createdBy}`);
                try {
                    const profileDoc = await db.collection('personProfiles').doc(data.createdBy).get();
                    if (profileDoc.exists) {
                        const profileData = profileDoc.data();
                        if (profileData?.userId) {
                            creatorUserId = profileData.userId;
                            updates.createdBy = creatorUserId;
                            needsUpdate = true;
                            console.log(`    ✓ Found userId: ${creatorUserId}`);
                        } else {
                            console.log(`    ⚠️  Profile has no userId`);
                        }
                    } else {
                        console.log(`    ⚠️  Profile not found`);
                    }
                } catch (error) {
                    console.log(`    ❌ Error fetching profile: ${error}`);
                }
            }

            // 2. Fix missing labId
            if (!data.labId) {
                console.log(`  Missing labId, attempting to backfill...`);
                if (creatorUserId) {
                    try {
                        // Check if we have the user profile (we might have just fetched it, but let's be safe)
                        // We need the profile corresponding to the creatorUserId (Auth UID)
                        // But personProfiles are keyed by Profile ID.
                        // So we need to query personProfiles where userId == creatorUserId
                        const profilesQuery = await db.collection('personProfiles').where('userId', '==', creatorUserId).limit(1).get();

                        if (!profilesQuery.empty) {
                            const profileData = profilesQuery.docs[0].data();
                            if (profileData.labId) {
                                updates.labId = profileData.labId;
                                needsUpdate = true;
                                console.log(`    ✓ Found labId from creator's profile: ${profileData.labId}`);
                            } else {
                                console.log(`    ⚠️  Creator's profile has no labId`);
                            }
                        } else {
                            console.log(`    ⚠️  Creator profile not found by userId`);
                        }
                    } catch (error) {
                        console.log(`    ❌ Error fetching creator profile: ${error}`);
                    }
                } else {
                    console.log(`    ⚠️  Cannot backfill labId without valid creatorUserId`);
                }
            }

            if (needsUpdate) {
                await doc.ref.update(updates);
                console.log(`  ✅ Updated whiteboard`);
                updated++;
            } else {
                console.log(`  ⏭️  No update needed`);
                skipped++;
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`  Updated: ${updated}`);
        console.log(`  Skipped: ${skipped}`);
        console.log(`  Errors: ${errors}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

migrateWhiteboards()
    .then(() => {
        console.log('\n🎉 Migration successful!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
