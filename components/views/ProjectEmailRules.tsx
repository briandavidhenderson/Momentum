"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createEmailRule, getProjectEmailRules, deleteEmailRule } from "@/lib/services/emailService";
import { EmailRule } from "@/lib/types/email.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface ProjectEmailRulesProps {
    projectId: string;
}

export function ProjectEmailRules({ projectId }: ProjectEmailRulesProps) {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [rules, setRules] = useState<EmailRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSender, setNewSender] = useState("");
    const [provider, setProvider] = useState<"any" | "google" | "outlook">("any");

    useEffect(() => {
        if (projectId) loadRules();
    }, [projectId]);

    const loadRules = async () => {
        try {
            const data = await getProjectEmailRules(projectId);
            setRules(data);
        } catch (error) {
            console.error("Failed to load rules", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async () => {
        if (!currentUser?.uid || !newSender) return;

        try {
            await createEmailRule({
                projectId,
                userId: currentUser.uid,
                provider,
                senders: [newSender], // For v1, single sender per rule entry for simplicity
                isActive: true,
            });

            setNewSender("");
            loadRules();
            toast({ title: "Rule Added", description: `Emails from ${newSender} will be synced.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to add rule", variant: "destructive" });
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm("Are you sure you want to delete this rule?")) return;
        try {
            await deleteEmailRule(projectId, ruleId);
            loadRules();
            toast({ title: "Rule Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete rule", variant: "destructive" });
        }
    };

    if (loading) return <div>Loading rules...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Sync Rules
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Sender email (e.g. supplier@company.com)"
                        value={newSender}
                        onChange={(e) => setNewSender(e.target.value)}
                    />
                    <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="google">Gmail</SelectItem>
                            <SelectItem value="outlook">Outlook</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddRule} disabled={!newSender}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rule
                    </Button>
                </div>

                <div className="space-y-2">
                    {rules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                            <div className="flex flex-col">
                                <span className="font-medium">{rule.senders.join(", ")}</span>
                                <span className="text-xs text-muted-foreground">
                                    Provider: {rule.provider} • Owner: {rule.userId === currentUser?.uid ? "You" : "Other"}
                                </span>
                            </div>
                            {rule.userId === currentUser?.uid && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {rules.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No rules defined. Add a sender to sync emails to this project.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
