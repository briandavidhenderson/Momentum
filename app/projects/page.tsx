"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { useAppContext } from "@/lib/AppContext"
import { UserRole } from "@/lib/types"
import { AuthPage } from "@/components/AuthPage"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { NotificationBell } from "@/components/NotificationBell"
import OnboardingFlow from "@/components/OnboardingFlow"
import { ProjectDashboard } from "@/components/views/ProjectDashboard"
import TopModuleNavigation from "@/components/TopModuleNavigation"
import { Button } from "@/components/ui/button"

export default function ProjectsPage() {
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
    mainView,
    setMainView,
  } = useAppContext()

  useEffect(() => {
    if (mainView !== "projects") {
      setMainView("projects")
    }
  }, [mainView, setMainView])

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

  if (authState === "auth") {
    return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />
  }

  if (authState === "setup" && currentUser) {
    return (
      <OnboardingFlow
        user={currentUser}
        onComplete={handleProfileSetupComplete}
        onCancel={handleSignOut}
      />
    )
  }

  const isAdmin = currentUserProfile?.isAdministrator || currentUser?.isAdministrator || false
  const hasRoleRestriction =
    currentUserProfile?.userRole === UserRole.PI ||
    currentUserProfile?.userRole === UserRole.FINANCE_ADMIN ||
    currentUserProfile?.userRole === UserRole.LAB_MANAGER

  const handleNavigationSelect = (moduleId: string) => {
    if (moduleId === "projects") return

    setMainView(moduleId as typeof mainView)
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[2000px] mx-auto">
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Link href="/" className="text-2xl font-bold text-slate-900 tracking-tight">
                  Momentum {currentUserProfile?.position || currentUser?.email}
                </Link>
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

          <TopModuleNavigation
            activeModule={mainView}
            onSelect={handleNavigationSelect}
            isAdmin={isAdmin}
            hasRoleRestriction={hasRoleRestriction}
          />
        </div>

        <div className="p-6">
          <ProjectDashboard />
        </div>
      </div>

      <CookieConsentBanner />
    </main>
  )
}
