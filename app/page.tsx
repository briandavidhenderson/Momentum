"use client"

import { useAppContext } from "@/lib/AppContext"
import { AuthPage } from "@/components/AuthPage"
import OnboardingFlow from "@/components/OnboardingFlow"
import { Button } from "@/components/ui/button"
import { LogOut, CircleUser, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

import PeopleView from "@/components/views/PeopleView"
import { DayToDayBoard } from "@/components/views/DayToDayBoard"
import { MyTasksView } from "@/components/views/MyTasksView"
import { EnhancedProfilePage } from "@/components/profile/EnhancedProfilePage"
import { ProfileManagement } from "@/components/views/ProfileManagement"
import { OrdersInventory } from "@/components/views/OrdersInventory"

import { CalendarEvents } from "@/components/views/CalendarEvents"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { PrivacyDashboard } from "@/components/views/PrivacyDashboard"
import { FundingAdmin } from "@/components/views/FundingAdmin"
import { PersonalLedger } from "@/components/PersonalLedger"
import { HomeDashboard } from "@/components/views/dashboard/HomeDashboard"
import { NotificationBell } from "@/components/NotificationBell"
import TopModuleNavigation from "@/components/TopModuleNavigation"
import { MyBookingsView } from "@/components/equipment/MyBookingsView"
import { ProjectDashboard } from "@/components/views/ProjectDashboard"
import { UserRole } from "@/lib/types"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { MobileNav } from "@/components/layout/MobileNav"
import { MobileDashboard } from "@/components/views/mobile/MobileDashboard"
import { QRScanner } from "@/components/mobile/QRScanner"
import { GroupList } from "@/components/groups/GroupList"
import { TrainingDashboard } from "@/components/training/TrainingDashboard"
import { useState, useEffect } from "react"
import { SampleListView } from '@/components/views/samples/SampleListView'
import { SettingsView } from '@/components/views/SettingsView'

// Dynamic Imports for Heavy Views
const LoadingFallback = () => (
  <div className="flex h-[50vh] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
  </div>
)

const ElectronicLabNotebook = dynamic(
  () => import("@/components/views/ElectronicLabNotebook").then((mod) => mod.ElectronicLabNotebook),
  { loading: LoadingFallback, ssr: false }
)

const WhiteboardView = dynamic(
  () => import("@/components/views/WhiteboardView").then((mod) => mod.WhiteboardView),
  { loading: LoadingFallback, ssr: false }
)

const ResearchBoard = dynamic(
  () => import("@/components/views/ResearchBoard"),
  { loading: LoadingFallback, ssr: false }
)

const HierarchyExplorer = dynamic(
  () => import("@/components/views/HierarchyExplorer"),
  { loading: LoadingFallback, ssr: false }
)

const ProtocolBenchMode = dynamic(
  () => import("@/components/ProtocolBenchMode").then((mod) => mod.ProtocolBenchMode),
  { loading: LoadingFallback, ssr: false }
)

const ReportsView = dynamic(
  () => import("@/components/views/reports/ReportsView").then((mod) => mod.ReportsView),
  { loading: LoadingFallback, ssr: false }
)

const HealthWellbeingView = dynamic(
  () => import("@/components/views/HealthWellbeingView").then((mod) => mod.HealthWellbeingView),
  { loading: LoadingFallback, ssr: false }
)

const ProjectDetailContainer = dynamic(
  () => import("@/components/views/ProjectDetailContainer").then((mod) => mod.ProjectDetailContainer),
  { loading: LoadingFallback, ssr: false }
)

const AuthorNetworkView = dynamic(
  () => import("@/components/views/network/AuthorNetworkView").then((mod) => mod.AuthorNetworkView),
  { loading: LoadingFallback, ssr: false }
)

const EquipmentManagement = dynamic(
  () => import("@/components/views/EquipmentManagement").then((mod) => mod.EquipmentManagement),
  { loading: LoadingFallback, ssr: false }
)

export default function Page() {
  const {
    currentUser,
    currentUserProfile,
    authState,
    isLoadingProfile,
    isAuthCheckComplete,
    handleLogin,
    handleSignup,
    handleSignOut,
    handleProfileSetupComplete,
    mainView,
    setMainView,
    activeProjectId,
    setActiveProjectId,
    authUser,
  } = useAppContext();

  const router = useRouter();
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Handle routing based on auth state
  useEffect(() => {
    if (!isAuthCheckComplete) return;

    if (authState === 'auth' && !currentUser) {
      // Stay on auth page (handled by render)
    } else if (authState === 'setup') {
      // Stay on setup page (handled by render)
    } else if (authState === 'app' && currentUser) {
      // User is authenticated and setup, ready for app
    }
  }, [authState, currentUser, isAuthCheckComplete]);

  if (!isAuthCheckComplete) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // Show auth page
  if (authState === 'auth') {
    return (
      <>
        <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
      </>
    )
  }

  // Show onboarding/setup
  if (authState === 'setup' && (currentUser || authUser)) {
    // Use Firestore user if available, otherwise fallback to Auth user
    const userForOnboarding = currentUser || {
      uid: authUser!.uid,
      email: authUser!.email || '',
      fullName: authUser!.displayName || '',
    }

    return (
      <OnboardingFlow
        user={userForOnboarding}
        onComplete={handleProfileSetupComplete}
        onCancel={handleSignOut}
      />
    )
  }

  // Check permissions
  const isAdmin = currentUserProfile?.isAdministrator || currentUser?.isAdministrator || false
  const hasRoleRestriction =
    currentUserProfile?.userRole === UserRole.PI ||
    currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
    currentUserProfile?.userRole === UserRole.LAB_MANAGER

  // Navigation handler with proper typing
  const handleNavigationSelect = (moduleId: string) => {
    setMainView(moduleId as typeof mainView)
  }

  // Main application
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
          <div className="px-6 py-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  Momentum
                </h1>
                <span className="text-xs text-slate-500 font-medium">
                  {currentUserProfile?.position || currentUser?.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button
                  onClick={() => setMainView('myprofile')}
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                  aria-label="My Profile"
                >
                  <CircleUser className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  My Profile
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                  aria-label="Sign out of your account"
                >
                  <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* New Modern Navigation */}
          <div className="hidden md:block">
            <TopModuleNavigation
              activeModule={mainView}
              onSelect={handleNavigationSelect}
              isAdmin={isAdmin}
              hasRoleRestriction={hasRoleRestriction}
            />
          </div>
        </div>

        {/* Render selected view */}
        <div className="p-6">
          {mainView === 'dashboard' && <HomeDashboard />}
          {mainView === 'projects' && (
            activeProjectId ? (
              <ProjectDetailContainer
                projectId={activeProjectId}
                onBack={() => setActiveProjectId(null)}
              />
            ) : (
              <ProjectDashboard />
            )
          )}
          {mainView === 'people' && <PeopleView currentUserProfile={currentUserProfile} />}
          {mainView === 'daytoday' && <DayToDayBoard />}
          {mainView === 'mytasks' && <MyTasksView />}
          {mainView === 'eln' && <ElectronicLabNotebook />}
          {mainView === 'orders' && <OrdersInventory />}
          {mainView === 'equipment' && (
            <ErrorBoundary>
              <EquipmentManagement />
            </ErrorBoundary>
          )}
          {mainView === 'bookings' && <MyBookingsView />}
          {mainView === 'calendar' && <CalendarEvents />}
          {mainView === 'whiteboard' && <WhiteboardView />}
          {mainView === 'research' && <ResearchBoard />}
          {mainView === 'explore' && <HierarchyExplorer />}
          {mainView === 'funding' && hasRoleRestriction && <FundingAdmin />}
          {mainView === 'ledger' && <PersonalLedger />}
          {mainView === 'myprofile' && currentUser && currentUserProfile && <EnhancedProfilePage currentUser={currentUser} currentUserProfile={currentUserProfile} />}
          {mainView === 'privacy' && <PrivacyDashboard />}
          {mainView === 'profiles' && isAdmin && (
            <ProfileManagement currentUser={currentUser} currentUserProfile={currentUserProfile} />
          )}
          {mainView === 'groups' && <GroupList />}
          {mainView === 'training' && <TrainingDashboard />}

          {mainView === 'mobile_home' && <MobileDashboard onNavigate={handleNavigationSelect} />}
          {mainView === 'bench' && <ProtocolBenchMode />}
          {mainView === 'reports' && <ReportsView />}
          {mainView === 'samples' && <SampleListView onSelectSample={() => { }} onCreateSample={() => { }} />}
          {mainView === 'settings' && <SettingsView />}
          {mainView === 'settings' && <SettingsView />}
          {mainView === 'health' && <HealthWellbeingView />}
          {mainView === 'authornetwork' && <AuthorNetworkView />}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        currentView={mainView}
        onNavigate={(view) => {
          if (view === "scan") {
            setShowQRScanner(true)
          } else if (view === "dashboard") {
            setMainView("mobile_home")
          } else if (view === "tasks") {
            setMainView("mytasks")
          } else if (view === "bookings") {
            setMainView("bookings")
          } else {
            // For menu or other items, maybe show a drawer or switch to dashboard
            setMainView("dashboard")
          }
        }}
      />

      {/* QR Scanner Overlay */}
      {showQRScanner && (
        <QRScanner onClose={() => setShowQRScanner(false)} />
      )}

      {/* GDPR Cookie Consent Banner - ePrivacy Directive Compliance */}
      <CookieConsentBanner />
    </main>
  )
}
