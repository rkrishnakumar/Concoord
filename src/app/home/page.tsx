'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { apiFetch } from '@/lib/api-fetch'

interface Sync {
  id: string
  name: string
  description?: string
  sourceSystem: string
  sourceProjectName: string
  destinationSystem: string
  destinationProjectName: string
  status: 'draft' | 'active' | 'paused' | 'error'
  scheduleType: string
  lastRunAt?: string
  nextRunAt?: string
  lastRunStatus?: string
  fieldMappings?: any
  createdAt: string
  updatedAt: string
}

export default function HomePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [syncs, setSyncs] = useState<Sync[]>([])
  const [accConnected, setAccConnected] = useState(false)
  const [procoreConnected, setProcoreConnected] = useState(false)
  const [executingSync, setExecutingSync] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      checkConnectionStatus()
      loadSyncs()
    }
  }, [session])

  const checkConnectionStatus = async () => {
    try {
      if (!session?.user?.id) return
      
      const response = await apiFetch(`/api/credentials?userId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setAccConnected(!!data.acc?.connected)
        setProcoreConnected(!!data.procore?.connected)
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const loadSyncs = async () => {
    try {
      if (!session?.user?.id) return
      
      const response = await apiFetch(`/api/syncs?userId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setSyncs(data.syncs || [])
      } else {
        console.error('Failed to load syncs')
        setSyncs([])
      }
    } catch (error) {
      console.error('Error loading syncs:', error)
      setSyncs([])
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900 text-green-200'
      case 'paused': return 'bg-yellow-900 text-yellow-200'
      case 'error': return 'bg-red-900 text-red-200'
      case 'draft': return 'bg-gray-900 text-gray-200'
      default: return 'bg-gray-900 text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '▶️'
      case 'paused': return '⏸️'
      case 'error': return '❌'
      case 'draft': return '📝'
      default: return '⏳'
    }
  }

  const hasRequiredMappings = (sync: Sync) => {
    if (!sync.fieldMappings || !sync.fieldMappings.issues) {
      return false;
    }
    
    const mappings = sync.fieldMappings.issues;
    return mappings.some((mapping: any) => mapping.destinationField === 'title');
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString()
  }

  const executeSync = async (syncId: string) => {
    setExecutingSync(syncId)
    setMessage('')
    
    try {
      const response = await apiFetch(`/api/syncs/${syncId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setMessage(`✅ Sync executed successfully! ${result.results.issues.created} issues created.`)
        // Reload syncs to show updated status
        loadSyncs()
      } else {
        const error = await response.json()
        setMessage(`❌ Sync failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error executing sync:', error)
      setMessage(`❌ Sync failed: ${(error as any)?.message}`)
    } finally {
      setExecutingSync(null)
    }
  }

  const deleteSync = async (syncId: string, syncName: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${syncName}"?\n\nThis action cannot be undone.`
    )
    
    if (!confirmed) {
      return
    }

    setLoading(true)
    setMessage('')
    
    try {
      const response = await apiFetch(`/api/syncs/${syncId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id
        })
      })
      
      if (response.ok) {
        setMessage(`✅ Sync "${syncName}" deleted successfully!`)
        // Reload syncs to show updated list
        loadSyncs()
      } else {
        const error = await response.json()
        setMessage(`❌ Failed to delete sync: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting sync:', error)
      setMessage(`❌ Failed to delete sync: ${(error as any)?.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f0eee6] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please sign in</h1>
          <p className="text-gray-700">You need to be signed in to access your syncs.</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout>
      {message && <Alert type="info" className="mb-6">{message}</Alert>}


      {/* Syncs Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Your Syncs</h1>
        <div className="relative group">
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => {
              if (accConnected && procoreConnected) {
                window.location.href = '/sync/new'
              }
            }}
            disabled={!accConnected || !procoreConnected}
          >
            + New Sync
          </Button>
          {(!accConnected || !procoreConnected) && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Please connect to systems in Settings before creating a new sync.
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>
      </div>

      {/* Syncs List */}
      <div className="space-y-4">
        {syncs.length > 0 && (
          <div className="flex items-center justify-end">
            <Button variant="secondary" size="sm">
              View All
            </Button>
          </div>
        )}

        {syncs.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No syncs yet</h3>
              <p className="text-gray-700">
                Create your first sync to start transferring data between systems.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {syncs.map((sync) => (
              <Card key={sync.id} hover>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{sync.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sync.status)}`}>
                        {getStatusIcon(sync.status)} {sync.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span>{sync.sourceProjectName} → {sync.destinationProjectName}</span>
                      {sync.lastRunAt && <span>Last run: {formatDate(sync.lastRunAt)}</span>}
                      {sync.nextRunAt && <span>Next: {formatDate(sync.nextRunAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => executeSync(sync.id)}
                      disabled={executingSync === sync.id || !hasRequiredMappings(sync)}
                    >
                      {executingSync === sync.id ? 'Executing...' : 'Execute'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => window.location.href = `/sync/edit/${sync.id}`}
                    >
                      View
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => window.location.href = `/sync/edit/${sync.id}`}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => deleteSync(sync.id, sync.name)}
                      disabled={loading || executingSync === sync.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
    </PageLayout>
  )
}