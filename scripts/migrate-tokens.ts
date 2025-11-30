/**
 * Token Migration Script - Firestore to Google Secret Manager
 * Standalone version of the Cloud Function for local execution
 */

import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

interface TokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    provider: 'google' | 'microsoft';
    userId: string;
    email: string;
    createdAt: string;
    lastRefreshedAt: string;
}

function getProjectId(): string {
    // Try to get from authenticated client or env vars
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'momentum-a60c5';
    if (!projectId) {
        throw new Error('Project ID not found in environment variables');
    }
    return projectId;
}

function getSecretName(connectionId: string): string {
    const projectId = getProjectId();
    return `projects/${projectId}/secrets/calendar-token-${connectionId}`;
}

async function tokensExist(connectionId: string): Promise<boolean> {
    try {
        const secretName = getSecretName(connectionId);
        await secretManager.getSecret({ name: secretName });
        return true;
    } catch (error: any) {
        if (error.code === 5) { // NOT_FOUND
            return false;
        }
        throw error;
    }
}

async function storeTokens(
    connectionId: string,
    tokenData: Omit<TokenData, 'connectionId'>
): Promise<void> {
    const projectId = getProjectId();
    const secretId = `calendar-token-${connectionId}`;
    const parent = `projects/${projectId}`;

    const payload = JSON.stringify({
        ...tokenData,
        connectionId,
        storedAt: new Date().toISOString(),
    });

    let secretExists = false;
    try {
        await secretManager.getSecret({ name: `${parent}/secrets/${secretId}` });
        secretExists = true;
    } catch (error: any) {
        if (error.code !== 5) throw error;
    }

    if (!secretExists) {
        const [secret] = await secretManager.createSecret({
            parent,
            secretId,
            secret: {
                replication: {
                    automatic: {},
                },
                labels: {
                    type: 'calendar-oauth-token',
                    provider: tokenData.provider,
                },
            },
        });

        // Grant access to the Cloud Functions service account
        // Note: In local script, we might not need to do this if we are just migrating data
        // But it's good practice to set it up for the runtime
        const serviceAccount = `${projectId}@appspot.gserviceaccount.com`;
        try {
            await secretManager.setIamPolicy({
                resource: secret.name,
                policy: {
                    bindings: [
                        {
                            role: 'roles/secretmanager.secretAccessor',
                            members: [`serviceAccount:${serviceAccount}`],
                        },
                    ],
                },
            });
            console.log(`IAM granted to ${serviceAccount}`);
        } catch (iamError) {
            console.warn('Failed to grant IAM permissions (might need manual setup):', iamError);
        }
    }

    await secretManager.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: {
            data: Buffer.from(payload, 'utf8'),
        },
    });
}

async function migrateTokens() {
    console.log('Starting token migration...');
    const projectId = getProjectId();
    console.log(`Target Project ID: ${projectId}`);

    const connectionsSnapshot = await db.collection('calendarConnections').get();
    const tokensSnapshot = await db.collection('_calendarTokens').get();

    console.log(`Found ${connectionsSnapshot.size} connections and ${tokensSnapshot.size} tokens.`);

    const firestoreTokens = new Map<string, any>();
    tokensSnapshot.docs.forEach((doc) => {
        firestoreTokens.set(doc.id, doc.data());
    });

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const connectionDoc of connectionsSnapshot.docs) {
        const connectionId = connectionDoc.id;
        const connectionData = connectionDoc.data();
        const userId = connectionData.userId;
        const provider = connectionData.provider;

        console.log(`Processing connection ${connectionId} (${provider})...`);

        try {
            const firestoreToken = firestoreTokens.get(connectionId);

            if (!firestoreToken) {
                console.log(`  Skipped: No token found in Firestore`);
                skippedCount++;
                continue;
            }

            const alreadyMigrated = await tokensExist(connectionId);
            if (alreadyMigrated) {
                console.log(`  Skipped: Already in Secret Manager`);
                skippedCount++;
                continue;
            }

            const tokenData: Omit<TokenData, 'connectionId'> = {
                accessToken: firestoreToken.accessToken,
                refreshToken: firestoreToken.refreshToken,
                expiresAt: firestoreToken.expiresAt || Date.now() + 3600000,
                provider: provider as 'google' | 'microsoft',
                userId,
                email: connectionData.email || 'unknown',
                createdAt: firestoreToken.createdAt || connectionData.createdAt || new Date().toISOString(),
                lastRefreshedAt: firestoreToken.updatedAt || firestoreToken.lastRefreshedAt || new Date().toISOString(),
            };

            await storeTokens(connectionId, tokenData);
            console.log(`  Success: Migrated to Secret Manager`);
            migratedCount++;

        } catch (error) {
            console.error(`  Failed: ${error instanceof Error ? error.message : String(error)}`);
            failedCount++;
        }
    }

    console.log('\nMigration Summary:');
    console.log(`Total: ${connectionsSnapshot.size}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);
}

// Run if called directly
if (require.main === module) {
    migrateTokens()
        .then(() => {
            console.log('Done.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
