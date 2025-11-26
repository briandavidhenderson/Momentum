"use client"

import { useAppContext } from "@/lib/AppContext"
import { AuthPage } from "@/components/AuthPage"
import OnboardingFlow from "@/components/OnboardingFlow"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import PeopleView from "@/components/views/PeopleView"
import { DayToDayBoard } from "@/components/views/DayToDayBoard"
import { MyTasksView } from "@/components/views/MyTasksView"
import { ElectronicLabNotebook } from "@/components/views/ElectronicLabNotebook"
import { EnhancedProfilePage } from "@/components/profile/EnhancedProfilePage"
import { ProfileManagement } from "@/components/views/ProfileManagement"
import { OrdersInventory } from "@/components/views/OrdersInventory"
import { EquipmentManagement } from "@/components/views/EquipmentManagement"
import { CalendarEvents } from "@/components/views/CalendarEvents"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { PrivacyDashboard } from "@/components/views/PrivacyDashboard"
import { FundingAdmin } from "@/components/views/FundingAdmin"
import { PersonalLedger } from "@/components/PersonalLedger"
import { HomeDashboard } from "@/components/views/dashboard/HomeDashboard"
import { NotificationBell } from "@/components/NotificationBell"
import TopModuleNavigation from "@/components/TopModuleNavigation"
import { MyBookingsView } from "@/components/equipment/MyBookingsView"
import { WhiteboardView } from "@/components/views/WhiteboardView"
import ResearchBoard from "@/components/views/ResearchBoard"
import { UserRole } from "@/lib/types"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export default function Page() {
  const router = useRouter()
  const {
    currentUserProfile,
    currentUser,
    authState,
    mounted,
    handleLogin,
    handleSignup,
    handleSignOut,
    handleProfileSetupComplete,

    // UI state
    mainView,
    setMainView,
  } = useAppContext()

  // Prevent hydration mismatch - don't render until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="h1 text-foreground mb-2">Momentum Lab Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
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
  if (authState === 'setup' && currentUser) {
    return (
      <OnboardingFlow
        user={currentUser}
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
    if (moduleId === "projects") {
      router.push("/projects")
      return
    }

    setMainView(moduleId as typeof mainView)
  }

  // Main application
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Momentum {currentUserProfile?.position || currentUser?.email}
                </h1>
              </div>
              <NotificationBell />
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

          {/* New Modern Navigation */}
          <TopModuleNavigation
            activeModule={mainView}
            onSelect={handleNavigationSelect}
            isAdmin={isAdmin}
            hasRoleRestriction={hasRoleRestriction}
          />
        </div>

        {/* Render selected view */}
        <div className="p-6">
          {mainView === 'dashboard' && <HomeDashboard />}
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
          {mainView === 'funding' && hasRoleRestriction && <FundingAdmin />}
          {mainView === 'ledger' && <PersonalLedger />}
          {mainView === 'myprofile' && currentUser && currentUserProfile && <EnhancedProfilePage currentUser={currentUser} currentUserProfile={currentUserProfile} />}
          {mainView === 'privacy' && <PrivacyDashboard />}
          {mainView === 'profiles' && isAdmin && (
            <ProfileManagement currentUser={currentUser} currentUserProfile={currentUserProfile} />
          )}
        </div>
      </div>

      {/* GDPR Cookie Consent Banner - ePrivacy Directive Compliance */}
      <CookieConsentBanner />
    </main>
  )
}
