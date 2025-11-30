'use client';

import { ExperimentDetail } from '@/components/experiments/ExperimentDetail';
import { TopModuleNavigation } from '@/components/TopModuleNavigation';
import { useParams } from 'next/navigation';

export default function ExperimentDetailPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <div className="flex flex-col h-screen bg-background">
            <TopModuleNavigation />
            <div className="flex-1 overflow-hidden">
                <ExperimentDetail experimentId={id} />
            </div>
        </div>
    );
}
