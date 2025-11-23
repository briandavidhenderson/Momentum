"use client"

/**
 * Google Calendar OAuth Callback Page
 * This page is loaded in a popup window after the user authorizes Google Calendar access.
 * The parent window reads the authorization code from this page's URL and closes the popup.
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function GoogleCalendarCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connecting Google Calendar
          </h1>
        </div>
      </div>
    }>
      <GoogleCalendarCallbackContent />
    </Suspense>
  )
}

function GoogleCalendarCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processing authorization...')

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error) {
      setStatus('error')
      setMessage(`Authorization failed: ${error}`)
      // Close popup after 3 seconds
      setTimeout(() => {
        window.close()
      }, 3000)
      return
    }

    if (code && state) {
      setStatus('success')
      setMessage('Authorization successful! This window will close automatically.')
      // The parent window will detect this and close the popup
      // But we'll also try to close it after 2 seconds as a fallback
      setTimeout(() => {
        window.close()
      }, 2000)
    } else {
      setStatus('error')
      setMessage('Missing authorization code. Please try again.')
      setTimeout(() => {
        window.close()
      }, 3000)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Connecting Google Calendar
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Success!
              </h1>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Error
              </h1>
            </>
          )}

          <p className="text-center text-gray-600 dark:text-gray-300">
            {message}
          </p>

          {status !== 'loading' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This window will close automatically...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
