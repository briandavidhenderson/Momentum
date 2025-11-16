"use client"

import { useAppContext } from "@/lib/AppContext"
import { AuthPage } from "@/components/AuthPage"
import OnboardingFlow from "@/components/OnboardingFlow"
import { Button } from "@/components/ui/button"
import { LogOut, Users, Check, FileText, Edit, Package, Calendar, Wrench, Shield, DollarSign, Wallet } from "lucide-react"
import { DataClearDialog } from "@/components/DataClearDialog"
import { ProjectDashboard } from "@/components/views/ProjectDashboard"
import PeopleView from "@/components/views/PeopleView"
import { DayToDayBoard } from "@/components/views/DayToDayBoard"
import { ElectronicLabNotebook } from "@/components/views/ElectronicLabNotebook"
import { PersonalProfilePage } from "@/components/views/PersonalProfilePage"
import { ProfileManagement } from "@/components/views/ProfileManagement"
import { OrdersInventory } from "@/components/views/OrdersInventory"
import { EquipmentManagement } from "@/components/views/EquipmentManagement"
import { CalendarEvents } from "@/components/views/CalendarEvents"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { PrivacyDashboard } from "@/components/views/PrivacyDashboard"
import { FundingAdmin } from "@/components/views/FundingAdmin"
import { PersonalLedger } from "@/components/PersonalLedger"
import { UserRole } from "@/lib/types"

export default function Home() {
  // Get all state and handlers from context
  const {
    // Auth state
    authState,
    currentUser,
    currentUserProfile,
    mounted,
    handleLogin,
    handleSignup,
    handleSignOut,
    handleProfileSetupComplete,

    // UI state
    mainView,
    setMainView,
    showClearDialog,
    setShowClearDialog,
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
        <div className="fixed bottom-4 right-4">
          <Button
            variant="outline"
            onClick={() => setShowClearDialog(true)}
            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-300"
          >
            Clear All Data
          </Button>
        </div>
        <DataClearDialog
          open={showClearDialog}
          onClose={() => setShowClearDialog(false)}
          onConfirm={() => {
            setShowClearDialog(false)
            // Page will reload after clearing
          }}
        />
      </>
    )
  }

  // Show onboarding/setup
  if (authState === 'setup' && currentUser) {
    return <OnboardingFlow user={currentUser} onComplete={handleProfileSetupComplete} />
  }

  // Main application
  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-8">
      <div className="max-w-[2000px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-navigation p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="h1 text-foreground mb-2">
                Momentum Lab Management
              </h1>
              <p className="text-base text-muted-foreground">
                Comprehensive laboratory project and personnel management system
              </p>
            </div>

            {/* User Info & Sign Out Button */}
            <div className="flex items-center gap-3">
              {currentUserProfile && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {currentUserProfile.firstName} {currentUserProfile.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentUserProfile.position || currentUser?.email}
                  </p>
                </div>
              )}
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="lg"
                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                aria-label="Sign out of your account"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <nav aria-label="Main navigation" className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setMainView('projects')}
              variant={mainView === 'projects' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'projects' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'projects' ? 'page' : undefined}
            >
              Project Timeline
            </Button>
            <Button
              onClick={() => setMainView('people')}
              variant={mainView === 'people' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'people' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'people' ? 'page' : undefined}
            >
              <Users className="h-4 w-4 mr-2" aria-hidden="true" />
              People
            </Button>
            <Button
              onClick={() => setMainView('daytoday')}
              variant={mainView === 'daytoday' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'daytoday' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'daytoday' ? 'page' : undefined}
            >
              <Check className="h-4 w-4 mr-2" aria-hidden="true" />
              Day to Day
            </Button>
            <Button
              onClick={() => setMainView('eln')}
              variant={mainView === 'eln' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'eln' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'eln' ? 'page' : undefined}
            >
              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
              Lab Notebook
            </Button>
            <Button
              onClick={() => setMainView('orders')}
              variant={mainView === 'orders' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'orders' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'orders' ? 'page' : undefined}
            >
              <Package className="h-4 w-4 mr-2" aria-hidden="true" />
              Orders
            </Button>
            <Button
              onClick={() => setMainView('equipment')}
              variant={mainView === 'equipment' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'equipment' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'equipment' ? 'page' : undefined}
            >
              <Wrench className="h-4 w-4 mr-2" aria-hidden="true" />
              Equipment
            </Button>
            <Button
              onClick={() => setMainView('calendar')}
              variant={mainView === 'calendar' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'calendar' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'calendar' ? 'page' : undefined}
            >
              <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
              Calendar
            </Button>
            {/* Funding Admin - Only for PIs, Finance Admins, and Lab Managers */}
            {(currentUserProfile?.userRole === UserRole.PI ||
              currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
              currentUserProfile?.userRole === UserRole.LAB_MANAGER) && (
              <Button
                onClick={() => setMainView('funding')}
                variant={mainView === 'funding' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'funding' ? 'bg-brand-500 text-white' : ''}
                aria-current={mainView === 'funding' ? 'page' : undefined}
              >
                <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" />
                Funding
              </Button>
            )}
            {/* Personal Ledger - Available to all users */}
            <Button
              onClick={() => setMainView('ledger')}
              variant={mainView === 'ledger' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'ledger' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'ledger' ? 'page' : undefined}
            >
              <Wallet className="h-4 w-4 mr-2" aria-hidden="true" />
              My Ledger
            </Button>
            <Button
              onClick={() => setMainView('myprofile')}
              variant={mainView === 'myprofile' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'myprofile' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'myprofile' ? 'page' : undefined}
            >
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
              My Profile
            </Button>
            <Button
              onClick={() => setMainView('privacy')}
              variant={mainView === 'privacy' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'privacy' ? 'bg-brand-500 text-white' : ''}
              aria-current={mainView === 'privacy' ? 'page' : undefined}
            >
              <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
              Privacy
            </Button>
            {(currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
              <Button
                onClick={() => setMainView('profiles')}
                variant={mainView === 'profiles' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'profiles' ? 'bg-brand-500 text-white' : ''}
                aria-current={mainView === 'profiles' ? 'page' : undefined}
              >
                <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                All Profiles
              </Button>
            )}
          </nav>
        </div>

        {/* Render selected view */}
        {mainView === 'projects' && <ProjectDashboard />}
        {mainView === 'people' && <PeopleView currentUserProfile={currentUserProfile} />}
        {mainView === 'daytoday' && <DayToDayBoard />}
        {mainView === 'eln' && <ElectronicLabNotebook />}
        {mainView === 'orders' && <OrdersInventory />}
        {mainView === 'equipment' && <EquipmentManagement />}
        {mainView === 'calendar' && <CalendarEvents />}
        {mainView === 'funding' && (
          currentUserProfile?.userRole === UserRole.PI ||
          currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
          currentUserProfile?.userRole === UserRole.LAB_MANAGER
        ) && <FundingAdmin />}
        {mainView === 'funding' && !(
          currentUserProfile?.userRole === UserRole.PI ||
          currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
          currentUserProfile?.userRole === UserRole.LAB_MANAGER
        ) && (
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">You need PI, Finance Admin, or Lab Manager privileges to access the Funding panel.</p>
          </div>
        )}
        {mainView === 'ledger' && <PersonalLedger />}
        {mainView === 'myprofile' && <PersonalProfilePage currentUser={currentUser} currentUserProfile={currentUserProfile} />}
        {mainView === 'privacy' && <PrivacyDashboard />}
        {mainView === 'profiles' && (currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
          <ProfileManagement currentUser={currentUser} currentUserProfile={currentUserProfile} />
        )}
        {mainView === 'profiles' && !(currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">You need administrator privileges to access the Profile Management panel.</p>
          </div>
        )}
      </div>

      {/* GDPR Cookie Consent Banner - ePrivacy Directive Compliance */}
      <CookieConsentBanner />
    </main>
  )
}