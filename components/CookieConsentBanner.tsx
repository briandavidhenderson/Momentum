"use client"

import React, { useState, useEffect } from "react"
import { X, Cookie, Shield, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/useAuth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { UserConsent } from "@/lib/types"
import { PRIVACY_POLICY_VERSION } from "@/lib/constants"
import { logger } from "@/lib/logger"

/**
 * CookieConsentBanner - GDPR & ePrivacy Directive Compliance
 *
 * Implements:
 * - ePrivacy Directive (Cookie Consent)
 * - GDPR Article 6.1.a (Consent as lawful basis)
 * - GDPR Article 7 (Conditions for consent)
 *
 * Requirements:
 * - Must block non-essential cookies until consent given
 * - Must provide clear information about cookie purposes
 * - Must allow granular control (accept/reject specific types)
 * - Must allow easy withdrawal of consent
 * - Consent must be freely given, specific, informed, and unambiguous
 */

interface CookieConsentBannerProps {
  onConsentChange?: (consent: UserConsent) => void
}

export function CookieConsentBanner({ onConsentChange }: CookieConsentBannerProps) {
  const { currentUser: user, currentUserProfile: userProfile } = useAuth()
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)

  // Consent state
  const [functionalCookies, setFunctionalCookies] = useState(true) // Always required
  const [analyticsCookies, setAnalyticsCookies] = useState(false)
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false)

  // Check if user has already given consent
  useEffect(() => {
    async function checkConsent() {
      const db = getFirebaseDb()
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const consentDoc = await getDoc(doc(db, "userConsents", user.uid))

        if (consentDoc.exists()) {
          const consent = consentDoc.data() as UserConsent

          // Check if consent is for current privacy policy version
          if (consent.consentVersion === PRIVACY_POLICY_VERSION) {
            setShowBanner(false)

            // Apply consent settings
            if (consent.analyticsCookies) {
              enableAnalytics()
            }

            onConsentChange?.(consent)
          } else {
            // Privacy policy updated - need new consent
            setShowBanner(true)
          }
        } else {
          // No consent record - show banner
          setShowBanner(true)
        }
      } catch (error) {
        logger.error("Error checking consent", error)
        setShowBanner(true)
      } finally {
        setLoading(false)
      }
    }

    checkConsent()
  }, [user, onConsentChange])

  const enableAnalytics = () => {
    // Enable Firebase Analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        functionality_storage: "granted",
      })
    }
  }

  const disableAnalytics = () => {
    // Disable Firebase Analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        functionality_storage: "granted", // Functional always allowed
      })
    }
  }

  const saveConsent = async (consent: Partial<UserConsent>) => {
    const db = getFirebaseDb()
    if (!user) return

    setLoading(true)

    try {
      const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : ""

      const consentData: UserConsent = {
        id: user.uid,
        userId: user.uid,
        labId: userProfile?.labId,
        functionalCookies: true, // Always required
        analyticsCookies: consent.analyticsCookies || false,
        dataProcessingConsent: consent.dataProcessingConsent || false,
        specialCategoryDataAcknowledged: false, // Separate ELN workflow
        consentGivenAt: new Date().toISOString(),
        consentVersion: PRIVACY_POLICY_VERSION,
        userAgent,
      }

      // Save to Firestore
      await setDoc(doc(db, "userConsents", user.uid), consentData)

      // Update user's consent flag
      await setDoc(
        doc(db, "users", user.uid),
        {
          gdprCompliant: true,
          consentId: user.uid,
        },
        { merge: true }
      )

      // Apply analytics settings
      if (consentData.analyticsCookies) {
        enableAnalytics()
      } else {
        disableAnalytics()
      }

      onConsentChange?.(consentData)
      setShowBanner(false)
    } catch (error) {
      logger.error("Error saving consent", error)
      alert("Failed to save consent settings. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptAll = () => {
    saveConsent({
      analyticsCookies: true,
      dataProcessingConsent: true,
    })
  }

  const handleRejectAll = () => {
    saveConsent({
      analyticsCookies: false,
      dataProcessingConsent: true, // Still need basic processing consent to use app
    })
  }

  const handleSavePreferences = () => {
    saveConsent({
      analyticsCookies,
      dataProcessingConsent,
    })
  }

  if (loading || !showBanner || !user) {
    return null
  }

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t shadow-lg">
        <div className="container max-w-6xl mx-auto">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Cookie className="h-6 w-6 text-primary" />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Your Privacy Matters
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  We use cookies and similar technologies to provide essential functionality and,
                  with your consent, to analyze usage and improve our service. Functional cookies
                  are required for the app to work. You can choose whether to allow analytics cookies.
                </p>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    We comply with GDPR, Irish Data Protection Act 2018, and ePrivacy Directive.
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleAcceptAll}
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    Accept All
                  </Button>

                  <Button
                    onClick={handleRejectAll}
                    variant="outline"
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    Reject Analytics
                  </Button>

                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="ghost"
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    Customize
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRejectAll}
                className="flex-shrink-0"
                aria-label="Close and reject analytics"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Detailed Consent Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cookie & Privacy Preferences</DialogTitle>
            <DialogDescription>
              Choose which cookies and data processing you want to allow. You can change
              these settings at any time in your Privacy Dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Functional Cookies - Required */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
              <Checkbox
                checked={functionalCookies}
                disabled
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <label className="font-medium text-sm">
                    Functional Cookies (Required)
                  </label>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Always Active
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Essential cookies required for authentication, session management,
                  and core app functionality. These cannot be disabled.
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Lawful Basis:</strong> Contract (GDPR Article 6.1.b) -
                  Necessary for the performance of our service contract with you.
                </div>
              </div>
            </div>

            {/* Analytics Cookies - Optional */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Checkbox
                checked={analyticsCookies}
                onCheckedChange={(checked) => setAnalyticsCookies(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <label className="font-medium text-sm">
                  Analytics & Performance Cookies (Optional)
                </label>
                <p className="text-sm text-muted-foreground">
                  Help us understand how you use Momentum so we can improve the experience.
                  Includes Firebase Analytics and performance monitoring. No personal
                  data is shared with third parties.
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Lawful Basis:</strong> Consent (GDPR Article 6.1.a) -
                  You can withdraw consent at any time.
                </div>
              </div>
            </div>

            {/* Data Processing Consent */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <Checkbox
                checked={dataProcessingConsent}
                onCheckedChange={(checked) => setDataProcessingConsent(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <label className="font-medium text-sm">
                  Data Processing Consent
                </label>
                <p className="text-sm text-muted-foreground">
                  I consent to Momentum processing my personal data (name, email, research data)
                  to provide the lab management service. All data is stored in EU regions
                  (Ireland - europe-west1) and processed in accordance with GDPR.
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Data Location:</strong> EU (Ireland - europe-west1) •{" "}
                  <strong>Retention:</strong> See Privacy Policy •{" "}
                  <strong>Your Rights:</strong> Access, Rectification, Erasure, Restriction, Portability
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowDetails(false)}
            >
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleSavePreferences}
                disabled={!dataProcessingConsent || loading}
              >
                Save Preferences
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            By continuing to use Momentum, you agree to our Privacy Policy and Terms of Service.
            For questions about data protection, contact your lab&apos;s Data Protection Officer.
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
