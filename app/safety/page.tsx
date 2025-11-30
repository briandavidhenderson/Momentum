"use client"

import { SafetyComplianceDashboard } from '@/components/SafetyComplianceDashboard'
import { useAppContext } from '@/lib/AppContext'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function SafetyPage() {
    const { currentUserProfile } = useAppContext()

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>

            {currentUserProfile?.labId ? (
                <SafetyComplianceDashboard labId={currentUserProfile.labId} />
            ) : (
                <div className="p-6 text-center text-muted-foreground">
                    Please select a lab to view safety metrics.
                </div>
            )}
        </div>
    )
}
