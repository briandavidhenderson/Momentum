/**
 * Migration script to fix research board members arrays
 * Converts profile IDs to Firebase Auth user IDs
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

async function migrateResearchBoards() {
  console.log('Starting Research Board migration...');

  try {
    // Get all research boards
    const boardsSnapshot = await db.collection('researchBoards').get();
    console.log(`Found ${boardsSnapshot.size} research boards`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const boardDoc of boardsSnapshot.docs) {
      const boardData = boardDoc.data();
      const boardId = boardDoc.id;

      console.log(`\nProcessing board: ${boardId} - "${boardData.title}"`);

      // Check if members array exists
      if (!boardData.members || !Array.isArray(boardData.members)) {
        console.log(`  ⚠️  No members array, initializing with creator...`);
        await boardDoc.ref.update({
          members: [boardData.creatorId]
        });
        updated++;
        continue;
      }

      // Map profile IDs to user IDs
      const userIds: string[] = [];
      let needsUpdate = false;

      for (const memberId of boardData.members) {
        // Check if this looks like a Firebase Auth UID (typically 28 chars)
        // vs a Firestore document ID (typically 20 chars)
        if (memberId.length === 28) {
          // Already a user ID
          userIds.push(memberId);
        } else {
          // Likely a profile ID, need to convert
          console.log(`  Converting profile ID: ${memberId}`);

          try {
            // Try to find the profile and get its userId
            const profileDoc = await db.collection('personProfiles').doc(memberId).get();

            if (profileDoc.exists) {
              const profileData = profileDoc.data();
              const userId = profileData?.userId;

              if (userId) {
                console.log(`    ✓ Found userId: ${userId}`);
                userIds.push(userId);
                needsUpdate = true;
              } else {
                console.log(`    ⚠️  Profile has no userId, keeping original ID`);
                userIds.push(memberId);
              }
            } else {
              console.log(`    ⚠️  Profile not found, keeping original ID`);
              userIds.push(memberId);
            }
          } catch (error) {
            console.log(`    ❌ Error fetching profile: ${error}`);
            userIds.push(memberId); // Keep original on error
          }
        }
      }

      // Ensure creator is in members array
      if (!userIds.includes(boardData.creatorId)) {
        console.log(`  Adding creator to members: ${boardData.creatorId}`);
        userIds.push(boardData.creatorId);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await boardDoc.ref.update({
          members: userIds
        });
        console.log(`  ✅ Updated board members`);
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

// Run migration
migrateResearchBoards()
  .then(() => {
    console.log('\n🎉 Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
