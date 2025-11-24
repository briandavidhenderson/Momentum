/**
 * Migration Script: Backfill research pin visibility
 *
 * Adds the `visibility` field to researchPins based on existing `isPrivate` flags.
 * - isPrivate === true  -> visibility: 'private'
 * - otherwise           -> visibility: 'lab'
 *
 * Run with: npx ts-node scripts/backfill-research-pin-visibility.ts [--dry-run]
 */

import * as admin from 'firebase-admin'
import * as path from 'path'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || path.join(__dirname, '../firebase-service-account.json')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function backfillResearchPins(dryRun: boolean) {
  const snapshot = await db.collection('researchPins').get()
  let updated = 0
  let skipped = 0

  console.log(`Processing ${snapshot.size} research pins${dryRun ? ' (dry run)' : ''}...`)

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.visibility) {
      skipped += 1
      continue
    }

    const visibility = data.isPrivate ? 'private' : 'lab'
    const payload = { visibility, isPrivate: visibility === 'private' }

    if (dryRun) {
      console.log(`[DRY RUN] Would update researchPins/${doc.id} ->`, payload)
    } else {
      await doc.ref.update(payload)
      console.log(`Updated researchPins/${doc.id} ->`, payload)
    }

    updated += 1
  }

  console.log(`Finished researchPins: ${updated} updated, ${skipped} skipped.`)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  await backfillResearchPins(dryRun)
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed', err)
  process.exit(1)
})
