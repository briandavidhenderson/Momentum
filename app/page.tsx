"use client"

import { useAppContext } from "@/lib/AppContext"
import { AuthPage } from "@/components/AuthPage"
import OnboardingFlow from "@/components/OnboardingFlow"
import { Button } from "@/components/ui/button"
import { LogOut, Users, Check, FileText, Edit, Package, Calendar, Wrench } from "lucide-react"
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
    <main className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-[2000px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
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
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex gap-2">
            <Button
              onClick={() => setMainView('projects')}
              variant={mainView === 'projects' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'projects' ? 'bg-brand-500 text-white' : ''}
            >
              Project Timeline
            </Button>
            <Button
              onClick={() => setMainView('people')}
              variant={mainView === 'people' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'people' ? 'bg-brand-500 text-white' : ''}
            >
              <Users className="h-4 w-4 mr-2" />
              People
            </Button>
            <Button
              onClick={() => setMainView('daytoday')}
              variant={mainView === 'daytoday' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'daytoday' ? 'bg-brand-500 text-white' : ''}
            >
              <Check className="h-4 w-4 mr-2" />
              Day to Day
            </Button>
            <Button
              onClick={() => setMainView('eln')}
              variant={mainView === 'eln' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'eln' ? 'bg-brand-500 text-white' : ''}
            >
              <FileText className="h-4 w-4 mr-2" />
              Lab Notebook
            </Button>
            <Button
              onClick={() => setMainView('orders')}
              variant={mainView === 'orders' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'orders' ? 'bg-brand-500 text-white' : ''}
            >
              <Package className="h-4 w-4 mr-2" />
              Orders
            </Button>
            <Button
              onClick={() => setMainView('equipment')}
              variant={mainView === 'equipment' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'equipment' ? 'bg-brand-500 text-white' : ''}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Equipment
            </Button>
            <Button
              onClick={() => setMainView('calendar')}
              variant={mainView === 'calendar' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'calendar' ? 'bg-brand-500 text-white' : ''}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              onClick={() => setMainView('myprofile')}
              variant={mainView === 'myprofile' ? 'default' : 'outline'}
              size="lg"
              className={mainView === 'myprofile' ? 'bg-brand-500 text-white' : ''}
            >
              <Edit className="h-4 w-4 mr-2" />
              My Profile
            </Button>
            {(currentUserProfile?.isAdministrator || currentUser?.isAdministrator) && (
              <Button
                onClick={() => setMainView('profiles')}
                variant={mainView === 'profiles' ? 'default' : 'outline'}
                size="lg"
                className={mainView === 'profiles' ? 'bg-brand-500 text-white' : ''}
              >
                <Users className="h-4 w-4 mr-2" />
                All Profiles
              </Button>
            )}
          </div>
        </div>

        {/* Render selected view */}
        {mainView === 'projects' && <ProjectDashboard />}
        {mainView === 'people' && <PeopleView currentUserProfile={currentUserProfile} />}
        {mainView === 'daytoday' && <DayToDayBoard />}
        {mainView === 'eln' && <ElectronicLabNotebook />}
        {mainView === 'orders' && <OrdersInventory />}
        {mainView === 'equipment' && <EquipmentManagement />}
        {mainView === 'calendar' && <CalendarEvents />}
        {mainView === 'myprofile' && <PersonalProfilePage currentUser={currentUser} currentUserProfile={currentUserProfile} />}
        {mainView === 'profiles' && <ProfileManagement currentUser={currentUser} currentUserProfile={currentUserProfile} />}
      </div>

      {/* GDPR Cookie Consent Banner - ePrivacy Directive Compliance */}
      <CookieConsentBanner />
    </main>
  )
}