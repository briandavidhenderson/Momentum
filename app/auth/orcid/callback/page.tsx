"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * ORCID OAuth Callback Page
 * This page receives the authorization code from ORCID and closes the popup
 * The parent window will detect the URL change and extract the code
 */
export default function OrcidCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if we're in a popup window
    if (window.opener) {
      // The parent window will read the URL with the code parameter
      // Just wait a moment for the parent to read it, then we can close
      setTimeout(() => {
        window.close()
      }, 1000)
    } else {
      // Not in a popup - redirect to home
      router.push("/")
    }
  }, [router])

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>Completing ORCID authentication...</h2>
        <p>This window will close automatically.</p>
      </div>
    </div>
  )
}
