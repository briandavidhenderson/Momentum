'use client';

import { TrainingDashboard } from '@/components/training/TrainingDashboard';
import { TopModuleNavigation } from '@/components/TopModuleNavigation';

export default function TrainingPage() {
    return (
        <div className="flex flex-col h-screen bg-background">
            <TopModuleNavigation />
            <div className="flex-1 overflow-auto">
                <TrainingDashboard />
            </div>
        </div>
    );
}
