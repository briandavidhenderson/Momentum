
import * as admin from 'firebase-admin';
require('dotenv').config({ path: '.env.local' });
import { initAdminApp } from "../lib/firebaseAdmin";
import { PersonProfile, Lab, Organisation, Institute, MasterProject } from "../lib/types";

// Initialize
initAdminApp();
const adminDb = admin.firestore();
const adminAuth = admin.auth();

// Storyboard Data
const users = [
    {
        email: "aoife.byrne@example.com",
        password: "password123",
        displayName: "Aoife Byrne",
        role: "Principal Investigator",
        labName: "Byrne Lab for Molecular Oncology",
        projectName: "Targeting RAS-driven tumors",
    },
    {
        email: "sarah.oconnell@example.com",
        description: "Lab Manager",
        password: "password123",
        displayName: "Sarah O'Connell",
        role: "Lab Manager",
        labName: "Byrne Lab for Molecular Oncology",
    },
    {
        email: "mateo.rossi@example.com",
        password: "password123",
        displayName: "Dr. Mateo Rossi",
        role: "Researcher",
        labName: "Byrne Lab for Molecular Oncology",
        projectName: "Crispr-Cas9 Screen for Drug Resistance",
    },
    {
        email: "priya.nair@example.com",
        password: "password123",
        displayName: "Priya Nair",
        role: "Student",
        labName: "Byrne Lab for Molecular Oncology",
        projectName: "Characterizing Clone 4B7",
    },
    {
        email: "james.liu@example.com",
        password: "password123",
        displayName: "James Liu",
        role: "Analyst",
        labName: "Byrne Lab for Molecular Oncology",
        projectName: "Single-Cell RNA Seq Analysis Pipeline",
    }
];

async function seed() {
    console.log("🌱 Starting Seeding Process...");

    // 1. Create Organization & Institute (Once)
    const orgRef = adminDb.collection("organisations").doc("org_nui_galway");
    await orgRef.set({
        name: "National University of Ireland, Galway",
        country: "Ireland",
        type: "university",
        createdAt: new Date().toISOString()
    });

    const instRef = adminDb.collection("institutes").doc("inst_medicine");
    await instRef.set({
        name: "School of Medicine",
        organisationId: "org_nui_galway",
        organisationName: "National University of Ireland, Galway",
        createdAt: new Date().toISOString()
    });

    // 2. Create Lab (Once)
    const labRef = adminDb.collection("labs").doc("lab_byrne");
    await labRef.set({
        name: "Byrne Lab for Molecular Oncology",
        organisationId: "org_nui_galway",
        organisationName: "National University of Ireland, Galway",
        instituteId: "inst_medicine",
        instituteName: "School of Medicine",
        createdAt: new Date().toISOString()
    });

    // 3. Create Users
    for (const user of users) {
        try {
            console.log(`Processing ${user.email}...`);

            // Create Auth User
            let uid = "";
            try {
                const u = await adminAuth.getUserByEmail(user.email);
                uid = u.uid;
                console.log(`  User exists: ${uid}`);
            } catch (e) {
                const u = await adminAuth.createUser({
                    email: user.email,
                    password: user.password,
                    displayName: user.displayName,
                    emailVerified: true
                });
                uid = u.uid;
                console.log(`  Created Auth User: ${uid}`);
            }

            // Create Profile
            const profileRef = adminDb.collection("personProfiles").doc(uid); // Use UID as Profile ID for simplicity
            const profileData: any = {
                firstName: user.displayName.split(" ")[0],
                lastName: user.displayName.split(" ").slice(1).join(" "),
                displayName: user.displayName,
                email: user.email,
                labId: "lab_byrne",
                labName: user.labName,
                userId: uid,
                organisationId: "org_nui_galway",
                organisationName: "National University of Ireland, Galway",
                instituteId: "inst_medicine",
                instituteName: "School of Medicine",
                onboardingComplete: true,
                profileComplete: true,
                consentGiven: true,
                position: user.role, // Legacy
                positionLevel: user.role === "Principal Investigator" ? "principal_investigator" : "postdoctoral_researcher", // Approximation
                isPrincipalInvestigator: user.role === "Principal Investigator",
                role: user.role,
                createdAt: new Date().toISOString(),
            };

            await profileRef.set(profileData, { merge: true });
            console.log(`  Created/Updated Profile: ${uid}`);

            // Create User Document (Required for useAuth to switch to 'app' state)
            const userRef = adminDb.collection("users").doc(uid);
            await userRef.set({
                uid: uid,
                email: user.email,
                fullName: user.displayName,
                profileId: uid, // Link to the profile we just created
                isAdministrator: false,
                createdAt: new Date().toISOString(),
            }, { merge: true });
            console.log(`  Created/Updated User Doc: ${uid}`);

            // Create Project (if PI or lead)
            if (user.projectName) {
                const projRef = adminDb.collection("masterProjects").doc();
                await projRef.set({
                    name: user.projectName,
                    description: `Seeded project for ${user.displayName}`,
                    labId: "lab_byrne",
                    labName: user.labName,
                    status: "active",
                    visibility: "lab",
                    createdBy: uid,
                    principalInvestigatorIds: user.role === "Principal Investigator" ? [uid] : [],
                    teamMemberIds: [uid],
                    createdAt: new Date().toISOString(),
                } as any); // Type cast partly for loose Admin types
                console.log(`  Created Project: ${user.projectName}`);
            }

        } catch (err) {
            console.error(`  Error processing ${user.email}:`, err);
        }
    }

    console.log("✅ Seeding Complete.");
}

seed().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
