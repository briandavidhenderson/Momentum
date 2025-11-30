'use client';

import { ExperimentList } from '@/components/experiments/ExperimentList';
import { TopModuleNavigation } from '@/components/TopModuleNavigation';

export default function ExperimentsPage() {
    return (
        <div className="flex flex-col h-screen bg-background">
            <TopModuleNavigation />
            <div className="flex-1 overflow-hidden">
                <ExperimentList />
            </div>
        </div>
    );
}
