'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Navigation from '@/components/Navigation'
import Button from '@/components/ui/Button'
import { apiFetch } from '@/lib/api-fetch'

interface AccProject {
  id: string
  name: string
  description?: string
}

interface AccIssue {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  assignee?: string
  created_at: string
  updated_at: string
}

interface ProcoreCompany {
  id: string
  name: string
}

interface ProcoreProject {
  id: string
  name: string
  display_name: string
  company: { id: string; name: string }
}

export default function SyncPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // ACC Projects & Issues
  const [accProjects, setAccProjects] = useState<AccProject[]>([])
  const [selectedAccProject, setSelectedAccProject] = useState<string>('')
  const [accIssues, setAccIssues] = useState<AccIssue[]>([])
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  
  // Procore Companies & Projects
  const [procoreCompanies, setProcoreCompanies] = useState<ProcoreCompany[]>([])
  const [procoreProjects, setProcoreProjects] = useState<ProcoreProject[]>([])
  const [selectedProcoreCompany, setSelectedProcoreCompany] = useState<string>('')
  const [selectedProcoreProject, setSelectedProcoreProject] = useState<string>('')
  
  // Connection Status
  const [accConnected, setAccConnected] = useState(false)
  const [procoreConnected, setProcoreConnected] = useState(false)

  useEffect(() => {
    if (session) {
      checkConnectionStatus()
    }
  }, [session])

  const checkConnectionStatus = async () => {
    try {
      const response = await apiFetch('/api/credentials')
      if (response.ok) {
        const data = await response.json()
        setAccConnected(!!data.accCredentials?.accessToken)
        setProcoreConnected(!!data.procoreCredentials?.accessToken)
        
        if (data.procoreCredentials?.accessToken) {
          loadProcoreCompanies()
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const loadProcoreCompanies = async () => {
    try {
      const response = await apiFetch('/api/procore/companies')
      if (response.ok) {
        const companies = await response.json()
        setProcoreCompanies(companies)
      }
    } catch (error) {
      console.error('Error loading Procore companies:', error)
    }
  }

  const loadProcoreProjects = async (companyId: string) => {
    try {
      const response = await fetch(`/api/procore/projects?companyId=${companyId}`)
      if (response.ok) {
        const projects = await response.json()
        setProcoreProjects(projects)
      }
    } catch (error) {
      console.error('Error loading Procore projects:', error)
    }
  }

  const loadAccIssues = async (projectId: string) => {
    try {
      const response = await fetch(`/api/acc/issues?projectId=${projectId}`)
      if (response.ok) {
        const issues = await response.json()
        setAccIssues(issues)
      }
    } catch (error) {
      console.error('Error loading ACC issues:', error)
    }
  }

  const handleCompanyChange = (companyId: string) => {
    setSelectedProcoreCompany(companyId)
    setSelectedProcoreProject('')
    setProcoreProjects([])
    if (companyId) {
      loadProcoreProjects(companyId)
    }
  }

  const handleAccProjectChange = (projectId: string) => {
    setSelectedAccProject(projectId)
    setAccIssues([])
    setSelectedIssues([])
    if (projectId) {
      loadAccIssues(projectId)
    }
  }

  const handleIssueToggle = (issueId: string) => {
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    )
  }

  const handleSelectAll = () => {
    if (selectedIssues.length === accIssues.length) {
      setSelectedIssues([])
    } else {
      setSelectedIssues(accIssues.map(issue => issue.id))
    }
  }

  const executeSync = async () => {
    if (!selectedAccProject || !selectedProcoreProject || selectedIssues.length === 0) {
      setMessage('Please select ACC project, Procore project, and at least one issue to sync.')
      return
    }

    setLoading(true)
    setMessage('')
    
    try {
      const response = await apiFetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accProjectId: selectedAccProject,
          procoreProjectId: selectedProcoreProject,
          issueIds: selectedIssues,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage(data.message || 'Sync completed successfully!')
      } else {
        const error = await response.json()
        setMessage(error.message || 'Sync failed')
      }
    } catch (error) {
      setMessage('Error executing sync')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to access the sync page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen ">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Data Sync</h1>
          <p className="mt-2 text-gray-600">
            Select data from your source system and sync it to your destination system.
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-md">
            <p className="text-blue-200">{message}</p>
          </div>
        )}

        {/* Step 1: Select ACC Project & Issues */}
        <div className=" rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Step 1: Select Source Project & Data
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Source Project
              </label>
              <select
                value={selectedAccProject}
                onChange={(e) => handleAccProjectChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a source project...</option>
                {accProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            {accIssues.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-600">
                    Data Items ({accIssues.length})
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedIssues.length === accIssues.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {accIssues.map((issue) => (
                    <label key={issue.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg hover:bg-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIssues.includes(issue.id)}
                        onChange={() => handleIssueToggle(issue.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {issue.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          Status: {issue.status} • Priority: {issue.priority || 'N/A'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Select Procore Project */}
        <div className=" rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Step 2: Select Destination Project
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Destination Company
              </label>
              <select
                value={selectedProcoreCompany}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a company...</option>
                {procoreCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Destination Project
              </label>
              <select
                value={selectedProcoreProject}
                onChange={(e) => setSelectedProcoreProject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a project...</option>
                {procoreProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Configure Field Mapping */}
        <div className=" rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Step 3: Configure Field Mapping
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Title Mapping
                </label>
                <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>ACC Title → Procore Title</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Status Mapping
                </label>
                <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>ACC Status → Procore Status</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Priority Mapping
                </label>
                <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>ACC Priority → Procore Priority</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Assignee Mapping
                </label>
                <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>ACC Assignee → Procore Assignee</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Execute Sync */}
        <div className=" rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Step 4: Execute Sync
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Sync Summary</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Source Project: {selectedAccProject ? accProjects.find(p => p.id === selectedAccProject)?.name : 'Not selected'}</p>
                <p>• Destination Project: {selectedProcoreProject ? procoreProjects.find(p => p.id === selectedProcoreProject)?.display_name : 'Not selected'}</p>
                <p>• Data items to sync: {selectedIssues.length}</p>
              </div>
            </div>
            
            <Button
              variant="primary"
              size="lg"
              onClick={executeSync}
              disabled={loading || !selectedAccProject || !selectedProcoreProject || selectedIssues.length === 0}
              loading={loading}
              className="w-full"
            >
              Execute Sync
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}