const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (error) {
        console.warn("Init failed", error);
    }
}

const db = admin.firestore();
const auth = admin.auth();

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function wipeAuthUsers() {
    console.log("🔥 Wiping Auth Users...");
    try {
        const listUsersResult = await auth.listUsers(1000);
        const uids = listUsersResult.users.map(user => user.uid);
        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            console.log(`Deleted ${uids.length} users.`);
            // Recurse if there were more users (unlikely for dev but good practice)
            if (listUsersResult.pageToken) await wipeAuthUsers();
        } else {
            console.log("No users found to delete.");
        }
    } catch (error) {
        console.error("Error wiping auth users:", error);
    }
}

async function wipe() {
    console.log("🔥 Wiping Database...");
    const collections = ["organisations", "institutes", "labs", "users", "personProfiles", "masterProjects", "inventory", "equipment", "protocols"];

    await wipeAuthUsers();

    for (const col of collections) {
        console.log(`Deleting ${col}...`);
        await deleteCollection(col, 50);
    }
    console.log("✅ Wiped Data & Users.");
}

wipe().then(() => process.exit(0)).catch(e => console.error(e));
