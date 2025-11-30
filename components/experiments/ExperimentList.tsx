import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { subscribeToELNExperiments } from '@/lib/services/elnService';
import { ELNExperiment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FlaskConical, Calendar, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ExperimentCreationDialog } from './ExperimentCreationDialog';
import { useRouter } from 'next/navigation';

export function ExperimentList() {
    const { currentUser, currentUserProfile } = useAuth();
    const [experiments, setExperiments] = useState<ELNExperiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!currentUserProfile?.labId || !currentUser?.uid) return;

        const unsubscribe = subscribeToELNExperiments(
            {
                labId: currentUserProfile.labId,
                userId: currentUser.uid
            },
            (data) => {
                setExperiments(data);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUserProfile?.labId, currentUser?.uid]);

    const filteredExperiments = experiments.filter(exp => {
        const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exp.experimentNumber?.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'mine') {
            return matchesSearch && exp.createdBy === currentUserProfile?.id;
        }
        return matchesSearch;
    });

    if (loading) {
        return <div className="flex justify-center p-8">Loading experiments...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Experiments</h1>
                    <p className="text-muted-foreground">Manage and track your laboratory experiments.</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Experiment
                </Button>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search experiments..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'mine')}>
                    <TabsList>
                        <TabsTrigger value="all">All Experiments</TabsTrigger>
                        <TabsTrigger value="mine">My Experiments</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExperiments.map((exp) => (
                    <Card key={exp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/experiments/${exp.id}`)}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {exp.experimentNumber || 'NO-ID'}
                                </Badge>
                                <Badge variant={exp.status === 'completed' ? 'default' : 'secondary'}>
                                    {exp.status || 'draft'}
                                </Badge>
                            </div>
                            <CardTitle className="mt-2 text-xl line-clamp-1">{exp.title}</CardTitle>
                            <CardDescription className="line-clamp-2 h-10">
                                {exp.description || 'No description provided.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <FlaskConical className="mr-2 h-4 w-4" />
                                    <span>{exp.masterProjectName || 'Unassigned Project'}</span>
                                </div>
                                <div className="flex items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Created by {exp.createdBy === currentUserProfile?.id ? 'You' : 'Colleague'}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground border-t pt-4">
                            <div className="flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                Updated {formatDistanceToNow(new Date(exp.updatedAt || exp.createdAt), { addSuffix: true })}
                            </div>
                        </CardFooter>
                    </Card>
                ))}
                {filteredExperiments.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No experiments found. Create one to get started.
                    </div>
                )}
            </div>

            <ExperimentCreationDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
        </div>
    );
}
