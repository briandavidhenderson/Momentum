'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { subscribeToUserTraining } from '@/lib/services/trainingService';
import { TrainingRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function TrainingDashboard() {
    const { currentUser } = useAuth();
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubscribe = subscribeToUserTraining(currentUser.uid, (data) => {
            setRecords(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'default';
            case 'expired': return 'destructive';
            case 'refresh-required': return 'warning';
            case 'in-progress': return 'secondary';
            default: return 'outline';
        }
    };

    const activeRecords = records.filter(r => r.status === 'completed' && (!r.expiryDate || new Date(r.expiryDate) > new Date()));
    const expiredRecords = records.filter(r => r.status === 'expired' || (r.expiryDate && new Date(r.expiryDate) <= new Date()));
    const pendingRecords = records.filter(r => r.status === 'in-progress' || r.status === 'not-started');

    if (loading) return <div className="p-8 text-center">Loading training records...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">My Training & Competency</h1>
                    <p className="text-muted-foreground">Manage your safety certifications and equipment training.</p>
                </div>
                <Button>Request Training</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeRecords.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending / In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingRecords.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired / Action Needed</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiredRecords.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="expired">Expired/History</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4 mt-4">
                    {activeRecords.length === 0 && <p className="text-muted-foreground text-center py-8">No active training records.</p>}
                    {activeRecords.map(record => (
                        <TrainingRecordCard key={record.id} record={record} />
                    ))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4 mt-4">
                    {pendingRecords.length === 0 && <p className="text-muted-foreground text-center py-8">No pending training.</p>}
                    {pendingRecords.map(record => (
                        <TrainingRecordCard key={record.id} record={record} />
                    ))}
                </TabsContent>

                <TabsContent value="expired" className="space-y-4 mt-4">
                    {expiredRecords.length === 0 && <p className="text-muted-foreground text-center py-8">No expired records.</p>}
                    {expiredRecords.map(record => (
                        <TrainingRecordCard key={record.id} record={record} />
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TrainingRecordCard({ record }: { record: TrainingRecord }) {
    return (
        <Card>
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full bg-muted`}>
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-medium">{record.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {record.type} • {record.equipmentName ? `Equipment: ${record.equipmentName}` : 'General'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    {record.expiryDate && (
                        <div className="text-sm text-right">
                            <p className="text-muted-foreground">Expires</p>
                            <p className="font-medium">{new Date(record.expiryDate).toLocaleDateString()}</p>
                        </div>
                    )}
                    <Badge variant={record.status === 'completed' ? 'default' : record.status === 'expired' ? 'destructive' : 'secondary'}>
                        {record.status}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
