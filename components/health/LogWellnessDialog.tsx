"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logHealthMetric } from "@/lib/services/healthService";
import { useAuth } from "@/lib/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface LogWellnessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: () => void;
}

export function LogWellnessDialog({ open, onOpenChange, onSaved }: LogWellnessDialogProps) {
    const { currentUserProfile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [sleepHours, setSleepHours] = useState<number>(7);
    const [stressLevel, setStressLevel] = useState<number>(3); // 1-5
    const [mood, setMood] = useState<string>("good");
    const [water, setWater] = useState<number>(0);
    const [notes, setNotes] = useState("");

    const handleSave = async () => {
        if (!currentUserProfile?.id) return;

        setLoading(true);
        try {
            await logHealthMetric({
                profileId: currentUserProfile.id,
                date: new Date().toISOString().split('T')[0],
                sleepHours,
                stressLevel: stressLevel as any,
                mood: mood as any, // Simplified mapping
                waterIntakeLitres: water,
                notes
            });

            toast({
                title: "Wellness Logged",
                description: "Your daily stats have been saved.",
            });

            onSaved?.();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to save wellness data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Log Daily Wellness</DialogTitle>
                    <DialogDescription>Record your daily health metrics to track recovery.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">

                    {/* Sleep */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Sleep Duration</Label>
                            <span className="text-sm text-muted-foreground">{sleepHours} hrs</span>
                        </div>
                        <Slider
                            value={[sleepHours]}
                            min={0}
                            max={12}
                            step={0.5}
                            onValueChange={(v) => setSleepHours(v[0])}
                        />
                    </div>

                    {/* Stress */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Stress Level (1-5)</Label>
                            <span className="text-sm text-muted-foreground">{stressLevel}/5</span>
                        </div>
                        <Slider
                            value={[stressLevel]}
                            min={1}
                            max={5}
                            step={1}
                            onValueChange={(v) => setStressLevel(v[0])}
                        />
                        <p className="text-xs text-muted-foreground">1 = Zen, 5 = Overwhelmed</p>
                    </div>

                    {/* Mood */}
                    <div className="space-y-2">
                        <Label>Mood</Label>
                        <Select value={mood} onValueChange={setMood}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="great">Great 🤩</SelectItem>
                                <SelectItem value="good">Good 🙂</SelectItem>
                                <SelectItem value="neutral">Neutral 😐</SelectItem>
                                <SelectItem value="tired">Tired 😴</SelectItem>
                                <SelectItem value="exhausted">Exhausted 😫</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Water */}
                    <div className="space-y-2">
                        <Label>Water Intake (Litres)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={water}
                            onChange={(e) => setWater(parseFloat(e.target.value))}
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="How are you feeling today?"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Log"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
