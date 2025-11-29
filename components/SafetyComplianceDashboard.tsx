"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, FileWarning, TrendingUp, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { getSafetyMetrics } from '@/lib/services/safetyService'
import { SafetyMetrics } from '@/lib/types/safety.types'

interface SafetyComplianceDashboardProps {
    labId: string
}

export function SafetyComplianceDashboard({ labId }: SafetyComplianceDashboardProps) {
    const [metrics, setMetrics] = useState<SafetyMetrics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadMetrics()
    }, [labId])

    async function loadMetrics() {
        setLoading(true)
        try {
            const data = await getSafetyMetrics(labId)
            setMetrics(data)
        } catch (error) {
            console.error('Error loading safety metrics:', error)
            // Fallback to empty metrics or error state
            setMetrics({
                totalRiskAssessments: 0,
                approvedAssessments: 0,
                expiredAssessments: 0,
                nearingExpiry: 0,
                protocolsWithoutAssessments: 0,
                equipmentWithoutAssessments: 0,
                totalIncidents: 0,
                openIncidents: 0,
                incidentsThisMonth: 0,
                averageResolutionDays: 0,
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading || !metrics) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Safety & Compliance Dashboard</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const complianceRate = (metrics.approvedAssessments / Math.max(1, metrics.totalRiskAssessments)) * 100
    const hasIssues =
        metrics.expiredAssessments > 0 ||
        metrics.protocolsWithoutAssessments > 0 ||
        metrics.equipmentWithoutAssessments > 0 ||
        metrics.openIncidents > 0

    return (
        <div className="space-y-6">
            {/* Overall Status Alert */}
            {hasIssues ? (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                        {metrics.expiredAssessments > 0 && `${metrics.expiredAssessments} expired risk assessments. `}
                        {metrics.protocolsWithoutAssessments > 0 && `${metrics.protocolsWithoutAssessments} protocols need risk assessments. `}
                        {metrics.openIncidents > 0 && `${metrics.openIncidents} open incidents require attention.`}
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>All Clear</AlertTitle>
                    <AlertDescription>
                        No critical safety compliance issues detected.
                    </AlertDescription>
                </Alert>
            )}

            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{complianceRate.toFixed(1)}%</div>
                        <ProgressBar value={complianceRate} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {metrics.approvedAssessments} of {metrics.totalRiskAssessments} approved
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired Assessments</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.expiredAssessments}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {metrics.nearingExpiry} expiring within 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coverage Gaps</CardTitle>
                        <FileWarning className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {metrics.protocolsWithoutAssessments + metrics.equipmentWithoutAssessments}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {metrics.protocolsWithoutAssessments} protocols, {metrics.equipmentWithoutAssessments} equipment
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{metrics.openIncidents}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {metrics.incidentsThisMonth} reported this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="risks" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="risks">Risk Assessments</TabsTrigger>
                    <TabsTrigger value="gaps">Coverage Gaps</TabsTrigger>
                    <TabsTrigger value="incidents">Incidents</TabsTrigger>
                </TabsList>

                <TabsContent value="risks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Risk Assessment Status</CardTitle>
                            <CardDescription>Overview of all risk assessments in the lab</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Approved & Current</span>
                                    <Badge variant="default" className="bg-green-600">
                                        {metrics.approvedAssessments}
                                    </Badge>
                                </div>
                                <Progress value={(metrics.approvedAssessments / metrics.totalRiskAssessments) * 100} />
                            </div>

                            {metrics.expiredAssessments > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Expired</span>
                                        <Badge variant="destructive">{metrics.expiredAssessments}</Badge>
                                    </div>
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription className="text-sm">
                                            These assessments must be reviewed and renewed immediately.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {metrics.nearingExpiry > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Expiring Soon (30 days)</span>
                                        <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                                            {metrics.nearingExpiry}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Schedule renewals to avoid compliance gaps.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="gaps" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coverage Gaps</CardTitle>
                            <CardDescription>Protocols and equipment missing risk assessments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {metrics.protocolsWithoutAssessments > 0 && (
                                <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
                                    <FileWarning className="h-4 w-4 text-yellow-600" />
                                    <AlertTitle>Protocols Without Assessments</AlertTitle>
                                    <AlertDescription>
                                        {metrics.protocolsWithoutAssessments} protocols are missing required risk assessments.
                                        These must be completed before use.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {metrics.equipmentWithoutAssessments > 0 && (
                                <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
                                    <FileWarning className="h-4 w-4 text-yellow-600" />
                                    <AlertTitle>Equipment Without Assessments</AlertTitle>
                                    <AlertDescription>
                                        {metrics.equipmentWithoutAssessments} pieces of equipment lack safety documentation.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {metrics.protocolsWithoutAssessments === 0 && metrics.equipmentWithoutAssessments === 0 && (
                                <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertTitle>Full Coverage</AlertTitle>
                                    <AlertDescription>
                                        All protocols and equipment have appropriate risk assessments.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="incidents" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Incident Tracking</CardTitle>
                            <CardDescription>Safety incidents and near-misses</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Total Incidents (90 days)</span>
                                        <span className="text-2xl font-bold">{metrics.totalIncidents}</span>
                                    </div>
                                    <Progress value={(metrics.totalIncidents / 20) * 100} />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Average Resolution Time</span>
                                        <span className="text-2xl font-bold">{metrics.averageResolutionDays.toFixed(1)} days</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        <TrendingUp className="h-3 w-3 inline mr-1" />
                                        Target: &lt; 14 days
                                    </p>
                                </div>
                            </div>

                            {metrics.openIncidents > 0 && (
                                <Alert variant="default" className="border-orange-600">
                                    <Clock className="h-4 w-4 text-orange-600" />
                                    <AlertTitle>Open Incidents</AlertTitle>
                                    <AlertDescription>
                                        {metrics.openIncidents} incidents require follow-up actions or closure.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="pt-4">
                                <h4 className="text-sm font-semibold mb-2">This Month</h4>
                                <p className="text-2xl font-bold">{metrics.incidentsThisMonth}</p>
                                <p className="text-xs text-muted-foreground">incidents reported</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

// Helper component for consistent progress bars
function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
    const getColor = () => {
        if (value >= 90) return 'bg-green-600'
        if (value >= 70) return 'bg-yellow-600'
        return 'bg-red-600'
    }

    return (
        <div className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
            <div
                className={`h-full ${getColor()} transition-all duration-300`}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    )
}
