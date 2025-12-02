import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const db = admin.firestore();

// Types (duplicated from frontend for isolation)
type EmailIntegrationProvider = "google" | "outlook";

interface EmailIntegration {
    provider: EmailIntegrationProvider;
    emailAddress: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    scopes: string[];
    connectedAt: string;
    updatedAt: string;
}

interface EmailRule {
    id: string;
    projectId: string;
    userId: string;
    provider: EmailIntegrationProvider | "any";
    senders: string[];
    labelOrFolder?: string;
    isActive: boolean;
}

interface SyncedEmail {
    id: string;
    projectId: string;
    userId: string;
    provider: EmailIntegrationProvider;
    providerMessageId: string;
    threadId?: string;
    from: string;
    to: string[];
    cc?: string[];
    subject: string;
    snippet: string;
    receivedAt: string;
    messageUrl?: string;
    hasAttachments: boolean;
    labels?: string[];
    bodyPreview?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

async function getGoogleAuthClient(userId: string, integration: EmailIntegration) {
    const config = (functions as any).config();
    const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.client_id;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.client_secret;

    if (!clientId || !clientSecret) throw new Error("Google credentials not configured");

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);

    oAuth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.expiryDate,
    });

    // Check if expired and refresh
    if (Date.now() > integration.expiryDate - 60000) {
        try {
            const { credentials } = await oAuth2Client.refreshAccessToken();
            // Update Firestore
            await db.collection("users").doc(userId).collection("integrations").doc("google").update({
                accessToken: credentials.access_token,
                expiryDate: credentials.expiry_date,
                updatedAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`Failed to refresh Google token for user ${userId}`, error);
            throw error;
        }
    }

    return oAuth2Client;
}

async function getOutlookClient(userId: string, integration: EmailIntegration) {
    const config = (functions as any).config();
    const clientId = process.env.MS_CLIENT_ID || config.microsoft?.client_id;
    const clientSecret = process.env.MS_CLIENT_SECRET || config.microsoft?.client_secret;
    const tenantId = "common"; // or specific tenant

    if (!clientId || !clientSecret) throw new Error("Microsoft credentials not configured");

    // Check expiry
    let accessToken = integration.accessToken;
    if (Date.now() > integration.expiryDate - 60000) {
        try {
            const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
            const params = new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: "Mail.Read offline_access",
                refresh_token: integration.refreshToken,
                grant_type: "refresh_token",
            });

            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error_description);

            accessToken = data.access_token;

            // Update Firestore
            await db.collection("users").doc(userId).collection("integrations").doc("outlook").update({
                accessToken: accessToken,
                expiryDate: Date.now() + data.expires_in * 1000,
                updatedAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`Failed to refresh Outlook token for user ${userId}`, error);
            throw error;
        }
    }

    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

// ============================================================================
// SYNC LOGIC
// ============================================================================

export const syncEmails = functions.pubsub.schedule("every 10 minutes").onRun(async (context) => {
    console.log("Starting email sync...");

    // 1. Get all users with integrations
    // This is expensive if we scan all users. Better to have a collection group query or a "syncEnabled" flag.
    // For v1, we'll iterate users who have a 'integrations' subcollection.
    // Actually, we can query `collectionGroup('integrations')`.

    const integrationsSnap = await db.collectionGroup("integrations").get();

    // Group by user
    const userIntegrations: Record<string, EmailIntegration[]> = {};
    integrationsSnap.forEach(doc => {
        const integration = doc.data() as EmailIntegration;
        const userId = doc.ref.parent.parent?.id;
        if (userId) {
            if (!userIntegrations[userId]) userIntegrations[userId] = [];
            userIntegrations[userId].push(integration);
        }
    });

    for (const userId of Object.keys(userIntegrations)) {
        try {
            // Get rules for this user
            // Rules are stored in projects/{projectId}/emailRules
            // We need to find all rules where userId == currentUserId
            const rulesSnap = await db.collectionGroup("emailRules").where("userId", "==", userId).where("isActive", "==", true).get();
            const rules = rulesSnap.docs.map(d => ({ ...d.data(), id: d.id } as EmailRule));

            if (rules.length === 0) continue;

            for (const integration of userIntegrations[userId]) {
                if (integration.provider === "google") {
                    await syncGmail(userId, integration, rules);
                } else if (integration.provider === "outlook") {
                    await syncOutlook(userId, integration, rules);
                }
            }
        } catch (error) {
            console.error(`Error syncing user ${userId}`, error);
        }
    }
});

async function syncGmail(userId: string, integration: EmailIntegration, rules: EmailRule[]) {
    try {
        const auth = await getGoogleAuthClient(userId, integration);
        const gmail = google.gmail({ version: "v1", auth });

        // Filter rules relevant to this provider
        const relevantRules = rules.filter(r => r.provider === "any" || r.provider === "google");
        if (relevantRules.length === 0) return;

        // Build query
        // "from:a@b.com OR from:c@d.com"
        const senders = new Set<string>();
        relevantRules.forEach(r => r.senders.forEach(s => senders.add(s)));

        // Chunk queries if too long? For v1 assume reasonable number.
        const q = `from:(${Array.from(senders).join(" OR ")}) newer_than:1d`; // Sync last 24h for efficiency in v1

        const listRes = await gmail.users.messages.list({
            userId: "me",
            q,
            maxResults: 50,
        });

        const messages = listRes.data.messages || [];

        for (const msg of messages) {
            if (!msg.id) continue;

            // Check if already synced?
            // We'll rely on upsert (set with merge) but ideally we check first to save API calls.
            // But we need the details to know which project it belongs to (sender).

            const details = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "metadata",
                metadataHeaders: ["From", "To", "Cc", "Subject", "Date"],
            });

            const headers = details.data.payload?.headers;
            const from = headers?.find(h => h.name === "From")?.value || "";
            const subject = headers?.find(h => h.name === "Subject")?.value || "";
            const dateStr = headers?.find(h => h.name === "Date")?.value || "";
            const receivedAt = new Date(dateStr).toISOString();

            // Extract email address from "Name <email@domain.com>"
            const fromEmail = from.match(/<(.+)>/)?.[1] || from;

            // Match to projects
            const matchedProjects = new Set<string>();
            relevantRules.forEach(r => {
                if (r.senders.some(s => fromEmail.includes(s))) {
                    matchedProjects.add(r.projectId);
                }
            });

            for (const projectId of matchedProjects) {
                const emailId = `google_${msg.id}`;
                const emailDoc: SyncedEmail = {
                    id: emailId,
                    projectId,
                    userId,
                    provider: "google",
                    providerMessageId: msg.id,
                    threadId: details.data.threadId || undefined,
                    from,
                    to: [], // Parse To/Cc if needed
                    subject,
                    snippet: details.data.snippet || "",
                    receivedAt,
                    messageUrl: `https://mail.google.com/mail/u/0/#all/${msg.id}`,
                    hasAttachments: false, // Need full format to check attachments
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                await db.collection("projects").doc(projectId).collection("emails").doc(emailId).set(emailDoc, { merge: true });
            }
        }

    } catch (error) {
        console.error(`Error in syncGmail for ${userId}`, error);
    }
}

async function syncOutlook(userId: string, integration: EmailIntegration, rules: EmailRule[]) {
    try {
        const client = await getOutlookClient(userId, integration);

        const relevantRules = rules.filter(r => r.provider === "any" || r.provider === "outlook");
        if (relevantRules.length === 0) return;

        const senders = new Set<string>();
        relevantRules.forEach(r => r.senders.forEach(s => senders.add(s)));

        // Build filter
        // (from/emailAddress/address eq 'a@b.com' or ...)
        const senderFilters = Array.from(senders).map(s => `from/emailAddress/address eq '${s}'`).join(" or ");
        const filter = `(${senderFilters}) and receivedDateTime ge ${new Date(Date.now() - 86400000).toISOString()}`;

        const res = await client.api("/me/messages")
            .filter(filter)
            .select("id,conversationId,from,toRecipients,ccRecipients,subject,bodyPreview,receivedDateTime,hasAttachments,webLink")
            .top(50)
            .get();

        const messages = res.value || [];

        for (const msg of messages) {
            const fromEmail = msg.from?.emailAddress?.address || "";

            const matchedProjects = new Set<string>();
            relevantRules.forEach(r => {
                if (r.senders.some(s => fromEmail.includes(s))) {
                    matchedProjects.add(r.projectId);
                }
            });

            for (const projectId of matchedProjects) {
                const emailId = `outlook_${msg.id}`;
                const emailDoc: SyncedEmail = {
                    id: emailId,
                    projectId,
                    userId,
                    provider: "outlook",
                    providerMessageId: msg.id,
                    threadId: msg.conversationId,
                    from: fromEmail,
                    to: msg.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
                    subject: msg.subject || "",
                    snippet: msg.bodyPreview || "",
                    receivedAt: msg.receivedDateTime,
                    messageUrl: msg.webLink,
                    hasAttachments: msg.hasAttachments,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                await db.collection("projects").doc(projectId).collection("emails").doc(emailId).set(emailDoc, { merge: true });
            }
        }

    } catch (error) {
        console.error(`Error in syncOutlook for ${userId}`, error);
    }
}
