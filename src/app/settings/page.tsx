'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { apiFetch } from '@/lib/api-fetch'

interface AccCredentials {
  clientId: string
  clientSecret: string
  accessToken?: string
  baseUrl: string
}

interface ProcoreCredentials {
  clientId: string
  clientSecret: string
  accessToken?: string
  baseUrl: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [accConnected, setAccConnected] = useState(false)
  const [procoreConnected, setProcoreConnected] = useState(false)

  useEffect(() => {
    if (session) {
      fetchCredentials()
      
      // Handle URL parameters for OAuth callbacks
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get('success')
      const error = urlParams.get('error')
      
      if (success === 'acc_authenticated') {
        setMessage('Source system authentication successful! You can now test the connection.')
        fetchCredentials()
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (success === 'procore_authenticated') {
        setMessage('Destination system authentication successful! You can now test the connection.')
        fetchCredentials()
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (error) {
        setMessage(`Authentication failed: ${error}`)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [session])

  const fetchCredentials = async () => {
    try {
      const response = await apiFetch('/api/credentials')
      if (response.ok) {
        const data = await response.json()
        setAccConnected(!!data.accCredentials?.accessToken)
        setProcoreConnected(!!data.procoreCredentials?.accessToken)
      }
    } catch (error) {
      console.error('Error fetching credentials:', error)
    }
  }

  const authenticateWithAcc = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await apiFetch('/api/auth/acc/connect')
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          setMessage('Failed to get authentication URL')
        }
      } else {
        setMessage('Failed to initiate source system authentication')
      }
    } catch (error) {
      setMessage('Error connecting to source system')
    } finally {
      setLoading(false)
    }
  }

  const authenticateWithProcore = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await apiFetch('/api/auth/procore/connect')
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          setMessage('Failed to get authentication URL')
        }
      } else {
        setMessage('Failed to initiate destination system authentication')
      }
    } catch (error) {
      setMessage('Error connecting to destination system')
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (type: 'acc' | 'procore') => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await apiFetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        fetchCredentials()
      } else {
        const error = await response.json()
        setMessage(error.message || 'Connection test failed')
      }
    } catch (error) {
      setMessage('Error testing connection')
    } finally {
      setLoading(false)
    }
  }

  const disconnectAccount = async (type: 'acc' | 'procore') => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await apiFetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      
      if (response.ok) {
        setMessage(`${type === 'acc' ? 'Source' : 'Destination'} system disconnected successfully`)
        fetchCredentials()
      } else {
        setMessage('Failed to disconnect system')
      }
    } catch (error) {
      setMessage('Error disconnecting system')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-300">You need to be signed in to access settings.</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Settings"
      description="Connect your construction management systems to enable data interoperability."
    >
      {message && <Alert type="info" className="mb-6">{message}</Alert>}

      {/* How it works */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">How it works</h2>
        <p className="text-gray-300">
          Simply click "Connect" for each system below. You'll be redirected to sign in with your existing account and grant permissions to Concoord. No credentials or technical setup required!
        </p>
      </Card>

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source System */}
        <Card hover>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Source System</h3>
            </div>
            {accConnected ? (
              <>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-200">
                  ✓ Connected
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
                Connect Source
              </Button>
            )}
          </div>
          <p className="text-gray-300 text-sm mb-4">
            Connect your source system to enable data synchronization.
          </p>
          {accConnected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testConnection('acc')}
              loading={loading}
            >
              Test Connection
            </Button>
          )}
        </Card>

        {/* Destination System */}
        <Card hover>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF5200' }}>
                <span className="text-black font-bold text-sm">D</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Destination System</h3>
            </div>
            {procoreConnected ? (
              <>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-200">
                  ✓ Connected
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
                Connect Destination
              </Button>
            )}
          </div>
          <p className="text-gray-300 text-sm mb-4">
            Connect your destination system to receive synchronized data.
          </p>
          {procoreConnected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => testConnection('procore')}
              loading={loading}
            >
              Test Connection
            </Button>
          )}
        </Card>
      </div>
    </PageLayout>
  )
}