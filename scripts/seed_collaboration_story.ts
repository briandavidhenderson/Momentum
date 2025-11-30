/**
 * Seed Collaboration Story Script (Advanced)
 * 
 * Creates a comprehensive test environment for "Contextual Collaboration" and "Advanced Workflows".
 * - Creates 5 Labs (Biology, Chemistry, Engineering, Genomics, Bioinformatics)
 * - Creates 6 Users (Sarah, Markus, Alex, Emily, James, Linda)
 * - Populates Inventory and Equipment
 * - Creates a Complex Master Project ("Cancer Immunotherapy Initiative")
 * - Seeds Protocols, ELN Experiments, and Day-to-Day Tasks
 * 
 * USAGE:
 *   npx tsx scripts/seed_collaboration_story.ts
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// --- Configuration ---
const USERS = [
    // Existing Users
    {
        email: 'sarah.chen@example.com',
        password: 'password123',
        firstName: 'Sarah',
        lastName: 'Chen',
        displayName: 'Dr. Sarah Chen',
        role: 'principal_investigator',
        labName: 'Cellular Biology Core',
        labDescription: 'Focuses on cell viability and biological protocols.',
        department: 'Biology'
    },
    {
        email: 'markus.weber@example.com',
        password: 'password123',
        firstName: 'Markus',
        lastName: 'Weber',
        displayName: 'Markus Weber',
        role: 'postdoc',
        labName: 'Advanced Materials Lab',
        labDescription: 'Focuses on synthesizing conductive hydrogels.',
        department: 'Chemistry'
    },
    {
        email: 'alex.rivera@example.com',
        password: 'password123',
        firstName: 'Alex',
        lastName: 'Rivera',
        displayName: 'Alex Rivera',
        role: 'phd_student',
        labName: 'Micro-Devices Lab',
        labDescription: 'Focuses on 3D printing and sensor assembly.',
        department: 'Engineering'
    },
    // New Users
    {
        email: 'emily.zhang@example.com',
        password: 'password123',
        firstName: 'Emily',
        lastName: 'Zhang',
        displayName: 'Dr. Emily Zhang',
        role: 'principal_investigator',
        labName: 'Genomics Core',
        labDescription: 'High-throughput sequencing and genomic analysis.',
        department: 'Genetics'
    },
    {
        email: 'james.miller@example.com',
        password: 'password123',
        firstName: 'James',
        lastName: 'Miller',
        displayName: 'James Miller',
        role: 'lab_technician',
        labName: 'Genomics Core', // Same lab as Emily
        labDescription: 'High-throughput sequencing and genomic analysis.',
        department: 'Genetics'
    },
    {
        email: 'linda.johnson@example.com',
        password: 'password123',
        firstName: 'Linda',
        lastName: 'Johnson',
        displayName: 'Linda Johnson',
        role: 'bioinformatician',
        labName: 'Bioinformatics Unit',
        labDescription: 'Data analysis and computational biology.',
        department: 'Computational Biology'
    }
]

const INVENTORY: Record<string, { name: string; category: string; quantity: number; unit: string; lowStock?: boolean }[]> = {
    'Cellular Biology Core': [
        { name: 'DMEM Cell Media', category: 'Reagent', quantity: 50, unit: '500mL' },
        { name: 'Fetal Bovine Serum', category: 'Reagent', quantity: 10, unit: '50mL' },
        { name: 'Petri Dishes (100mm)', category: 'Consumable', quantity: 500, unit: 'pcs' }
    ],
    'Advanced Materials Lab': [
        { name: 'Conductive Ink (Ag)', category: 'Reagent', quantity: 5, unit: '100mL', lowStock: true },
        { name: 'Hydrogel Precursor A', category: 'Reagent', quantity: 20, unit: 'L' },
        { name: 'Acetone', category: 'Solvent', quantity: 10, unit: 'L' }
    ],
    'Micro-Devices Lab': [
        { name: 'PLA Filament (White)', category: 'Consumable', quantity: 10, unit: 'kg' },
        { name: 'Gold Electrodes', category: 'Consumable', quantity: 100, unit: 'pcs' },
        { name: 'PCB Boards', category: 'Consumable', quantity: 50, unit: 'pcs' }
    ],
    'Genomics Core': [
        { name: 'DNA Extraction Kit', category: 'Kit', quantity: 20, unit: 'box' },
        { name: 'PCR Master Mix', category: 'Reagent', quantity: 15, unit: 'mL' },
        { name: 'Sequencing Flow Cells', category: 'Consumable', quantity: 5, unit: 'pcs', lowStock: true }
    ],
    'Bioinformatics Unit': [
        { name: 'Server Rack Mounts', category: 'Hardware', quantity: 2, unit: 'pcs' },
        { name: 'External HDD (4TB)', category: 'Hardware', quantity: 5, unit: 'pcs' }
    ]
}

const EQUIPMENT = {
    'Cellular Biology Core': [
        { name: 'CO2 Incubator', type: 'Incubator', status: 'available' },
        { name: 'Biosafety Cabinet Class II', type: 'Safety', status: 'available' },
        { name: 'Inverted Microscope', type: 'Microscopy', status: 'available' }
    ],
    'Advanced Materials Lab': [
        { name: 'Rheometer MCR 302', type: 'Analysis', status: 'available' },
        { name: 'Chemical Fume Hood', type: 'Safety', status: 'in_use' }
    ],
    'Micro-Devices Lab': [
        { name: '3D Bioprinter X1', type: 'Printer', status: 'available' },
        { name: 'Soldering Station', type: 'Electronics', status: 'available' }
    ],
    'Genomics Core': [
        { name: 'Illumina Sequencer', type: 'Sequencer', status: 'running' },
        { name: 'PCR Thermocycler', type: 'Analysis', status: 'available' }
    ],
    'Bioinformatics Unit': [
        { name: 'HPC Cluster Node', type: 'Computer', status: 'running' }
    ]
}

// --- Initialization ---

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './service-account-key.json'

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: Service account key not found at:', serviceAccountPath)
    console.error('   Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable')
    console.error('   or place service-account-key.json in the project root')
    process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

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
    // 1. Create PersonProfile
    const profileRef = db.collection('personProfiles').doc(uid) // Use uid as profileId for simplicity in seeding
    await profileRef.set({
        id: uid,
        userId: uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        role: userData.role,
        labId,
        department: userData.department,
        researchInterests: [],
        qualifications: [],
        fundedBy: [],
        researchGroupIds: [],
        workingLabIds: [],
        organisationId: 'org-001', // Placeholder
        instituteId: 'inst-001', // Placeholder
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    console.log(`  ✓ Created PersonProfile: ${userData.displayName}`)

    // 2. Create User Document (linking to profile)
    const userRef = db.collection('users').doc(uid)
    await userRef.set({
        uid,
        email: userData.email,
        fullName: userData.displayName,
        profileId: uid, // Link to the profile we just created
        isAdministrator: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    console.log(`  ✓ Created User Document: ${userData.displayName}`)
}

async function seedInventory(labId: string, labName: string) {
    const items = INVENTORY[labName as keyof typeof INVENTORY] || []
    for (const item of items) {
        const itemRef = db.collection('inventory').doc()
        await itemRef.set({
            id: itemRef.id,
            labId,
            name: item.name,
            category: item.category,
            description: `Test item for ${labName}`,
            currentQuantity: item.quantity,
            minQuantity: item.lowStock ? item.quantity + 5 : 1,
            unit: item.unit,
            inventoryLevel: item.lowStock ? 'low' : 'full',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
    }
    console.log(`  ✓ Seeded ${items.length} inventory items for ${labName}`)
}

async function seedEquipment(labId: string, labName: string) {
    const items = EQUIPMENT[labName as keyof typeof EQUIPMENT] || []
    for (const item of items) {
        const itemRef = db.collection('equipment').doc()
        await itemRef.set({
            id: itemRef.id,
            labId,
            name: item.name,
            type: item.type,
            status: item.status,
            manufacturer: 'Test Corp',
            model: 'X-1000',
            serialNumber: uuidv4().substring(0, 8).toUpperCase(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
    }
    console.log(`  ✓ Seeded ${items.length} equipment items for ${labName}`)
}

async function createMasterProject(piUser: any, piUid: string, labId: string, teamMemberUids: string[]) {
    const projectId = uuidv4()
    const projectRef = db.collection('masterProjects').doc(projectId)

    await projectRef.set({
        id: projectId,
        name: 'Cancer Immunotherapy Initiative',
        description: 'Developing novel CAR-T cell therapies using advanced hydrogel scaffolds.',
        labId: labId,
        labName: piUser.labName,
        instituteId: 'inst-001', // Placeholder
        instituteName: 'Momentum Institute',
        organisationId: 'org-001', // Placeholder
        organisationName: 'Momentum Research',
        type: 'funded',
        grantName: 'NIH R01 CA123456',
        totalBudget: 1500000,
        currency: 'USD',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 year
        funderId: 'nih',
        funderName: 'National Institutes of Health',
        accountIds: [],
        principalInvestigatorIds: [piUid],
        coPIIds: [],
        teamMemberIds: teamMemberUids,
        teamRoles: {
            [piUid]: 'PI',
            ...teamMemberUids.reduce((acc, uid) => ({ ...acc, [uid]: 'Researcher' }), {})
        },
        workpackageIds: [],
        status: 'active',
        progress: 15,
        visibility: 'lab',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: piUid
    })
    console.log(`  ✓ Created Master Project: Cancer Immunotherapy Initiative (${projectId})`)
    return projectId
}

async function createWorkpackages(projectId: string, piUid: string, labId: string) {
    const wp1Id = uuidv4()
    const wp2Id = uuidv4()

    await db.collection('workpackages').doc(wp1Id).set({
        id: wp1Id,
        projectId,
        name: 'Target Identification',
        description: 'Identify novel antigens for CAR-T targeting.',
        status: 'in-progress',
        progress: 40,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        labId,
        createdBy: piUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    await db.collection('workpackages').doc(wp2Id).set({
        id: wp2Id,
        projectId,
        name: 'In Vivo Validation',
        description: 'Test candidates in mouse models.',
        status: 'planning',
        progress: 0,
        startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        labId,
        createdBy: piUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Update Project with WPs
    await db.collection('masterProjects').doc(projectId).update({
        workpackageIds: [wp1Id, wp2Id]
    })

    console.log(`  ✓ Created 2 Workpackages for Project ${projectId}`)
    return [wp1Id, wp2Id]
}

async function createProtocol(piUid: string, labId: string) {
    const protocolId = uuidv4()
    await db.collection('protocols').doc(protocolId).set({
        id: protocolId,
        title: 'Standard DNA Extraction',
        description: 'Protocol for extracting high-quality DNA from tissue samples.',
        steps: [
            { id: uuidv4(), order: 1, instruction: 'Lyse cells with buffer A.', expectedDuration: 30, phaseType: 'active' },
            { id: uuidv4(), order: 2, instruction: 'Incubate at 56°C.', expectedDuration: 60, phaseType: 'passive' },
            { id: uuidv4(), order: 3, instruction: 'Centrifuge at 12,000g for 10 mins.', expectedDuration: 10, phaseType: 'active' },
            { id: uuidv4(), order: 4, instruction: 'Elute DNA in TE buffer.', expectedDuration: 5, phaseType: 'active' }
        ],
        createdBy: piUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        version: 1,
        isPublic: true,
        labId,
        ownerId: piUid
    })
    console.log(`  ✓ Created Protocol: Standard DNA Extraction (${protocolId})`)
    return protocolId
}

async function createExperiment(piUid: string, labId: string, projectId: string, protocolId: string) {
    const expId = uuidv4()
    await db.collection('elnExperiments').doc(expId).set({
        id: expId,
        title: 'Initial DNA Extraction Test',
        masterProjectId: projectId,
        masterProjectName: 'Cancer Immunotherapy Initiative',
        labId,
        labName: 'Genomics Core', // Assuming created by Emily
        items: [],
        createdBy: piUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'in-progress',
        protocolsUsed: [{
            protocolId,
            protocolName: 'Standard DNA Extraction',
            version: '1'
        }]
    })
    console.log(`  ✓ Created ELN Experiment: Initial DNA Extraction Test (${expId})`)
}

async function createDayToDayTask(userUid: string, labId: string) {
    const taskId = uuidv4()
    await db.collection('dayToDayTasks').doc(taskId).set({
        id: taskId,
        title: 'Order new sequencing kits',
        status: 'todo',
        priority: 'high',
        labId,
        createdBy: userUid,
        assigneeIds: [userUid],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`  ✓ Created Day-to-Day Task for user ${userUid}`)
}

// --- Main ---

async function main() {
    console.log('🚀 Seeding Advanced Collaboration Story Data...')
    console.log('='.repeat(60))

    const userMap = new Map<string, string>() // email -> uid
    const labMap = new Map<string, string>() // name -> id

    // 1. Create Users & Labs
    for (const userData of USERS) {
        console.log(`\n👤 Processing ${userData.displayName}...`)

        // Auth User
        const userRecord = await getOrCreateUser(userData)
        userMap.set(userData.email, userRecord.uid)

        // Lab
        const labId = await createLab(userData.labName, userData.labDescription, userRecord.uid)
        labMap.set(userData.labName, labId)

        // Profile
        await updateProfile(userRecord.uid, userData, labId)

        // Assets
        const invSnap = await db.collection('inventory').where('labId', '==', labId).limit(1).get()
        if (invSnap.empty) {
            await seedInventory(labId, userData.labName)
        }

        const eqSnap = await db.collection('equipment').where('labId', '==', labId).limit(1).get()
        if (eqSnap.empty) {
            await seedEquipment(labId, userData.labName)
        }

        // Day-to-Day Tasks
        await createDayToDayTask(userRecord.uid, labId)
    }

    // 2. Create Complex Project (Emily - Genomics Core)
    const emilyUid = userMap.get('emily.zhang@example.com')
    const jamesUid = userMap.get('james.miller@example.com')
    const lindaUid = userMap.get('linda.johnson@example.com')
    const genomicsLabId = labMap.get('Genomics Core')

    if (emilyUid && jamesUid && lindaUid && genomicsLabId) {
        console.log('\n🏗️  Building Complex Project Structure...')

        const projectId = await createMasterProject(
            USERS.find(u => u.email === 'emily.zhang@example.com'),
            emilyUid,
            genomicsLabId,
            [jamesUid, lindaUid]
        )

        await createWorkpackages(projectId, emilyUid, genomicsLabId)

        // 3. Create 5 Shared Projects with Overlap (Sarah & Markus)
        const sarahUid = userMap.get('sarah.chen@example.com')
        const markusUid = userMap.get('markus.weber@example.com')
        const biologyLabId = labMap.get('Cellular Biology Core')

        if (sarahUid && markusUid && biologyLabId) {
            console.log('\n🤝 Creating 5 Shared Projects (Sarah & Markus)...')

            const projectConfigs = [
                { name: 'Neuro-Regeneration Study', desc: 'Stem cells on conductive scaffolds.' },
                { name: 'Bio-Sensor Array', desc: 'Detecting cytokines in real-time.' },
                { name: 'Hydrogel Toxicity Screen', desc: 'High-throughput viability testing.' },
                { name: 'Smart Bandage Prototype', desc: 'Integrated pH sensors and drug delivery.' },
                { name: 'Neural Interface V2', desc: 'Next-gen electrode coating optimization.' }
            ]

            for (const config of projectConfigs) {
                // Create Project
                const projectId = uuidv4()
                await db.collection('masterProjects').doc(projectId).set({
                    id: projectId,
                    name: config.name,
                    description: config.desc,
                    labId: biologyLabId, // Hosted in Biology for now, but shared
                    labName: 'Cellular Biology Core',
                    instituteId: 'inst-001',
                    instituteName: 'Momentum Institute',
                    organisationId: 'org-001',
                    organisationName: 'Momentum Research',
                    type: 'funded',
                    grantName: 'NSF Collab Grant',
                    totalBudget: 500000,
                    currency: 'USD',
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    funderId: 'nsf',
                    funderName: 'National Science Foundation',
                    accountIds: [],
                    principalInvestigatorIds: [sarahUid],
                    coPIIds: [markusUid],
                    teamMemberIds: [sarahUid, markusUid],
                    teamRoles: {
                        [sarahUid]: 'PI',
                        [markusUid]: 'Co-PI'
                    },
                    workpackageIds: [],
                    status: 'active',
                    progress: Math.floor(Math.random() * 100),
                    visibility: 'lab',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: sarahUid
                })

                // Create Workpackage
                const wpId = uuidv4()
                await db.collection('workpackages').doc(wpId).set({
                    id: wpId,
                    projectId,
                    name: 'Phase 1: Development',
                    description: 'Initial R&D phase.',
                    status: 'in-progress',
                    progress: 50,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                    labId: biologyLabId,
                    createdBy: sarahUid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                })

                // Update Project
                await db.collection('masterProjects').doc(projectId).update({
                    workpackageIds: [wpId]
                })

                // Create Deliverable
                const delId = uuidv4()
                await db.collection('deliverables').doc(delId).set({
                    id: delId,
                    workpackageId: wpId,
                    projectId,
                    name: 'Prototype Design',
                    description: 'CAD models and material selection.',
                    status: 'completed',
                    progress: 100,
                    dueDate: new Date().toISOString(),
                    type: 'document',
                    ownerId: markusUid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                })

                // Create Experiment
                const expId = uuidv4()
                await db.collection('elnExperiments').doc(expId).set({
                    id: expId,
                    title: `${config.name} - Initial Trial`,
                    masterProjectId: projectId,
                    masterProjectName: config.name,
                    labId: biologyLabId,
                    labName: 'Cellular Biology Core',
                    items: [],
                    createdBy: sarahUid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'in-progress',
                    collaborators: [markusUid] // Legacy field, but good for safety
                })

                console.log(`  ✓ Created Shared Project: ${config.name}`)
            }
        }

    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Advanced Seeding Complete!')
    console.log('='.repeat(60))
    console.log('Use these credentials to log in:')
    console.table(USERS.map(u => ({
        Name: u.displayName,
        Email: u.email,
        Password: u.password,
        Lab: u.labName
    })))
}

main().catch(console.error)
