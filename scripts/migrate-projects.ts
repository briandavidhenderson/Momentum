/**
 * Migration script to populate project teamMemberIds arrays
 * Ensures all projects have proper member arrays for new rules
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

async function migrateProjects() {
  console.log('Starting Projects migration...');

  try {
    // Get all master projects
    const projectsSnapshot = await db.collection('masterProjects').get();
    console.log(`Found ${projectsSnapshot.size} projects`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const projectId = projectDoc.id;

      console.log(`\nProcessing project: ${projectId} - "${projectData.name}"`);

      // Combine all member arrays
      const principalInvestigatorIds = projectData.principalInvestigatorIds || [];
      const coPIIds = projectData.coPIIds || [];
      const existingTeamMemberIds = projectData.teamMemberIds || [];

      // Create unified team members set
      const teamMemberIds = new Set<string>([
        ...principalInvestigatorIds,
        ...coPIIds,
        ...existingTeamMemberIds
      ]);

      // Initialize teamRoles if empty
      const teamRoles = projectData.teamRoles || {};
      let rolesUpdated = false;

      // Set roles for PIs
      for (const piId of principalInvestigatorIds) {
        if (!teamRoles[piId]) {
          teamRoles[piId] = 'PI';
          rolesUpdated = true;
        }
      }

      // Set roles for Co-PIs
      for (const coPIId of coPIIds) {
        if (!teamRoles[coPIId]) {
          teamRoles[coPIId] = 'Co-PI';
          rolesUpdated = true;
        }
      }

      // Check if update is needed
      const needsUpdate =
        teamMemberIds.size === 0 ||
        existingTeamMemberIds.length !== teamMemberIds.size ||
        rolesUpdated ||
        !projectData.teamMemberIds;

      if (needsUpdate) {
        const updates: any = {
          principalInvestigatorIds: principalInvestigatorIds,
          coPIIds: coPIIds,
          teamMemberIds: Array.from(teamMemberIds),
          teamRoles: teamRoles,
        };

        await projectDoc.ref.update(updates);
        console.log(`  ✅ Updated project with ${teamMemberIds.size} team members`);
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
migrateProjects()
  .then(() => {
    console.log('\n🎉 Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
