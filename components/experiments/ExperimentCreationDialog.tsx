import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProjects } from '@/lib/hooks/useProjects';
import { createELNExperiment } from '@/lib/services/elnService';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    masterProjectId: z.string().min(1, 'Project is required'),
});

interface ExperimentCreationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ExperimentCreationDialog({ open, onOpenChange }: ExperimentCreationDialogProps) {
    const { toast } = useToast();
    const { currentUserProfile } = useAuth();
    const { projects } = useProjects();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            masterProjectId: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!currentUserProfile) return;

        setIsSubmitting(true);
        try {
            const selectedProject = projects.find(p => p.id === values.masterProjectId);

            await createELNExperiment({
                title: values.title,
                description: values.description,
                masterProjectId: values.masterProjectId,
                masterProjectName: selectedProject?.name || 'Unknown Project',
                labId: currentUserProfile.labId,
                labName: currentUserProfile.labName || 'Unknown Lab',
                createdBy: currentUserProfile.id,
                items: [],
                pages: [],
                status: 'draft',
                visibility: 'private',
                sharedWithUsers: [currentUserProfile.id],
            });

            toast({
                title: 'Experiment created',
                description: 'Your new experiment has been created successfully.',
            });
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error creating experiment:', error);
            toast({
                title: 'Error',
                description: 'Failed to create experiment. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Experiment</DialogTitle>
                    <DialogDescription>
                        Start a new experiment linked to a project.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Western Blot Analysis of Protein X" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="masterProjectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a project" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {projects.map((project) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Briefly describe the goal of this experiment..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Experiment
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
