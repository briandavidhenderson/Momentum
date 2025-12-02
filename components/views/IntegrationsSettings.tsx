"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmailIntegration, deleteEmailIntegration } from "@/lib/services/emailService";
import { EmailIntegration } from "@/lib/types/email.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function IntegrationsSettings() {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [googleIntegration, setGoogleIntegration] = useState<EmailIntegration | null>(null);
    const [outlookIntegration, setOutlookIntegration] = useState<EmailIntegration | null>(null);
    const [loading, setLoading] = useState(true);

    const loadIntegrations = useCallback(async () => {
        if (!currentUser?.uid) return;
        try {
            const [google, outlook] = await Promise.all([
                getEmailIntegration(currentUser.uid, "google"),
                getEmailIntegration(currentUser.uid, "outlook"),
            ]);
            setGoogleIntegration(google);
            setOutlookIntegration(outlook);
        } catch (error) {
            console.error("Failed to load integrations", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.uid) return;
        loadIntegrations();
    }, [currentUser?.uid, loadIntegrations]);

    const handleConnect = (provider: "google" | "outlook") => {
        if (!currentUser?.uid) return;
        // Redirect to API route
        window.location.href = `/api/oauth/${provider}?userId=${currentUser.uid}`;
    };

    const handleDisconnect = async (provider: "google" | "outlook") => {
        if (!currentUser?.uid) return;
        if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

        try {
            // Call API to disconnect (revocation)
            const res = await fetch(`/api/oauth/${provider}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser.uid }),
            });

            if (!res.ok) throw new Error("Failed to disconnect");

            toast({ title: "Disconnected", description: `Successfully disconnected ${provider}` });
            loadIntegrations();
        } catch (error) {
            toast({ title: "Error", description: "Failed to disconnect integration", variant: "destructive" });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Email Integrations</h2>
                <p className="text-muted-foreground">Connect your email accounts to sync messages with projects.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Google Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Google / Gmail</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 space-y-4">
                            {googleIntegration ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm font-medium">{googleIntegration.emailAddress}</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleDisconnect("google")}>
                                        Disconnect
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Not connected</span>
                                    </div>
                                    <Button size="sm" onClick={() => handleConnect("google")}>
                                        Connect Gmail
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Outlook Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Microsoft Outlook</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 space-y-4">
                            {outlookIntegration ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-sm font-medium">{outlookIntegration.emailAddress}</span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleDisconnect("outlook")}>
                                        Disconnect
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Not connected</span>
                                    </div>
                                    <Button size="sm" onClick={() => handleConnect("outlook")}>
                                        Connect Outlook
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
