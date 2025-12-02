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
    console.log('🚀 Inspecting Project and User Data...')

    const projectId = 'sZYoShKUAzCeYOGThApb'
    const postdocEmail = 'test_postdoc@example.com'

    // 1. Inspect Master Project
    const projectDoc = await db.collection('masterProjects').doc(projectId).get()
    if (!projectDoc.exists) {
        console.error(`❌ Project ${projectId} not found in 'masterProjects'.`)
    } else {
        const data = projectDoc.data()
        console.log(`\n📦 Project: ${projectId}`)
        console.log(`   Name: ${data?.name}`)
        console.log(`   Lab ID: ${data?.labId}`)
        console.log(`   Team Members: ${JSON.stringify(data?.teamMemberIds)}`)
    }

    // 2. Inspect Postdoc User/Profile
    const userSnapshot = await db.collection('users').where('email', '==', postdocEmail).get()
    if (userSnapshot.empty) {
        console.error(`❌ User with email ${postdocEmail} not found in 'users'.`)
    } else {
        const userDoc = userSnapshot.docs[0]
        const userData = userDoc.data()
        console.log(`\n👤 User: ${postdocEmail}`)
        console.log(`   UID: ${userDoc.id}`)
        console.log(`   Profile ID: ${userData.profileId}`)

        if (userData.profileId) {
            const profileDoc = await db.collection('personProfiles').doc(userData.profileId).get()
            if (profileDoc.exists) {
                const profileData = profileDoc.data()
                console.log(`   Lab ID (from profile): ${profileData?.labId}`)
                console.log(`   Lab Memberships: ${JSON.stringify(profileData?.labMemberships)}`)
            } else {
                console.error(`❌ Profile ${userData.profileId} not found.`)
            }
        }
    }
}

main().catch(console.error)
