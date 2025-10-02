'use client'

import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-6">
            There was a problem signing you in. This could be due to invalid credentials or a server error.
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full bg-blue-600 text-gray-800 py-2 px-4 rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors inline-block"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
