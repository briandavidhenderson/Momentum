/**
 * Profile Validation and Repair Script
 *
 * This script validates all person profiles and fixes common issues:
 * - Missing labId field
 * - Missing organisationId, instituteId
 * - User/profile sync issues
 *
 * Run with: npx ts-node scripts/validate-profiles.ts
 */

import * as admin from 'firebase-admin'

// Initialize Firebase Admin
// Note: Requires GOOGLE_APPLICATION_CREDENTIALS environment variable
// or service account key file in the project root
if (!admin.apps.length) {
  try {
    // Try to load service account from environment
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './momentum-a60c5-firebase-adminsdk-7fwnw-5a5a10f3e1.json'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK')
    console.error('Please ensure GOOGLE_APPLICATION_CREDENTIALS is set or service account key exists')
    process.exit(1)
  }
}

const db = admin.firestore()

interface ValidationResult {
  total: number
  valid: number
  fixed: number
  errors: string[]
}

async function validateAndFixProfiles(): Promise<ValidationResult> {
  const result: ValidationResult = {
    total: 0,
    valid: 0,
    fixed: 0,
    errors: [],
  }

  console.log('Starting profile validation...\n')

  // Get all person profiles
  const profilesSnapshot = await db.collection('personProfiles').get()
  result.total = profilesSnapshot.size

  console.log(`Found ${result.total} profiles\n`)

  for (const profileDoc of profilesSnapshot.docs) {
    const profile = profileDoc.data()
    const profileId = profileDoc.id
    let needsUpdate = false
    const updates: any = {}

    console.log(`Checking profile: ${profileId}`)
    console.log(`  Name: ${profile.firstName} ${profile.lastName}`)
    console.log(`  Email: ${profile.email}`)

    // Check for missing labId
    if (!profile.labId && profile.lab) {
      console.log(`  ⚠️  Missing labId, has legacy lab field: ${profile.lab}`)
      result.errors.push(`${profileId}: Missing labId (has legacy lab: ${profile.lab})`)

      // Try to find the lab by name
      const labsSnapshot = await db.collection('labs').where('name', '==', profile.lab).get()
      if (!labsSnapshot.empty) {
        const labDoc = labsSnapshot.docs[0]
        updates.labId = labDoc.id
        console.log(`  ✓ Found lab ID: ${labDoc.id}`)
        needsUpdate = true
      } else {
        console.log(`  ✗ Could not find lab with name: ${profile.lab}`)
        result.errors.push(`${profileId}: Lab not found: ${profile.lab}`)
      }
    } else if (!profile.labId) {
      console.log(`  ✗ Missing labId and no legacy lab field`)
      result.errors.push(`${profileId}: Missing labId entirely`)
    } else {
      console.log(`  ✓ Has labId: ${profile.labId}`)
    }

    // Check for missing organisationId
    if (!profile.organisationId && profile.organisation) {
      console.log(`  ⚠️  Missing organisationId, has legacy organisation field: ${profile.organisation}`)

      const orgsSnapshot = await db.collection('organisations').where('name', '==', profile.organisation).get()
      if (!orgsSnapshot.empty) {
        const orgDoc = orgsSnapshot.docs[0]
        updates.organisationId = orgDoc.id
        console.log(`  ✓ Found organisation ID: ${orgDoc.id}`)
        needsUpdate = true
      }
    }

    // Check for missing instituteId
    if (!profile.instituteId && profile.institute) {
      console.log(`  ⚠️  Missing instituteId, has legacy institute field: ${profile.institute}`)

      const instsSnapshot = await db.collection('institutes').where('name', '==', profile.institute).get()
      if (!instsSnapshot.empty) {
        const instDoc = instsSnapshot.docs[0]
        updates.instituteId = instDoc.id
        console.log(`  ✓ Found institute ID: ${instDoc.id}`)
        needsUpdate = true
      }
    }

    // Check user/profile sync
    if (profile.userId) {
      const userDoc = await db.collection('users').doc(profile.userId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        if (userData?.profileId !== profileId) {
          console.log(`  ⚠️  User/profile sync issue: user.profileId=${userData?.profileId}, expected=${profileId}`)
          // Fix user document
          await db.collection('users').doc(profile.userId).set(
            { profileId: profileId },
            { merge: true }
          )
          console.log(`  ✓ Fixed user document`)
          needsUpdate = true
        }
      } else {
        console.log(`  ⚠️  User document not found: ${profile.userId}`)
        result.errors.push(`${profileId}: User document not found: ${profile.userId}`)
      }
    } else {
      console.log(`  ⚠️  Profile missing userId`)
      result.errors.push(`${profileId}: Missing userId`)
    }

    // Apply updates if needed
    if (needsUpdate && Object.keys(updates).length > 0) {
      await db.collection('personProfiles').doc(profileId).update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(`  ✓ Updated profile with fixes`)
      result.fixed++
    } else if (!needsUpdate) {
      result.valid++
    }

    console.log('')
  }

  return result
}

// Run the script
validateAndFixProfiles()
  .then((result) => {
    console.log('\n' + '='.repeat(60))
    console.log('Validation Complete')
    console.log('='.repeat(60))
    console.log(`Total profiles: ${result.total}`)
    console.log(`Valid profiles: ${result.valid}`)
    console.log(`Fixed profiles: ${result.fixed}`)
    console.log(`Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('\nErrors:')
      result.errors.forEach((error) => console.log(`  - ${error}`))
    }

    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
