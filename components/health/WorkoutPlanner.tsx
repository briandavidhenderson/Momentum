"use client";


import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Dumbbell, Save } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createWorkoutPlan, getWorkoutPlans, getExercises } from "@/lib/services/healthService";
import { WorkoutPlan, WorkoutExercise, Exercise } from "@/lib/types/health.types";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkoutPlanner() {
    const { currentUserProfile } = useAuth();
    const { toast } = useToast();
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // New Plan State
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanDescription, setNewPlanDescription] = useState("");
    const [newPlanExercises, setNewPlanExercises] = useState<WorkoutExercise[]>([]);

    useEffect(() => {
        if (currentUserProfile?.id) {
            loadPlans();
            loadExercises();
        }
    }, [currentUserProfile?.id]);

    const loadPlans = async () => {
        if (!currentUserProfile?.id) return;
        try {
            const fetchedPlans = await getWorkoutPlans(currentUserProfile.id);
            setPlans(fetchedPlans);
        } catch (error) {
            console.error("Failed to load workout plans", error);
        }
    };

    const loadExercises = async () => {
        try {
            const exercises = await getExercises();
            setAvailableExercises(exercises);
        } catch (error) {
            console.error("Failed to load exercises", error);
        }
    };

    const handleAddExercise = () => {
        const newExercise: WorkoutExercise = {
            exerciseId: "",
            name: "",
            sets: 3,
            reps: 10,
            order: newPlanExercises.length + 1
        };
        setNewPlanExercises([...newPlanExercises, newExercise]);
    };

    const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
        const updated = [...newPlanExercises];
        updated[index] = { ...updated[index], [field]: value };

        // If updating ID, also update name
        if (field === "exerciseId") {
            const selected = availableExercises.find(e => e.id === value);
            if (selected) {
                updated[index].name = selected.name;
            }
        }
        setNewPlanExercises(updated);
    };

    const handleRemoveExercise = (index: number) => {
        const updated = [...newPlanExercises];
        updated.splice(index, 1);
        setNewPlanExercises(updated);
    };

    const handleCreatePlan = async () => {
        if (!currentUserProfile?.id || !newPlanName) return;

        setLoading(true);
        try {
            const newPlan: Omit<WorkoutPlan, "id"> = {
                name: newPlanName,
                description: newPlanDescription,
                exercises: newPlanExercises,
                createdBy: currentUserProfile.id,
                isPublic: false,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await createWorkoutPlan(newPlan);
            toast({ title: "Success", description: "Workout plan created successfully." });
            setIsCreateOpen(false);
            resetForm();
            loadPlans();
        } catch (error) {
            console.error("Failed to create plan", error);
            toast({ title: "Error", description: "Failed to create workout plan.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewPlanName("");
        setNewPlanDescription("");
        setNewPlanExercises([]);
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>My Workout Plans</CardTitle>
                        <CardDescription>Manage your training routines.</CardDescription>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Plan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Workout Plan</DialogTitle>
                                <DialogDescription>Design a new routine to follow.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Plan Name</Label>
                                    <Input
                                        id="name"
                                        value={newPlanName}
                                        onChange={(e) => setNewPlanName(e.target.value)}
                                        placeholder="e.g., Upper Body Power"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={newPlanDescription}
                                        onChange={(e) => setNewPlanDescription(e.target.value)}
                                        placeholder="Briefly describe this routine..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Exercises</Label>
                                        <Button variant="outline" size="sm" onClick={handleAddExercise}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Exercise
                                        </Button>
                                    </div>
                                    <div className="border rounded-md p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                        {newPlanExercises.length === 0 ? (
                                            <div className="text-center text-muted-foreground text-sm py-8">
                                                No exercises added yet.
                                            </div>
                                        ) : (
                                            newPlanExercises.map((ex, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                                    <div className="grid gap-2 flex-1">
                                                        <Select
                                                            value={ex.exerciseId}
                                                            onValueChange={(val) => updateExercise(idx, "exerciseId", val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Exercise" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableExercises.map(e => (
                                                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <Label className="text-xs">Sets</Label>
                                                                <Input
                                                                    type="number"
                                                                    className="h-8 w-16"
                                                                    value={ex.sets}
                                                                    onChange={(e) => updateExercise(idx, "sets", parseInt(e.target.value))}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Label className="text-xs">Reps</Label>
                                                                <Input
                                                                    type="number"
                                                                    className="h-8 w-16"
                                                                    value={ex.reps}
                                                                    onChange={(e) => updateExercise(idx, "reps", parseInt(e.target.value))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveExercise(idx)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreatePlan} disabled={loading || !newPlanName}>
                                    {loading ? "Saving..." : "Save Plan"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {plans.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            No workout plans created yet.
                            <br />
                            Start by creating a new routine.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {plans.map((plan) => (
                                <Card key={plan.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                                    <CardHeader>
                                        <CardTitle className="text-base">{plan.name}</CardTitle>
                                        <CardDescription className="line-clamp-2">{plan.description || "No description"}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground">
                                            {plan.exercises.length} exercises
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
