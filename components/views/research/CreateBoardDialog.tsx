import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useResearchBoards } from '@/lib/hooks/useResearchBoards';
import { useAuth } from '@/lib/hooks/useAuth';

import { VisibilitySelector } from '@/components/ui/VisibilitySelector';
import { VisibilitySettings } from '@/lib/types/visibility.types';

const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
});

interface CreateBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
    const { createBoard } = useResearchBoards();
    const { currentUser, currentUserProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
        visibility: 'private',
        sharedWithUsers: [],
        sharedWithGroups: []
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!currentUser?.uid || !currentUserProfile?.labId) {
            console.error("CreateResearchBoard: Missing user context", {
                uid: currentUser?.uid,
                labId: currentUserProfile?.labId,
                profileId: currentUserProfile?.id
            });
            alert("Cannot create board: User profile or Lab ID is missing. Please try refreshing the page.");
            return;
        }

        setIsSubmitting(true);

        const success = await createBoard({
            title: data.title,
            description: data.description,
            creatorId: currentUser.uid,
            labId: currentUserProfile.labId,
            visibility: visibilitySettings.visibility,
            sharedWithUsers: visibilitySettings.sharedWithUsers,
            sharedWithGroups: visibilitySettings.sharedWithGroups,
            members: visibilitySettings.sharedWithUsers || [], // Backward compatibility
        });

        setIsSubmitting(false);

        if (success) {
            reset();
            setVisibilitySettings({
                visibility: 'private',
                sharedWithUsers: [],
                sharedWithGroups: []
            });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Research Board</DialogTitle>
                    <DialogDescription>
                        Create a new space for collaborating on a specific research topic.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Board Title</Label>
                        <Input id="title" {...register('title')} placeholder="e.g., Immunology, CRISPR Projects" />
                        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register('description')} placeholder="What is this board for?" />
                    </div>

                    <div className="space-y-2">
                        <Label>Visibility & Sharing</Label>
                        <VisibilitySelector
                            value={visibilitySettings}
                            onChange={setVisibilitySettings}
                            labId={currentUserProfile?.labId || ""}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Board'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
