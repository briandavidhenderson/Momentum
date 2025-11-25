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
import { useProfiles } from '@/lib/useProfiles';

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
    const profiles = useProfiles(currentUserProfile?.labId ?? null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!currentUser?.uid || !currentUserProfile?.labId) return;

        setIsSubmitting(true);

        // Ensure creator is a member
        const members = Array.from(new Set([...selectedMembers, currentUser.uid]));

        const success = await createBoard({
            title: data.title,
            description: data.description,
            creatorId: currentUser.uid,
            labId: currentUserProfile.labId,
            members: members,
        });

        setIsSubmitting(false);

        if (success) {
            reset();
            setSelectedMembers([]);
            onOpenChange(false);
        }
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
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
                        <Label>Add Members</Label>
                        <ScrollArea className="h-[200px] border rounded-md p-2">
                            <div className="space-y-2">
                                {profiles?.map((profile) => (
                                    <div key={profile.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded">
                                        <Checkbox
                                            id={`member-${profile.id}`}
                                            checked={selectedMembers.includes(profile.id) || profile.id === currentUser?.uid}
                                            disabled={profile.id === currentUser?.uid}
                                            onCheckedChange={() => toggleMember(profile.id)}
                                        />
                                        <Label htmlFor={`member-${profile.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={profile.avatarUrl} />
                                                <AvatarFallback className="text-[10px]">{profile.firstName?.[0]}{profile.lastName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">
                                                {profile.firstName} {profile.lastName}
                                                {profile.id === currentUser?.uid && " (You)"}
                                            </span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
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
