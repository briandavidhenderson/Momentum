import * as admin from 'firebase-admin'
import * as fs from 'fs'

// --- Initialization ---

const files = fs.readdirSync('.')
const serviceAccountFile = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'))

if (!serviceAccountFile) {
    console.error('❌ Error: Service account key not found in root.')
    process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'))

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    })
}

const db = admin.firestore()

async function main() {
    console.log('🚀 Inspecting Work Packages...')

    const snapshot = await db.collection('workpackages').get()
    if (snapshot.empty) {
        console.log('No work packages found.')
        return
    }

    snapshot.forEach(doc => {
        const data = doc.data()
        console.log(`\n📦 Work Package: ${doc.id}`)
        console.log(`   Name: ${data.name}`)
        console.log(`   Created By: ${data.createdBy}`)
        console.log(`   Project ID (profileProjectId): ${data.profileProjectId}`)
        console.log(`   Lab ID: ${data.labId}`) // Check this specifically
        console.log(`   Created At: ${data.createdAt?.toDate?.()}`)
    })
}

main().catch(console.error)
