"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock, Mail, LogIn, UserPlus } from "lucide-react"
import { User as UserType } from "@/lib/types"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase"
import { createUser } from "@/lib/firestoreService"
import { logger } from "@/lib/logger"

interface AuthPageProps {
  onLogin: (uid: string) => void
  onSignup: (uid: string, email: string, fullName: string) => void
}

export function AuthPage({ onLogin, onSignup }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    const auth = getFirebaseAuth()
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in all required fields")
      return
    }

    if (!isLogin && !fullName) {
      setError("Please enter your full name")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    try {
      if (isLogin) {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Check if email is verified
        if (!user.emailVerified) {
          setError(
            "Please verify your email before signing in. Check your inbox for the verification link. " +
            "If you didn't receive it, try signing up again to resend the verification email."
          )
          return
        }

        // Call onLogin with uid
        onLogin(user.uid)
      } else {
        // Sign up with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Update Firebase Auth profile with display name
        await updateProfile(user, {
          displayName: fullName
        })

        // Send verification email
        await sendEmailVerification(user)
        setVerificationSent(true)

        // Create user document in Firestore
        await createUser(user.uid, email, fullName)

        // Note: Don't call onSignup yet - wait for email verification
      }
    } catch (error: any) {
      logger.error("Authentication error", error)

      // Handle specific Firebase errors
      if (error.code === "auth/user-not-found") {
        setError("User not found. Please sign up first.")
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password.")
      } else if (error.code === "auth/email-already-in-use") {
        setError("Email already registered. Please log in instead.")
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.")
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.")
      } else if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password. If you haven't created an account yet, please Sign Up.")
      } else if (error.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.")
      } else {
        setError(error.message || "An error occurred. Please try again.")
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-monday p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Momentum Lab</h1>
            <p className="text-muted-foreground">
              {isLogin ? "Welcome back!" : "Create your account"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {verificationSent && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm space-y-2">
              <p className="font-semibold">✓ Verification Email Sent!</p>
              <p>
                We&apos;ve sent a verification link to <strong>{email}</strong>.
                Please check your inbox and click the link to verify your email address.
              </p>
              <p className="text-xs">
                After verifying, you can sign in with your credentials.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setVerificationSent(false)
                  setIsLogin(true)
                  setEmail("")
                  setPassword("")
                }}
              >
                Go to Sign In
              </Button>
            </div>
          )}

          {!verificationSent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="fullName" className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required={!isLogin}
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@lab.org"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-6 text-lg font-semibold"
              >
                {isLogin ? (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
          )}

          {!verificationSent && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                  setFullName("")
                  setEmail("")
                  setPassword("")
                }}
                className="text-sm text-brand-500 hover:text-brand-600 font-medium"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Secure lab management system
        </p>
      </div>
    </div>
  )
}

