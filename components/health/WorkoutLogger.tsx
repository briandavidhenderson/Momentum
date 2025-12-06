
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Plus, CheckCircle2, Circle, Timer, Save, X } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getWorkoutPlans, scheduleSession, getExercises } from "@/lib/services/healthService";
import { WorkoutPlan, WorkoutSession, WorkoutSessionExercise, Exercise } from "@/lib/types/health.types";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export function WorkoutLogger() {
    const { currentUserProfile } = useAuth();
    const { toast } = useToast();
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);

    // Active Session State
    const [isActive, setIsActive] = useState(false);
    const [sessionName, setSessionName] = useState("");
    const [sessionExercises, setSessionExercises] = useState<WorkoutSessionExercise[]>([]);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (currentUserProfile?.id) {
            loadData();
        }
        return () => stopTimer();
    }, [currentUserProfile?.id]);

    const loadData = async () => {
        if (!currentUserProfile?.id) return;
        try {
            const [fetchedPlans, fetchedExercises] = await Promise.all([
                getWorkoutPlans(currentUserProfile.id),
                getExercises()
            ]);
            setPlans(fetchedPlans);
            setExercises(fetchedExercises);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const startTimer = () => {
        if (timerRef.current) return;
        setStartTime(new Date());
        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleStartSession = (plan?: WorkoutPlan) => {
        setIsActive(true);
        setElapsedSeconds(0);
        startTimer();

        if (plan) {
            setSessionName(plan.name);
            // Map plan exercises to session exercises
            const mappedExercises: WorkoutSessionExercise[] = plan.exercises.map(ex => ({
                ...ex,
                completedSets: Array.from({ length: ex.sets }).map((_, i) => ({
                    setNumber: i + 1,
                    completed: false,
                    reps: ex.reps, // Default target
                    weight: 0
                }))
            }));
            setSessionExercises(mappedExercises);
        } else {
            setSessionName("Quick Workout");
            setSessionExercises([]);
        }
    };

    const handleAddExercise = () => {
        const newExercise: WorkoutSessionExercise = {
            exerciseId: "",
            name: "",
            sets: 3,
            order: sessionExercises.length + 1,
            completedSets: [
                { setNumber: 1, completed: false, weight: 0, reps: 10 },
                { setNumber: 2, completed: false, weight: 0, reps: 10 },
                { setNumber: 3, completed: false, weight: 0, reps: 10 }
            ]
        };
        setSessionExercises([...sessionExercises, newExercise]);
    };

    const updateExercise = (index: number, field: keyof WorkoutSessionExercise, value: any) => {
        const updated = [...sessionExercises];
        updated[index] = { ...updated[index], [field]: value };

        if (field === "exerciseId") {
            const selected = exercises.find(e => e.id === value);
            if (selected) {
                updated[index].name = selected.name;
            }
        }
        setSessionExercises(updated);
    };

    const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
        const updated = [...sessionExercises];
        const set = updated[exerciseIndex].completedSets[setIndex];
        set.completed = !set.completed;
        setSessionExercises(updated);
    };

    const updateSetData = (exerciseIndex: number, setIndex: number, field: "weight" | "reps", value: number) => {
        const updated = [...sessionExercises];
        updated[exerciseIndex].completedSets[setIndex][field] = value;
        setSessionExercises(updated);
    };

    const handleFinishSession = async () => {
        if (!currentUserProfile?.id) return;
        stopTimer();

        try {
            const session: Omit<WorkoutSession, "id"> = {
                profileId: currentUserProfile.id,
                name: sessionName,
                scheduledAt: startTime?.toISOString() || new Date().toISOString(),
                completedAt: new Date().toISOString(),
                status: "completed",
                exercises: sessionExercises,
                totalDurationMinutes: Math.floor(elapsedSeconds / 60),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await scheduleSession(session);
            toast({ title: "Workout Saved", description: "Great job! Your session has been logged." });
            setIsActive(false);
            setSessionExercises([]);
        } catch (error) {
            console.error("Failed to save session", error);
            toast({ title: "Error", description: "Failed to save workout.", variant: "destructive" });
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isActive) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl text-primary">{sessionName}</CardTitle>
                            <CardDescription>Active Session</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-2xl font-mono font-bold">
                            <Timer className="h-6 w-6 text-muted-foreground" />
                            {formatTime(elapsedSeconds)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {sessionExercises.map((ex, exIdx) => (
                            <div key={exIdx} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    {ex.exerciseId ? (
                                        <h3 className="font-semibold text-lg">{ex.name}</h3>
                                    ) : (
                                        <Select
                                            value={ex.exerciseId}
                                            onValueChange={(val) => updateExercise(exIdx, "exerciseId", val)}
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Select Exercise" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exercises.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="grid grid-cols-10 gap-2 text-sm text-muted-foreground mb-1 px-2">
                                    <div className="col-span-1">Set</div>
                                    <div className="col-span-3 text-center">kg</div>
                                    <div className="col-span-3 text-center">Reps</div>
                                    <div className="col-span-3 text-center">Done</div>
                                </div>

                                {ex.completedSets.map((set, setIdx) => (
                                    <div key={setIdx} className={`grid grid-cols-10 gap-2 items-center p-2 rounded-md ${set.completed ? 'bg-primary/10' : 'bg-muted/30'}`}>
                                        <div className="col-span-1 font-medium pl-1">{set.setNumber}</div>
                                        <div className="col-span-3">
                                            <Input
                                                type="number"
                                                className="h-8 text-center"
                                                value={set.weight || ''}
                                                onChange={(e) => updateSetData(exIdx, setIdx, "weight", parseFloat(e.target.value))}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                type="number"
                                                className="h-8 text-center"
                                                value={set.reps || ''}
                                                onChange={(e) => updateSetData(exIdx, setIdx, "reps", parseFloat(e.target.value))}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="col-span-3 flex justify-center">
                                            <Button
                                                variant={set.completed ? "default" : "outline"}
                                                size="sm"
                                                className={`h-8 w-full ${set.completed ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                                onClick={() => toggleSetComplete(exIdx, setIdx)}
                                            >
                                                {set.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        <Button variant="outline" className="w-full border-dashed" onClick={handleAddExercise}>
                            <Plus className="mr-2 h-4 w-4" /> Add Exercise
                        </Button>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-6 border-t">
                        <Button variant="ghost" onClick={() => setIsActive(false)}>
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button size="lg" onClick={handleFinishSession} className="bg-green-600 hover:bg-green-700">
                            <Save className="mr-2 h-4 w-4" /> Finish Workout
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                    <CardDescription>Start an empty workout or choose a template.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full" size="lg" onClick={() => handleStartSession()}>
                        <Play className="mr-2 h-4 w-4" />
                        Start Empty Workout
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or choose template
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        {plans.length > 0 ? (
                            plans.map(plan => (
                                <Button key={plan.id} variant="outline" className="justify-start" onClick={() => handleStartSession(plan)}>
                                    {plan.name}
                                </Button>
                            ))
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-2">
                                No plans created yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
