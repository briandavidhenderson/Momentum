import { NextRequest, NextResponse } from "next/server";
import { saveEmailIntegration, deleteEmailIntegration } from "@/lib/services/emailService";
import { EmailIntegration } from "@/lib/types/email.types";

// Helper to get base URL
const getBaseUrl = (req: NextRequest) => {
    const host = req.headers.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    return `${protocol}://${host}`;
};

export async function GET(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    const provider = params.provider;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const userId = searchParams.get("state"); // We pass userId in state for simplicity (CSRF protection recommended in prod)

    if (error) {
        return NextResponse.redirect(new URL(`/settings/integrations?error=${error}`, request.url));
    }

    // 1. START FLOW
    if (!code) {
        // We need the user ID to pass in state. 
        // In a real app, we'd check the session cookie or auth header here.
        // For this implementation, we assume the frontend redirects here with ?userId=... 
        // OR we rely on the client to call this endpoint.
        // Actually, standard OAuth redirects the browser. We can't easily get the user ID unless passed.
        // Let's assume the frontend passes `?userId=...` for the start flow.
        const uid = searchParams.get("userId");
        if (!uid) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        if (provider === "google") {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const redirectUri = `${getBaseUrl(request)}/api/oauth/google`;
            const scope = "https://www.googleapis.com/auth/gmail.readonly";

            const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${uid}`;
            return NextResponse.redirect(url);
        }

        if (provider === "outlook") {
            const clientId = process.env.MS_CLIENT_ID;
            const redirectUri = `${getBaseUrl(request)}/api/oauth/outlook`;
            const scope = "Mail.Read offline_access";

            const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${uid}`;
            return NextResponse.redirect(url);
        }

        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // 2. CALLBACK FLOW
    if (code && userId) {
        try {
            if (provider === "google") {
                const clientId = process.env.GOOGLE_CLIENT_ID;
                const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
                const redirectUri = `${getBaseUrl(request)}/api/oauth/google`;

                const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        code,
                        client_id: clientId!,
                        client_secret: clientSecret!,
                        redirect_uri: redirectUri,
                        grant_type: "authorization_code",
                    }),
                });

                const tokens = await tokenRes.json();
                if (tokens.error) throw new Error(tokens.error_description || tokens.error);

                const integration: EmailIntegration = {
                    provider: "google",
                    emailAddress: "unknown@gmail.com", // We should fetch profile to get email
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token, // Only returned on first consent
                    expiryDate: Date.now() + tokens.expires_in * 1000,
                    scopes: tokens.scope.split(" "),
                    connectedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                // Fetch user profile to get email
                const profileRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                const profile = await profileRes.json();
                if (profile.email) integration.emailAddress = profile.email;

                await saveEmailIntegration(userId, integration);
            } else if (provider === "outlook") {
                const clientId = process.env.MS_CLIENT_ID;
                const clientSecret = process.env.MS_CLIENT_SECRET;
                const redirectUri = `${getBaseUrl(request)}/api/oauth/outlook`;

                const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId!,
                        client_secret: clientSecret!,
                        code,
                        redirect_uri: redirectUri,
                        grant_type: "authorization_code",
                    }),
                });

                const tokens = await tokenRes.json();
                if (tokens.error) throw new Error(tokens.error_description || tokens.error);

                const integration: EmailIntegration = {
                    provider: "outlook",
                    emailAddress: "unknown@outlook.com",
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiryDate: Date.now() + tokens.expires_in * 1000,
                    scopes: tokens.scope.split(" "),
                    connectedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                // Fetch profile
                const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                const profile = await profileRes.json();
                if (profile.mail || profile.userPrincipalName) {
                    integration.emailAddress = profile.mail || profile.userPrincipalName;
                }

                await saveEmailIntegration(userId, integration);
            }

            return NextResponse.redirect(new URL("/settings/integrations?success=true", request.url));
        } catch (err: any) {
            console.error("OAuth Error:", err);
            return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(err.message)}`, request.url));
        }
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function POST(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    const provider = params.provider as "google" | "outlook";
    const { userId } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        await deleteEmailIntegration(userId, provider);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
