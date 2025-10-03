'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Button from '@/components/ui/Button'

export default function Home() {
  const { data: session, status } = useSession()

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    )
  }

  // If user is authenticated, redirect to home
  if (session) {
    redirect('/home')
  }

  // Show marketing/landing page for unauthenticated users
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Company Name */}
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            
            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-12">
            Coordination, the way it should be:
            <span className="block text-gray-700">open, interoperable, connected</span>
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Syncing Issues
            </Link>
            <Link
              href="/auth/signin"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold border border-gray-300 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className=" py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Why Choose Concoord?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Universal data interoperability for construction. Connect any system, sync any data.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Lightning Fast</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Sync data between systems in seconds, not hours. Automated data transfer saves you time and reduces errors.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Accurate Mapping</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Intelligent field mapping ensures your data transfers correctly between any construction systems.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Secure & Reliable</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Enterprise-grade security with OAuth 2.0 authentication. Your data is always protected across all systems.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className=" py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in just a few simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-white text-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Connect Your Systems</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Securely connect your construction management systems with OAuth 2.0 authentication.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white text-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Select Projects</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Choose your source and destination projects for seamless data synchronization.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white text-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Sync Data</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Select the data you want to transfer and let Concoord handle the rest automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className=" py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Ready to Streamline Your Workflow?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Join construction teams who are already saving hours with universal data interoperability.
          </p>
          <Button
            href="/auth/signup"
            variant="primary"
            size="lg"
          >
            Get Started Free
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className=" text-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-orange-500">Concoord</span>
            </div>
            <p className="text-gray-400">
              © 2024 Concoord. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}