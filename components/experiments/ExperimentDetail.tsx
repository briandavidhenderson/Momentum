import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { subscribeToELNExperiment, updateELNExperiment, deductExperimentInventory } from '@/lib/services/elnService';
import { ELNExperiment, ELNItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Clock, FlaskConical, MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { ResourceLinkingDialog } from '@/components/eln/ResourceLinkingDialog';
import { useAppContext } from '@/lib/AppContext';

interface ExperimentDetailProps {
    experimentId: string;
}

export function ExperimentDetail({ experimentId }: ExperimentDetailProps) {
    const { currentUserProfile } = useAuth();
    const { equipment: allEquipment, inventory: allInventory } = useAppContext();
    const [experiment, setExperiment] = useState<ELNExperiment | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!experimentId) return;

        const unsubscribe = subscribeToELNExperiment(experimentId, (data) => {
            setExperiment(data);
            if (data) {
                setTitle(data.title);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [experimentId]);

    const handleTitleSave = async () => {
        if (!experiment) return;
        try {
            await updateELNExperiment(experiment.id, { title });
            setIsEditingTitle(false);
            toast({ title: 'Title updated' });
        } catch (error) {
            toast({ title: 'Error updating title', variant: 'destructive' });
        }
    };

    const handleResourceLink = async (links: { equipmentIds?: string[], inventoryIds?: string[] }) => {
        if (!experiment) return;

        const updates: Partial<ELNExperiment> = {};

        if (links.equipmentIds) {
            updates.equipmentUsed = links.equipmentIds.map(id => {
                const eq = allEquipment.find(e => e.id === id);
                return {
                    equipmentId: id,
                    equipmentName: eq?.name || 'Unknown Equipment'
                };
            });
        }

        if (links.inventoryIds) {
            updates.consumedInventory = links.inventoryIds.map(id => {
                const item = allInventory.find(i => i.id === id);
                return {
                    inventoryId: id,
                    itemName: item?.productName || 'Unknown Item',
                    quantityUsed: 1, // Default to 1
                    unit: item?.unit || 'units'
                };
            });
        }

        try {
            await updateELNExperiment(experiment.id, updates);
            toast({ title: 'Resources linked successfully' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Failed to link resources', variant: 'destructive' });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading experiment...</div>;
    if (!experiment) return <div className="p-8 text-center">Experiment not found.</div>;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-card">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="font-mono text-xs">
                                {experiment.experimentNumber || 'NO-ID'}
                            </Badge>
                            <Badge variant={experiment.status === 'completed' ? 'default' : 'secondary'}>
                                {experiment.status || 'draft'}
                            </Badge>
                        </div>
                        {isEditingTitle ? (
                            <div className="flex items-center space-x-2 mt-1">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-8 w-64"
                                />
                                <Button size="sm" onClick={handleTitleSave}><Save className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
                            </div>
                        ) : (
                            <h1
                                className="text-xl font-bold mt-1 cursor-pointer hover:underline decoration-dashed underline-offset-4"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                {experiment.title}
                            </h1>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <FlaskConical className="mr-2 h-4 w-4" />
                        <span>{experiment.masterProjectName}</span>
                    </div>
                    <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Updated {formatDistanceToNow(new Date(experiment.updatedAt || experiment.createdAt), { addSuffix: true })}</span>
                    </div>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <Tabs defaultValue="notebook" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="notebook">Notebook</TabsTrigger>
                        <TabsTrigger value="resources">Resources (Inventory & Equipment)</TabsTrigger>
                        <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    </TabsList>

                    <TabsContent value="notebook" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Experiment Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    {experiment.items?.filter(item => item.type === 'note').map((item) => (
                                        <div key={item.id} className="p-4 border rounded-lg bg-muted/50">
                                            <div className="text-sm text-muted-foreground mb-2 flex justify-between">
                                                <span>Note</span>
                                                {/* We don't have createdAt on ELNItem yet, but we can assume order implies time or add it later */}
                                            </div>
                                            <p className="whitespace-pre-wrap">{item.description || item.title || "No content"}</p>
                                        </div>
                                    ))}
                                    {(!experiment.items || experiment.items.filter(i => i.type === 'note').length === 0) && (
                                        <div className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                                            <p>No notes yet.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-medium mb-2">Add Note</h3>
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full min-h-[100px] p-2 rounded-md border bg-background"
                                            placeholder="Type your observation..."
                                            id="new-note-content"
                                        />
                                        <Button
                                            onClick={async () => {
                                                const content = (document.getElementById('new-note-content') as HTMLTextAreaElement).value;
                                                if (!content.trim()) return;

                                                const newItem: ELNItem = {
                                                    id: crypto.randomUUID(),
                                                    type: 'note',
                                                    description: content,
                                                    order: (experiment.items?.length || 0) + 1
                                                };

                                                const updatedItems = [...(experiment.items || []), newItem];

                                                try {
                                                    await updateELNExperiment(experiment.id, { items: updatedItems });
                                                    (document.getElementById('new-note-content') as HTMLTextAreaElement).value = '';
                                                    toast({ title: 'Note added' });
                                                } catch (e) {
                                                    toast({ title: 'Failed to add note', variant: 'destructive' });
                                                }
                                            }}
                                        >
                                            Add Note
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="resources">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Inventory Used</CardTitle>
                                    <Button size="sm" variant="outline" onClick={() => setResourceDialogOpen(true)}>
                                        <LinkIcon className="mr-2 h-4 w-4" /> Link
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {experiment.consumedInventory && experiment.consumedInventory.length > 0 ? (
                                        <ul className="space-y-2">
                                            {experiment.consumedInventory.map((item, idx) => (
                                                <li key={idx} className="flex justify-between items-center p-2 border rounded-md">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.itemName}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.quantityUsed} {item.unit}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {item.deducted ? (
                                                            <Badge variant="outline" className="text-green-600 border-green-600">
                                                                Deducted
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs"
                                                                onClick={async () => {
                                                                    try {
                                                                        await deductExperimentInventory(experiment.id, item.inventoryId, item.quantityUsed);
                                                                        toast({ title: 'Stock deducted successfully' });
                                                                    } catch (error) {
                                                                        console.error(error);
                                                                        toast({ title: 'Failed to deduct stock', variant: 'destructive' });
                                                                    }
                                                                }}
                                                            >
                                                                Deduct
                                                            </Button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-muted-foreground text-sm">No inventory items linked.</div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Equipment Used</CardTitle>
                                    <Button size="sm" variant="outline" onClick={() => setResourceDialogOpen(true)}>
                                        <LinkIcon className="mr-2 h-4 w-4" /> Link
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {experiment.equipmentUsed && experiment.equipmentUsed.length > 0 ? (
                                        <ul className="space-y-2">
                                            {experiment.equipmentUsed.map((eq, idx) => (
                                                <li key={idx} className="flex justify-between items-center p-2 border rounded-md">
                                                    <span>{eq.equipmentName}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-muted-foreground text-sm">No equipment linked.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="metadata">
                        <Card>
                            <CardHeader>
                                <CardTitle>Experiment Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created By</label>
                                        <div className="mt-1">{experiment.createdBy}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                        <div className="mt-1">{new Date(experiment.createdAt).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Lab</label>
                                        <div className="mt-1">{experiment.labName}</div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Project</label>
                                        <div className="mt-1">{experiment.masterProjectName}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <ResourceLinkingDialog
                open={resourceDialogOpen}
                onClose={() => setResourceDialogOpen(false)}
                onLink={handleResourceLink}
                initialLinks={{
                    equipmentIds: experiment.equipmentUsed?.map(e => e.equipmentId),
                    inventoryIds: experiment.consumedInventory?.map(i => i.inventoryId)
                }}
            />
        </div>
    );
}
