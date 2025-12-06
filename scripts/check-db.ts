
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { initAdminApp } from "../lib/firebaseAdmin";

// Initialize
initAdminApp();
const db = admin.firestore();
const auth = admin.auth();

async function check() {
    console.log("🔍 Checking Database State...");
    const dump: any = { orgs: [], labs: [], users: [] };

    const orgs = await db.collection("organisations").get();
    orgs.forEach(doc => dump.orgs.push({ id: doc.id, ...doc.data() }));

    const labs = await db.collection("labs").get();
    labs.forEach(doc => dump.labs.push({ id: doc.id, ...doc.data() }));

    const profiles = await db.collection("personProfiles").get();
    dump.profiles = [];
    profiles.forEach(doc => dump.profiles.push({ id: doc.id, ...doc.data() }));

    try {
        const listUsers = await auth.listUsers();
        listUsers.users.forEach(u => dump.users.push({ email: u.email, uid: u.uid }));
    } catch (e) {
        console.error("Error listing users:", e);
        dump.usersError = e;
    }

    fs.writeFileSync('db_dump.json', JSON.stringify(dump, null, 2));
    console.log("Dump written to db_dump.json");
}

check().then(() => process.exit(0)).catch(e => console.error(e));
