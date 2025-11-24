/**
 * Migration Script: Backfill unified project type
 *
 * Adds the `type: "funded" | "unfunded"` classification to masterProjects and legacy projects,
 * normalizing legacy labels (master/grant/funded => funded, regular/passive/unfunded => unfunded).
 *
 * Run with: npx ts-node scripts/backfill-project-type.ts [--dry-run]
 */

import * as admin from 'firebase-admin'
import * as path from 'path'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || path.join(__dirname, '../firebase-service-account.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const LEGACY_TYPE_MAP: Record<string, 'funded' | 'unfunded'> = {
  master: 'funded',
  grant: 'funded',
  funded: 'funded',
  regular: 'unfunded',
  passive: 'unfunded',
  unfunded: 'unfunded',
}

function normalizeProjectType(data: any): { type: 'funded' | 'unfunded'; legacyTypeLabel?: string } {
  const rawLabel: string | undefined =
    data?.type || data?.projectType || data?.fundingType || data?.legacyTypeLabel

  if (rawLabel) {
    const normalized = LEGACY_TYPE_MAP[rawLabel.toLowerCase()]
    if (normalized) {
      return { type: normalized, legacyTypeLabel: rawLabel }
    }
  }

  if (
    (data?.totalBudget ?? 0) > 0 ||
    data?.funderId ||
    (data?.accountIds?.length ?? 0) > 0 ||
    (data?.fundedBy?.length ?? 0) > 0
  ) {
    return { type: 'funded' }
  }

  return { type: 'unfunded' }
}

async function backfillCollection(collectionName: string, dryRun: boolean) {
  const snapshot = await db.collection(collectionName).get()
  let updated = 0
  let skipped = 0

  console.log(`\n📚 Processing ${collectionName} (${snapshot.size} docs) ...`)

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const { type, legacyTypeLabel } = normalizeProjectType(data)
    const needsTypeUpdate = data.type !== type
    const needsLegacyUpdate = legacyTypeLabel && data.legacyTypeLabel !== legacyTypeLabel

    if (!needsTypeUpdate && !needsLegacyUpdate) {
      skipped += 1
      continue
    }

    const updatePayload: Record<string, any> = { type }
    if (legacyTypeLabel) {
      updatePayload.legacyTypeLabel = legacyTypeLabel
    }

    if (dryRun) {
      console.log(`DRY RUN: would update ${collectionName}/${doc.id} ->`, updatePayload)
    } else {
      await doc.ref.update(updatePayload)
      console.log(`✅ Updated ${collectionName}/${doc.id} ->`, updatePayload)
    }

    updated += 1
  }

  console.log(`Finished ${collectionName}: ${updated} updated, ${skipped} skipped.`)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(dryRun ? '🚧 Running in DRY RUN mode' : '🚀 Running migration')

  await backfillCollection('masterProjects', dryRun)
  await backfillCollection('projects', dryRun)

  console.log('🎉 Migration complete')
}

main().catch((err) => {
  console.error('Migration failed', err)
  process.exit(1)
})
