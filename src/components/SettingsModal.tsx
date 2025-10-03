'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { apiFetch } from '@/lib/api-fetch'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [accConnected, setAccConnected] = useState(false)
  const [procoreConnected, setProcoreConnected] = useState(false)
  const [reviztoConnected, setReviztoConnected] = useState(false)
  const [activeSection, setActiveSection] = useState<'about' | 'integrations'>('integrations')

  useEffect(() => {
    if (isOpen) {
      setMessage('') // Clear any previous messages
      fetchCredentials()
    }
  }, [isOpen])

  const fetchCredentials = async () => {
    try {
      const response = await apiFetch('/api/credentials')
      if (response.ok) {
        const data = await response.json()
        setAccConnected(!!data.accCredentials?.accessToken)
        setProcoreConnected(!!data.procoreCredentials?.accessToken)
        setReviztoConnected(!!data.reviztoCredentials?.accessToken)
      }
    } catch (error) {
      console.error('Error fetching credentials:', error)
    }
  }

  const authenticateWithAcc = async () => {
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      window.location.href = `${backendUrl}/api/auth/acc/connect`
    } catch (error) {
      console.error('ACC authentication error:', error)
    } finally {
      setLoading(false)
    }
  }

  const authenticateWithProcore = async () => {
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      window.location.href = `${backendUrl}/api/auth/procore/connect`
    } catch (error) {
      console.error('Procore authentication error:', error)
    } finally {
      setLoading(false)
    }
  }

  const [reviztoAccessCode, setReviztoAccessCode] = useState('')

  const authenticateWithRevizto = async () => {
    if (!reviztoAccessCode.trim()) {
      setMessage('Please enter your Revizto access code')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/auth/revizto/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessCode: reviztoAccessCode
        })
      })
      
      if (response.ok) {
        setMessage('Revizto access code configured successfully!')
        setReviztoAccessCode('')
        await fetchCredentials()
      } else {
        const error = await response.json()
        const errorMessage = error.details ? `${error.error}: ${error.details}` : error.error || 'Failed to configure access code'
        setMessage(errorMessage)
      }
    } catch (error) {
      console.error('Revizto authentication error:', error)
      setMessage('Failed to configure access code')
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (type: 'acc' | 'procore' | 'revizto') => {
    setLoading(true)
    setMessage('') // Clear previous message
    try {
      const response = await apiFetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message || `${type.toUpperCase()} connection test successful!`)
      } else {
        const error = await response.json()
        setMessage(error.error || 'Connection test failed')
      }
    } catch (error) {
      setMessage('Connection test failed')
    } finally {
      setLoading(false)
    }
  }

  const disconnectAccount = async (type: 'acc' | 'procore' | 'revizto') => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      if (response.ok) {
        setMessage(`${type.toUpperCase()} account disconnected successfully`)
        await fetchCredentials()
      } else {
        setMessage('Failed to disconnect account')
      }
    } catch (error) {
      setMessage('Failed to disconnect account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="flex h-[600px]">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Close button */}
          <div className="p-4 border-b border-gray-300">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 p-4">
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveSection('about')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  activeSection === 'about' 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>About</span>
              </button>
              <button 
                onClick={() => setActiveSection('integrations')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  activeSection === 'integrations' 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Integrations</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {activeSection === 'about' ? 'About' : 'Integrations'}
            </h2>
            
            {message && <Alert type="info" className="mb-6">{message}</Alert>}
            
            {activeSection === 'about' ? (
              <div className="text-left space-y-4">
                <p className="text-base text-gray-600 leading-relaxed">
                  Construction moves faster when systems speak the same language. ConCoord makes coordination seamless, so your team can focus on progress, not process.
                </p>
                <p className="text-base text-gray-600 leading-relaxed">
                  ConCoord was made by <a href="https://www.linkedin.com/in/rahulkrishnakumar/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 underline">Rahul Krishnakumar</a>, a product manager at Procore and is licensed under <a href="https://github.com/rkrishnakumar/Concoord" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 underline">GPL-3.0 license on GitHub</a> for anyone to fork and improve for non-commercial purposes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
              {/* Autodesk Integration */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Autodesk Logo */}
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                      <img 
                        src="/autodesk-logo.png" 
                        alt="Autodesk" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Autodesk Construction Cloud</h3>
                      <p className="text-gray-600 text-sm">Connect to Autodesk, to select your projects and issues.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {accConnected ? (
                      <>
                        <span className="inline-flex items-center px-3 h-[2.5rem] rounded-full text-sm font-medium bg-green-900 text-green-200">
                          Connected
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => disconnectAccount('acc')}
                          loading={loading}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={authenticateWithAcc}
                        loading={loading}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
                {accConnected && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testConnection('acc')}
                      loading={loading}
                    >
                      Test Connection
                    </Button>
                  </div>
                )}
              </div>

              {/* Procore Integration */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Procore Logo */}
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                      <img 
                        src="/procore-logo.png" 
                        alt="Procore" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Procore</h3>
                      <p className="text-gray-600 text-sm">Connect to Procore, to select your projects and issues.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {procoreConnected ? (
                      <>
                        <span className="inline-flex items-center px-3 h-[2.5rem] rounded-full text-sm font-medium bg-green-900 text-green-200">
                          Connected
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => disconnectAccount('procore')}
                          loading={loading}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={authenticateWithProcore}
                        loading={loading}
                        className="text-black"
                        style={{ backgroundColor: '#FF5200' }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
                {procoreConnected && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testConnection('procore')}
                      loading={loading}
                    >
                      Test Connection
                    </Button>
                  </div>
                )}
              </div>

              {/* Revizto Integration */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Revizto Logo */}
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                      <img 
                        src="/revizto-logo.png" 
                        alt="Revizto" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Revizto</h3>
                      <p className="text-gray-600 text-sm">Enter your Revizto access code to connect and select your projects and issues.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {reviztoConnected ? (
                      <>
                        <span className="inline-flex items-center px-3 h-[2.5rem] rounded-full text-sm font-medium bg-green-900 text-green-200">
                          Connected
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => disconnectAccount('revizto')}
                          loading={loading}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={authenticateWithRevizto}
                        loading={loading}
                        className="text-black"
                        style={{ backgroundColor: '#00A8CC' }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
                {!reviztoConnected && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-600">
                        Access Code
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={reviztoAccessCode}
                          onChange={(e) => setReviztoAccessCode(e.target.value)}
                          placeholder="Enter your Revizto access code"
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={authenticateWithRevizto}
                          loading={loading}
                          className="text-black"
                          style={{ backgroundColor: '#00A8CC' }}
                        >
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {reviztoConnected && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testConnection('revizto')}
                      loading={loading}
                    >
                      Test Connection
                    </Button>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
