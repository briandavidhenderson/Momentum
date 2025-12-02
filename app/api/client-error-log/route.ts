import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initAdminApp } from "@/lib/firebaseAdmin";

const app = initAdminApp();
const db = app ? getFirestore(app) : null;

export async function POST(req: NextRequest) {
    try {
        if (!db) {
            // If Firebase Admin failed to initialize (e.g. local dev without credentials),
            // just ignore the log request to prevent 500 errors in console.
            return NextResponse.json({ ok: false, reason: "Server configuration missing" }, { status: 200 });
        }

        const body = await req.json();

        // Basic sanity limit
        const message = String(body.message ?? body.reason ?? "").slice(0, 5000);

        await db.collection("clientErrorLogs").add({
            ...body,
            message,
            createdAt: new Date(),
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        // Don't throw – this is just logging
        return NextResponse.json({ ok: false }, { status: 200 });
    }
}
