"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { EnhancedProfilePage } from "@/components/profile/EnhancedProfilePage"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { currentUser, currentUserProfile, isLoadingProfile } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-brand-500 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Profile</h3>
          <p className="text-sm text-muted-foreground">
            Fetching your profile information...
          </p>
        </div>
      </div>
    )
  }

  if (!currentUser || !currentUserProfile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
          <p className="text-sm text-muted-foreground">
            Please complete your profile setup first.
          </p>
        </div>
      </div>
    )
  }

  return <EnhancedProfilePage currentUser={currentUser} currentUserProfile={currentUserProfile} />
}

