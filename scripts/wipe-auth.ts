
import * as admin from 'firebase-admin';
require('dotenv').config({ path: '.env.local' });
import { initAdminApp } from "../lib/firebaseAdmin";

// Initialize
initAdminApp();
const auth = admin.auth();

async function wipeAuthUsers() {
    console.log("🔥 Wiping Auth Users...");
    let nextPageToken;
    let deletedCount = 0;

    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        const uids = listUsersResult.users.map(user => user.uid);

        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            deletedCount += uids.length;
            console.log(`Deleted batch of ${uids.length} users...`);
        }

        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`✅ Successfully deleted ${deletedCount} users.`);
}

wipeAuthUsers().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
