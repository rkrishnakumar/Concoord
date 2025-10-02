'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import SettingsModal from '@/components/SettingsModal'

export default function Navigation() {
  const { data: session } = useSession()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (!session) {
    return null
  }

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/home" className="flex items-center">
              <span className="text-3xl font-bold text-orange-500">Concoord</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              href="/home"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Home
            </Link>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Settings
            </button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/home"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              Home
            </Link>
            <Link
              href="/settings"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              Settings
            </Link>
            <Button
              variant="primary"
              size="lg"
              onClick={() => signOut()}
              className="w-full text-left"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </nav>
  )
}