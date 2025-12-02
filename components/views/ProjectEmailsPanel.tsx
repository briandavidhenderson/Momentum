"use client";

import { useState, useEffect } from "react";
import { getProjectEmails } from "@/lib/services/emailService";
import { SyncedEmail } from "@/lib/types/email.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectEmailsPanelProps {
    projectId: string;
}

export function ProjectEmailsPanel({ projectId }: ProjectEmailsPanelProps) {
    const [emails, setEmails] = useState<SyncedEmail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) loadEmails();
    }, [projectId]);

    const loadEmails = async () => {
        setLoading(true);
        try {
            const data = await getProjectEmails(projectId);
            setEmails(data);
        } catch (error) {
            console.error("Failed to load emails", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading emails...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Synced Emails
                </h3>
                <Button variant="ghost" size="sm" onClick={loadEmails}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="space-y-2">
                {emails.map((email) => (
                    <Card key={email.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold truncate">{email.from}</span>
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            {email.provider}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-sm mb-1 truncate">{email.subject}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {email.snippet}
                                    </p>
                                </div>
                                {email.messageUrl && (
                                    <Button variant="ghost" size="icon" asChild>
                                        <a href={email.messageUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {emails.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
                        No emails synced yet. Check your rules or wait for the next sync cycle.
                    </div>
                )}
            </div>
        </div>
    );
}
