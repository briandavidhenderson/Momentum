import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initAdminApp } from "@/lib/firebaseAdmin";

initAdminApp();
const db = getFirestore();

export async function POST(req: NextRequest) {
    try {
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
