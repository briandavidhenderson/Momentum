
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- Initialization ---
const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir);
const serviceAccountFile = files.find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));

if (!serviceAccountFile) {
    console.error('❌ Error: Service account key not found in root.');
    process.exit(1);
}

const serviceAccountPath = path.join(rootDir, serviceAccountFile);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// --- Data Generators ---
const generateId = () => db.collection('dummy').doc().id;

async function seedProject() {
    console.log('🚀 Starting Large Scale Project Seed...');

    try {
        // 1. Get/Create Users (Team)
        // We need 1 PI (existing), 2 Postdocs (1 existing, 1 new), 1 RA (new)
        // For new users, we'll create PersonProfiles. We won't create Auth users for them to save time, 
        // but we'll assign tasks to their Profile IDs.

        const piEmail = 'test_pi@example.com';
        const piSnapshot = await db.collection('users').where('email', '==', piEmail).limit(1).get();
        if (piSnapshot.empty) throw new Error('PI not found');
        const piUser = piSnapshot.docs[0];
        const piProfileId = piUser.data().profileId;
        const piProfileDoc = await db.collection('personProfiles').doc(piProfileId).get();
        const labId = piProfileDoc.data().labId;

        console.log(`✅ Found PI: ${piProfileId}, Lab: ${labId}`);

        // Existing Postdoc
        const pd1Email = 'test_postdoc@example.com';
        const pd1Snapshot = await db.collection('users').where('email', '==', pd1Email).limit(1).get();
        let pd1ProfileId;
        if (!pd1Snapshot.empty) {
            pd1ProfileId = pd1Snapshot.docs[0].data().profileId;
            console.log(`✅ Found Postdoc 1: ${pd1ProfileId}`);
        } else {
            console.log('⚠️ Postdoc 1 not found, creating profile...');
            pd1ProfileId = generateId();
            await db.collection('personProfiles').doc(pd1ProfileId).set({
                id: pd1ProfileId,
                firstName: "Mateo",
                lastName: "Rossi",
                email: pd1Email,
                role: "postdoc",
                labId: labId,
                createdAt: new Date().toISOString()
            });
        }

        // New Postdoc 2
        const pd2ProfileId = generateId();
        await db.collection('personProfiles').doc(pd2ProfileId).set({
            id: pd2ProfileId,
            firstName: "Sarah",
            lastName: "Connor",
            email: "sarah.connor@example.com",
            role: "postdoc",
            labId: labId,
            createdAt: new Date().toISOString()
        });
        console.log(`✅ Created Postdoc 2: ${pd2ProfileId}`);

        // New RA
        const raProfileId = generateId();
        await db.collection('personProfiles').doc(raProfileId).set({
            id: raProfileId,
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            role: "research_assistant",
            labId: labId,
            createdAt: new Date().toISOString()
        });
        console.log(`✅ Created RA: ${raProfileId}`);

        const teamIds = [piProfileId, pd1ProfileId, pd2ProfileId, raProfileId];

        // 2. Create Funding Account
        const fundingId = generateId();
        const fundingAccount = {
            id: fundingId,
            accountNumber: "EI-ISA-2025-001",
            accountName: "Enterprise Ireland - Innovation Seed Award",
            funderId: "enterprise-ireland", // Dummy ID
            funderName: "Enterprise Ireland",
            masterProjectId: "", // Will update after project creation
            masterProjectName: "Novel Aptamer-Based Biosensors",
            accountType: "main",
            totalBudget: 50000,
            spentAmount: 0,
            committedAmount: 0,
            remainingBudget: 50000,
            currency: "EUR",
            startDate: new Date().toISOString(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(), // 2 years
            status: "active",
            createdAt: new Date().toISOString(),
            createdBy: piProfileId,
            labId: labId
        };
        await db.collection('fundingAccounts').doc(fundingId).set(fundingAccount);
        console.log(`✅ Created Funding Account: ${fundingId}`);

        // 3. Create Master Project
        const projectId = generateId();
        const project = {
            id: projectId,
            name: "Novel Aptamer-Based Biosensors",
            description: "Development of high-sensitivity aptamer biosensors for environmental monitoring.",
            status: "active",
            labId: labId,
            ownerId: piProfileId,
            teamMemberIds: teamIds,
            startDate: new Date().toISOString(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
            fundingAccountIds: [fundingId],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await db.collection('masterProjects').doc(projectId).set(project);
        console.log(`✅ Created Project: ${projectId}`);

        // Update Funding with Project ID
        await db.collection('fundingAccounts').doc(fundingId).update({
            masterProjectId: projectId
        });

        // 4. Create Work Packages (4 WPs)
        const wpNames = ["WP1: Target Discovery", "WP2: Aptamer Selection", "WP3: Sensor Optimization", "WP4: Validation & Testing"];
        const wpIds = [];

        for (let i = 0; i < wpNames.length; i++) {
            const wpId = generateId();
            wpIds.push(wpId);
            const wp = {
                id: wpId,
                name: wpNames[i],
                projectId: projectId,
                profileProjectId: projectId, // REQUIRED for legacy service queries
                labId: labId,
                start: new Date(),
                end: new Date(new Date().setMonth(new Date().getMonth() + 6 * (i + 1))), // Staggered by 6 months
                progress: 0,
                status: "planning",
                ownerId: teamIds[i % teamIds.length], // Rotate ownership
                deliverableIds: [], // Will populate
                importance: "high",
                createdAt: new Date().toISOString()
            };
            await db.collection('workpackages').doc(wpId).set(wp);
            console.log(`  Created WP: ${wp.name}`);

            // Update Project with WP ID
            await db.collection('masterProjects').doc(projectId).update({
                workpackageIds: admin.firestore.FieldValue.arrayUnion(wpId)
            });

            // 5. Create Deliverables (5 per WP)
            for (let j = 1; j <= 5; j++) {
                const delId = generateId();
                const deliverable = {
                    id: delId,
                    name: `D${i + 1}.${j}: ${wpNames[i].split(':')[1].trim()} Milestone ${j}`,
                    workpackageId: wpId,
                    progress: 0,
                    status: "todo",
                    ownerId: teamIds[(i + j) % teamIds.length], // Rotate ownership
                    importance: "medium",
                    labId: labId, // REQUIRED for service queries
                    createdAt: new Date().toISOString(),
                    createdBy: piProfileId
                };
                await db.collection('deliverables').doc(delId).set(deliverable);

                // Update WP with deliverable ID
                await db.collection('workpackages').doc(wpId).update({
                    deliverableIds: admin.firestore.FieldValue.arrayUnion(delId)
                });

                // 6. Create Tasks (1 per Deliverable for simplicity, assigned to team)
                const taskId = generateId();
                const task = {
                    id: taskId,
                    title: `Execute work for ${deliverable.name}`,
                    description: "Complete the required experiments and analysis.",
                    status: "todo",
                    importance: "medium",
                    priority: "medium",
                    assigneeIds: [deliverable.ownerId],
                    createdBy: piProfileId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    linkedProjectId: projectId,
                    linkedDeliverableId: delId, // Link to deliverable (custom field logic if needed, but standard is linkedTaskId usually)
                    // Note: DayToDayTask doesn't strictly have linkedDeliverableId in type def, but we can add it or use description
                    labId: labId,
                    tags: ["project-work"]
                };
                await db.collection('dayToDayTasks').doc(taskId).set(task);
            }
        }

        // 7. Purchase Inventory & Equipment (Simulate Ledger)
        console.log('💰 Processing Purchases...');

        const itemsToBuy = [
            { name: "High-Performance Laptop", cost: 2500, cat: "equipment-instruments", type: "equipment" },
            { name: "Fluorescence Microscope", cost: 15000, cat: "equipment-instruments", type: "equipment" },
            { name: "Pipette Set (P10, P20, P200, P1000)", cost: 800, cat: "equipment-instruments", type: "equipment" },
            { name: "Cell Culture Media (DMEM)", cost: 500, cat: "cell-culture", type: "inventory", qty: 20 },
            { name: "FBS (Fetal Bovine Serum)", cost: 1200, cat: "cell-culture", type: "inventory", qty: 10 },
            { name: "PCR Master Mix", cost: 600, cat: "molecular-biology", type: "inventory", qty: 5 },
            { name: "96-well Plates", cost: 300, cat: "general-consumables", type: "inventory", qty: 50 },
            { name: "Nitrile Gloves (M)", cost: 200, cat: "general-consumables", type: "inventory", qty: 20 }
        ];

        let totalSpent = 0;

        for (const item of itemsToBuy) {
            // A. Create Order
            const orderId = generateId();
            const order = {
                id: orderId,
                productName: item.name,
                catNum: "GEN-" + Math.floor(Math.random() * 10000),
                supplier: "BioSupplies Ltd",
                priceExVAT: item.cost,
                currency: "EUR",
                quantity: item.qty || 1,
                totalPrice: item.cost, // Simplified
                status: "received", // Assume bought and received
                accountId: fundingId,
                accountName: fundingAccount.accountName,
                funderId: fundingAccount.funderId,
                funderName: fundingAccount.funderName,
                masterProjectId: projectId,
                masterProjectName: project.name,
                orderedBy: piProfileId,
                orderedDate: new Date(),
                receivedDate: new Date(),
                createdDate: new Date(),
                createdBy: piProfileId,
                labId: labId,
                category: item.cat
            };
            await db.collection('orders').doc(orderId).set(order);

            // B. Ledger Transaction
            const transId = generateId();
            const transaction = {
                id: transId,
                fundingAccountId: fundingId,
                fundingAccountName: fundingAccount.accountName,
                labId: labId,
                orderId: orderId,
                entityType: "order",
                amount: item.cost, // Positive for spent? Usually ledger tracks spend as positive or negative depending on implementation. 
                // Funding type says "amount: number // Transaction amount (positive = spent, negative = refund)"
                currency: "EUR",
                type: "ORDER_RECEIVED",
                status: "FINAL",
                description: `Purchase: ${item.name}`,
                createdAt: new Date().toISOString(),
                createdBy: piProfileId,
                finalizedAt: new Date().toISOString()
            };
            await db.collection('fundingTransactions').doc(transId).set(transaction);
            totalSpent += item.cost;

            // C. Create Inventory/Equipment Item
            if (item.type === 'equipment') {
                await db.collection('equipment').add({
                    name: item.name,
                    category: "Lab Equipment",
                    status: "available",
                    labId: labId,
                    serialNumber: "SN-" + Math.floor(Math.random() * 100000),
                    purchaseDate: new Date(),
                    price: item.cost,
                    supplier: "BioSupplies Ltd",
                    linkedOrderId: orderId
                });
            } else {
                await db.collection('inventory').add({
                    productName: item.name,
                    category: "Consumables",
                    currentQuantity: item.qty || 1,
                    unit: "units",
                    priceExVAT: item.cost / (item.qty || 1),
                    labId: labId,
                    receivedDate: new Date(),
                    inventoryLevel: "full",
                    supplier: "BioSupplies Ltd"
                });
            }
            console.log(`  Bought: ${item.name} (€${item.cost})`);
        }

        // 8. Update Funding Totals
        await db.collection('fundingAccounts').doc(fundingId).update({
            spentAmount: totalSpent,
            remainingBudget: 50000 - totalSpent
        });

        console.log(`✅ Purchases Complete. Total Spent: €${totalSpent}. Remaining: €${50000 - totalSpent}`);
        console.log('🎉 Project Seed Complete!');

    } catch (error) {
        console.error('❌ Error seeding project:', error);
    }
}

seedProject();
