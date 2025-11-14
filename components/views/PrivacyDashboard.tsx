"use client"

import React, { useState, useEffect } from "react"
import {
  Shield,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Cookie,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  Lock,
  Globe,
  Bell,
  BellOff,
  Database,
  Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/useAuth"
import { doc, getDoc, setDoc, addDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type {
  UserConsent,
  PrivacySettings,
  DataExportRequest,
  AccountDeletionRequest,
  SpecialCategoryDataMarker,
} from "@/lib/types"

/**
 * PrivacyDashboard - Comprehensive GDPR User Rights Dashboard
 *
 * Implements all GDPR user rights in a centralized interface:
 * - Article 15: Right of Access (Data Export)
 * - Article 16: Right to Rectification (Edit Profile)
 * - Article 17: Right to Erasure (Delete Account)
 * - Article 18: Right to Restriction of Processing (Privacy Settings)
 * - Article 20: Right to Data Portability (Data Export)
 * - Article 21: Right to Object (Opt-out)
 * - Article 7.3: Right to Withdraw Consent (Cookie Settings)
 */

export function PrivacyDashboard() {
  const { currentUser: user, currentUserProfile: profile } = useAuth()

  // State
  const [loading, setLoading] = useState(false)
  const [consent, setConsent] = useState<UserConsent | null>(null)
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null)
  const [dataExportRequests, setDataExportRequests] = useState<DataExportRequest[]>([])
  const [specialCategoryMarkers, setSpecialCategoryMarkers] = useState<SpecialCategoryDataMarker[]>([])

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  // Load user's consent and privacy settings
  useEffect(() => {
    if (!user) return

    async function loadData() {
      try {
        // Load consent
        const consentDoc = await getDoc(doc(db, "userConsents", user.uid))
        if (consentDoc.exists()) {
          setConsent(consentDoc.data() as UserConsent)
        }

        // Load privacy settings
        const settingsDoc = await getDoc(doc(db, "privacySettings", user.uid))
        if (settingsDoc.exists()) {
          setPrivacySettings(settingsDoc.data() as PrivacySettings)
        } else {
          // Create default privacy settings
          const defaultSettings: PrivacySettings = {
            id: user.uid,
            userId: user.uid,
            analyticsEnabled: consent?.analyticsCookies || false,
            performanceMonitoringEnabled: true,
            profileVisibleInDirectory: true,
            emailVisibleToLabMembers: true,
            phoneVisibleToLabMembers: true,
            officeLocationVisible: true,
            emailNotificationsEnabled: true,
            projectAssignmentNotifications: true,
            orderNotifications: true,
            fundingAlertNotifications: true,
            autoAssignToProjects: true,
            createdAt: new Date().toISOString(),
          }
          await setDoc(doc(db, "privacySettings", user.uid), defaultSettings)
          setPrivacySettings(defaultSettings)
        }

        // Load data export requests
        const exportsQuery = query(
          collection(db, "dataExportRequests"),
          where("userId", "==", user.uid),
          orderBy("requestedAt", "desc")
        )
        const exportsSnapshot = await getDocs(exportsQuery)
        const exports = exportsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DataExportRequest[]
        setDataExportRequests(exports)

        // Load special category data markers
        const markersQuery = query(
          collection(db, "specialCategoryDataMarkers"),
          where("acknowledgedBy", "==", user.uid)
        )
        const markersSnapshot = await getDocs(markersQuery)
        const markers = markersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SpecialCategoryDataMarker[]
        setSpecialCategoryMarkers(markers)
      } catch (error) {
        console.error("Error loading privacy data:", error)
      }
    }

    loadData()
  }, [user, consent?.analyticsCookies])

  // Update privacy settings
  const updatePrivacySettings = async (updates: Partial<PrivacySettings>) => {
    if (!user || !privacySettings) return

    setLoading(true)
    try {
      const updatedSettings = {
        ...privacySettings,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      await setDoc(doc(db, "privacySettings", user.uid), updatedSettings)
      setPrivacySettings(updatedSettings)
    } catch (error) {
      console.error("Error updating privacy settings:", error)
      alert("Failed to update privacy settings. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Request data export
  const requestDataExport = async (format: "json" | "csv" | "zip") => {
    if (!user) return

    setLoading(true)
    try {
      const exportRequest: Omit<DataExportRequest, "id"> = {
        userId: user.uid,
        userEmail: user.email,
        requestedAt: new Date().toISOString(),
        status: "pending",
        exportFormat: format,
        includesProfile: true,
        includesProjects: true,
        includesTasks: true,
        includesOrders: true,
        includesELNData: true,
        includesUploadedFiles: format === "zip",
        includesAuditLogs: true,
      }

      await addDoc(collection(db, "dataExportRequests"), exportRequest)

      alert(
        `Data export request submitted successfully! You'll receive an email at ${user.email} when your export is ready. This usually takes 15-30 minutes.`
      )

      // Reload exports
      const exportsQuery = query(
        collection(db, "dataExportRequests"),
        where("userId", "==", user.uid),
        orderBy("requestedAt", "desc")
      )
      const exportsSnapshot = await getDocs(exportsQuery)
      const exports = exportsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DataExportRequest[]
      setDataExportRequests(exports)
    } catch (error) {
      console.error("Error requesting data export:", error)
      alert("Failed to request data export. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Request account deletion
  const requestAccountDeletion = async (reason?: string) => {
    if (!user) return
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      alert('Please type "DELETE MY ACCOUNT" to confirm.')
      return
    }

    setLoading(true)
    try {
      const deletionRequest: Omit<AccountDeletionRequest, "id"> = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.fullName,
        requestedAt: new Date().toISOString(),
        status: "pending",
        deleteAllData: true,
        reason,
        retainForCompliance: true, // Keep minimal audit trail for 12 months
        retentionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await addDoc(collection(db, "accountDeletionRequests"), deletionRequest)

      alert(
        `Account deletion request submitted. An administrator will review your request within 3 business days. You will receive a confirmation email at ${user.email}.

IMPORTANT: This action is irreversible. All your personal data will be permanently deleted.`
      )

      setShowDeleteDialog(false)
      setDeleteConfirmation("")
    } catch (error) {
      console.error("Error requesting account deletion:", error)
      alert("Failed to request account deletion. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!user || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please log in to view your privacy settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Privacy Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your data, privacy settings, and GDPR rights
          </p>
        </div>
      </div>

      {/* GDPR Rights Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Your Data Protection Rights:</strong> Under GDPR and Irish Data Protection Act
          2018, you have the right to access, rectify, erase, restrict processing, port, and
          object to processing of your personal data. All data is stored in the EU (Ireland -
          europe-west1).
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="export">Data Export</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="special-data">Special Data</TabsTrigger>
          <TabsTrigger value="delete" className="text-red-600">
            Delete Account
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Your Data Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Profile Data</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Name, email, position, lab membership, ORCID
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Lawful Basis:</strong> Contract (GDPR Art. 6.1.b)
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Data Location</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  All data stored in EU (Ireland - europe-west1)
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Compliance:</strong> Schrems II, GDPR Chapter V
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Data Retention</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Active data: Duration of membership + 7 years (research standards)
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Audit Logs:</strong> 12 months
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Security</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  AES-256 encryption at rest, HTTPS in transit
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Compliance:</strong> GDPR Art. 32 (Security)
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Privacy Activity</h2>

            <div className="space-y-3">
              {consent && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Cookie Consent Given</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(consent.consentGivenAt).toLocaleDateString()} •{" "}
                      Analytics: {consent.analyticsCookies ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              )}

              {dataExportRequests.length > 0 && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {dataExportRequests.length} Data Export Request(s)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Latest: {new Date(dataExportRequests[0].requestedAt).toLocaleDateString()} •
                      Status: {dataExportRequests[0].status}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Data Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download My Data (GDPR Article 15 & 20)
            </h2>

            <p className="text-sm text-muted-foreground mb-6">
              Request a copy of all your personal data stored in Momentum. You can download your
              data in JSON, CSV, or ZIP format (ZIP includes all uploaded files).
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={() => requestDataExport("json")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Request JSON Export
              </Button>

              <Button
                onClick={() => requestDataExport("csv")}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Request CSV Export
              </Button>

              <Button
                onClick={() => requestDataExport("zip")}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Request ZIP (with files)
              </Button>
            </div>

            {/* Export History */}
            <div className="border-t pt-6">
              <h3 className="font-medium mb-3">Export History</h3>

              {dataExportRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No data export requests yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {dataExportRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{request.exportFormat.toUpperCase()} Export</p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(request.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded text-sm ${
                            request.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : request.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : request.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {request.status}
                        </span>
                        {request.status === "completed" && request.downloadUrl && (
                          <Button size="sm" asChild>
                            <a href={request.downloadUrl} download>
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Privacy Settings Tab */}
        <TabsContent value="privacy" className="space-y-4">
          {privacySettings && (
            <>
              {/* Profile Visibility */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Profile Visibility
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Visible in Lab Directory</Label>
                      <p className="text-sm text-muted-foreground">
                        Show your profile in the lab member directory
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.profileVisibleInDirectory}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ profileVisibleInDirectory: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Visible to Lab Members</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow lab members to see your email address
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.emailVisibleToLabMembers}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ emailVisibleToLabMembers: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Phone Visible to Lab Members</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow lab members to see your phone number
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.phoneVisibleToLabMembers}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ phoneVisibleToLabMembers: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Office Location Visible</Label>
                      <p className="text-sm text-muted-foreground">
                        Show your office location in your profile
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.officeLocationVisible}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ officeLocationVisible: checked as boolean })
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications for important updates
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.emailNotificationsEnabled}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ emailNotificationsEnabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Project Assignment Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you're assigned to projects
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.projectAssignmentNotifications}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ projectAssignmentNotifications: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Order Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about order status updates
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.orderNotifications}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ orderNotifications: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Funding Alert Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your budget allocation is running low
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.fundingAlertNotifications}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ fundingAlertNotifications: checked as boolean })
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Analytics & Performance */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Analytics & Performance
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Analytics Enabled</Label>
                      <p className="text-sm text-muted-foreground">
                        Help improve Momentum by sharing anonymous usage data
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.analyticsEnabled}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ analyticsEnabled: checked as boolean })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Performance Monitoring</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor app performance to identify and fix issues
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.performanceMonitoringEnabled}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({
                          performanceMonitoringEnabled: checked as boolean,
                        })
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Auto-Assignment */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Automatic Features</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Assign to New Projects</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically assign you to new projects in your lab
                      </p>
                    </div>
                    <Checkbox
                      checked={privacySettings.autoAssignToProjects}
                      onCheckedChange={(checked) =>
                        updatePrivacySettings({ autoAssignToProjects: checked as boolean })
                      }
                    />
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie & Consent Management
            </h2>

            {consent ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Current Consent Status</h3>
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Consent Given:</strong>{" "}
                      {new Date(consent.consentGivenAt).toLocaleString()}
                    </p>
                    <p>
                      <strong>Privacy Policy Version:</strong> {consent.consentVersion}
                    </p>
                    <p>
                      <strong>Functional Cookies:</strong> ✓ Enabled (Required)
                    </p>
                    <p>
                      <strong>Analytics Cookies:</strong>{" "}
                      {consent.analyticsCookies ? "✓ Enabled" : "✗ Disabled"}
                    </p>
                    <p>
                      <strong>Data Processing Consent:</strong>{" "}
                      {consent.dataProcessingConsent ? "✓ Given" : "✗ Not Given"}
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    To withdraw consent or update your cookie preferences, refresh the page
                    and the cookie banner will appear again, allowing you to modify your choices.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <p className="text-muted-foreground">No consent record found.</p>
            )}
          </Card>
        </TabsContent>

        {/* Special Category Data Tab */}
        <TabsContent value="special-data" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Special Category Data (GDPR Article 9)
            </h2>

            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Special category data includes health, genetic, biometric, or patient-derived
                data. This data requires additional legal protections under GDPR Article 9.
              </AlertDescription>
            </Alert>

            {specialCategoryMarkers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No special category data markers recorded yet. When you mark ELN experiments
                as containing special category data, they will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {specialCategoryMarkers.map((marker) => (
                  <div key={marker.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">
                        {marker.entityType.replace("_", " ").toUpperCase()}
                      </h3>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                        {marker.dataCategory}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Entity ID: {marker.entityId}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p>
                        <strong>Lawful Basis:</strong> {marker.lawfulBasis}
                      </p>
                      <p>
                        <strong>Special Category Basis:</strong>{" "}
                        {marker.specialCategoryBasis || "Not specified"}
                      </p>
                      <p>
                        <strong>Acknowledged:</strong>{" "}
                        {new Date(marker.acknowledgedAt).toLocaleString()}
                      </p>
                      {marker.dpiaRequired && (
                        <p className="text-amber-600 font-medium mt-1">
                          ⚠ DPIA Required: {marker.dpiaReference || "Reference not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Delete Account Tab */}
        <TabsContent value="delete" className="space-y-4">
          <Card className="p-6 border-red-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete My Account (GDPR Article 17)
            </h2>

            <Alert className="mb-6 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Warning:</strong> Account deletion is permanent and irreversible. All
                your personal data will be permanently deleted from Momentum. This action cannot
                be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mb-6">
              <h3 className="font-medium">What will be deleted:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Your profile information (name, email, position, etc.)</li>
                <li>Your ELN experiments and uploaded files</li>
                <li>Your day-to-day tasks and personal notes</li>
                <li>Your order history and inventory contributions</li>
                <li>Your consent and privacy settings</li>
                <li>All personal identifiers will be scrubbed from shared resources</li>
              </ul>

              <h3 className="font-medium">What will be retained:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Minimal audit trail for legal compliance (12 months) - no personal identifiers
                </li>
                <li>
                  Shared project data will remain but your name will be replaced with "Deleted
                  User"
                </li>
              </ul>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              Request Account Deletion
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Account Deletion</DialogTitle>
            <DialogDescription>
              This action is permanent and irreversible. Please type{" "}
              <strong>"DELETE MY ACCOUNT"</strong> to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="delete-confirm">Type "DELETE MY ACCOUNT" to confirm</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
              <Input
                id="delete-reason"
                placeholder="e.g., Leaving the lab, privacy concerns"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => requestAccountDeletion()}
              disabled={deleteConfirmation !== "DELETE MY ACCOUNT" || loading}
            >
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
