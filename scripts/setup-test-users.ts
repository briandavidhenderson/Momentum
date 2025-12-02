import * as admin from 'firebase-admin'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// --- Configuration ---

const USERS = [
    {
        email: 'test_pi@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'PI',
        displayName: 'Dr. Test PI',
        userRole: 'pi',
        positionLevel: 'head_of_department',
        positionDisplayName: 'Head of Department',
        isPI: true,
        labName: 'Oncology Lab',
        labDescription: 'Focuses on cancer targets.',
        department: 'Oncology'
    },
    {
        email: 'test_postdoc@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Postdoc',
        displayName: 'Dr. Test Postdoc',
        userRole: 'researcher',
        positionLevel: 'postdoc_research_fellow',
        positionDisplayName: 'Postdoc Fellow',
        isPI: false,
        labName: 'Oncology Lab', // Same lab
        labDescription: 'Focuses on cancer targets.',
        department: 'Oncology'
    }
]

// --- Initialization ---

// Find the service account key
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
const auth = admin.auth()

// --- Helpers ---

async function getOrCreateUser(userData: any) {
    try {
        const userRecord = await auth.getUserByEmail(userData.email)
        console.log(`  ✓ User exists: ${userData.email} (${userRecord.uid})`)
        // Reset password to ensure we can login
        await auth.updateUser(userRecord.uid, { password: userData.password })
        return userRecord
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            const userRecord = await auth.createUser({
                email: userData.email,
                password: userData.password,
                displayName: userData.displayName,
                emailVerified: true
            })
            console.log(`  ✓ Created user: ${userData.email} (${userRecord.uid})`)
            return userRecord
        }
        throw error
    }
}

async function createLab(name: string, description: string, ownerId: string) {
    const snapshot = await db.collection('labs').where('name', '==', name).get()
    if (!snapshot.empty) {
        console.log(`  ✓ Lab exists: ${name}`)
        return snapshot.docs[0].id
    }

    const labRef = db.collection('labs').doc()
    await labRef.set({
        id: labRef.id,
        name,
        description,
        ownerId,
        members: [ownerId],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`  ✓ Created Lab: ${name} (${labRef.id})`)
    return labRef.id
}

async function updateProfile(uid: string, userData: any, labId: string) {
    const profileRef = db.collection('personProfiles').doc(uid)
    await profileRef.set({
        id: uid,
        userId: uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        organisationId: 'org-001',
        organisationName: 'Momentum Research',
        instituteId: 'inst-001',
        instituteName: 'Momentum Institute',
        labId: labId,
        labName: userData.labName,
        department: userData.department,
        workingLabIds: [labId],
        positionLevel: userData.positionLevel,
        positionDisplayName: userData.positionDisplayName,
        userRole: userData.userRole,
        isPrincipalInvestigator: userData.isPI,
        profileComplete: true,
        onboardingComplete: true,
        consentGiven: true,
        startDate: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    console.log(`  ✓ Created/Updated PersonProfile: ${userData.displayName}`)

    const userRef = db.collection('users').doc(uid)
    await userRef.set({
        uid,
        email: userData.email,
        fullName: userData.displayName,
        profileId: uid,
        isAdministrator: false,
        userRole: userData.userRole,
        gdprCompliant: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    console.log(`  ✓ Created/Updated User Document: ${userData.displayName}`)
}

// --- Main ---

async function main() {
    console.log('🚀 Seeding Test Users...')

    const userMap = new Map<string, string>()

    for (const userData of USERS) {
        console.log(`\n👤 Processing ${userData.displayName}...`)
        const userRecord = await getOrCreateUser(userData)
        userMap.set(userData.email, userRecord.uid)

        // For PI, create the lab. For Postdoc, find the lab.
        let labId = ''
        if (userData.isPI) {
            labId = await createLab(userData.labName, userData.labDescription, userRecord.uid)
        } else {
            const snapshot = await db.collection('labs').where('name', '==', userData.labName).get()
            if (!snapshot.empty) {
                labId = snapshot.docs[0].id
                // Add member to lab
                await db.collection('labs').doc(labId).update({
                    members: admin.firestore.FieldValue.arrayUnion(userRecord.uid)
                })
            } else {
                console.error('Lab not found for postdoc!')
                continue
            }
        }

        await updateProfile(userRecord.uid, userData, labId)
    }

    console.log('\n✅ Seeding Complete!')
    console.log('Credentials:')
    console.table(USERS.map(u => ({ Email: u.email, Password: u.password })))
}

main().catch(console.error)
