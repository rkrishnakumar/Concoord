'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import FieldMapping from '@/components/FieldMapping'
import { apiFetch } from '@/lib/api-fetch'

interface AccProject {
  id: string
  name: string
  description?: string
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

interface ReviztoProject {
  uuid: string
  title: string
  description?: string
}

export default function NewSyncPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // Form data
  const [syncName, setSyncName] = useState('')
  const [description, setDescription] = useState('')
  
  // System Selection
  const [selectedSourceSystem, setSelectedSourceSystem] = useState<string>('')
  const [selectedDestinationSystem, setSelectedDestinationSystem] = useState<string>('')
  
  // Data Type Selection
  const [selectedSourceDataTypes, setSelectedSourceDataTypes] = useState<string[]>([])
  const [selectedDestinationDataTypes, setSelectedDestinationDataTypes] = useState<string[]>([])
  
  // Projects & Data
  const [accProjects, setAccProjects] = useState<AccProject[]>([])
  const [selectedAccProject, setSelectedAccProject] = useState<string>('')
  const [procoreCompanies, setProcoreCompanies] = useState<ProcoreCompany[]>([])
  const [procoreProjects, setProcoreProjects] = useState<ProcoreProject[]>([])
  const [selectedProcoreCompany, setSelectedProcoreCompany] = useState<string>('')
  const [selectedProcoreProject, setSelectedProcoreProject] = useState<string>('')
  
  // Revizto projects
  const [reviztoProjects, setReviztoProjects] = useState<ReviztoProject[]>([])
  const [selectedReviztoProject, setSelectedReviztoProject] = useState<string>('')
  
  // Field mappings
  const [fieldMappings, setFieldMappings] = useState<Record<string, Array<{sourceField: string, destinationField: string}>>>({})
  const [fieldMappingValidation, setFieldMappingValidation] = useState<{
    valid: boolean
    errors: any[]
    warnings: any[]
  }>({ valid: true, errors: [], warnings: [] })
  const [sourceFields, setSourceFields] = useState<Record<string, any[]>>({})
  const [destinationFields, setDestinationFields] = useState<Record<string, any[]>>({})
  const [loadingFields, setLoadingFields] = useState(false)
  
  // Connection Status
  const [accConnected, setAccConnected] = useState(false)
  const [procoreConnected, setProcoreConnected] = useState(false)
  const [reviztoConnected, setReviztoConnected] = useState(false)

  useEffect(() => {
    if (session) {
      checkConnectionStatus()
    }
  }, [session])

  // Fetch fields when source system and data types are selected
  useEffect(() => {
    console.log('Source system effect triggered:', { selectedSourceSystem, selectedSourceDataTypes })
    if (selectedSourceSystem && selectedSourceDataTypes.length > 0) {
      console.log(`Fetching source fields for ${selectedSourceSystem} with types:`, selectedSourceDataTypes)
      fetchFieldsForSystem(selectedSourceSystem, selectedSourceDataTypes)
    }
  }, [selectedSourceSystem, selectedSourceDataTypes])

  // Fetch fields when source project is selected (for Revizto)
  useEffect(() => {
    if (selectedSourceSystem === 'revizto' && selectedReviztoProject && selectedSourceDataTypes.length > 0) {
      console.log(`Fetching Revizto fields for project: ${selectedReviztoProject}`)
      fetchFieldsForSystem('revizto', selectedSourceDataTypes)
    }
  }, [selectedReviztoProject, selectedSourceSystem, selectedSourceDataTypes])

  // Fetch fields when destination system and data types are selected
  useEffect(() => {
    if (selectedDestinationSystem && selectedDestinationDataTypes.length > 0) {
      fetchFieldsForSystem(selectedDestinationSystem, selectedDestinationDataTypes)
    }
  }, [selectedDestinationSystem, selectedDestinationDataTypes])

  // Load Procore companies when Procore is selected as destination
  useEffect(() => {
    if (selectedDestinationSystem === 'procore' && procoreConnected) {
      loadProcoreCompanies()
    }
  }, [selectedDestinationSystem, procoreConnected])

  // Load ACC projects when ACC is selected as source
  useEffect(() => {
    if (selectedSourceSystem === 'acc' && accConnected && accProjects.length === 0) {
      loadAccProjects()
    }
  }, [selectedSourceSystem, accConnected, accProjects.length])

  // Load Procore companies when Procore is selected as source
  useEffect(() => {
    if (selectedSourceSystem === 'procore' && procoreConnected) {
      loadProcoreCompanies()
    }
  }, [selectedSourceSystem, procoreConnected])

  // Load ACC projects when ACC is selected as destination
  useEffect(() => {
    if (selectedDestinationSystem === 'acc' && accConnected && accProjects.length === 0) {
      loadAccProjects()
    }
  }, [selectedDestinationSystem, accConnected, accProjects.length])

  // Load Revizto projects when Revizto is selected as source
  useEffect(() => {
    if (selectedSourceSystem === 'revizto' && reviztoConnected && reviztoProjects.length === 0) {
      loadReviztoProjects()
    }
  }, [selectedSourceSystem, reviztoConnected, reviztoProjects.length])

  // Load Revizto projects when Revizto is selected as destination
  useEffect(() => {
    if (selectedDestinationSystem === 'revizto' && reviztoConnected && reviztoProjects.length === 0) {
      loadReviztoProjects()
    }
  }, [selectedDestinationSystem, reviztoConnected, reviztoProjects.length])

  const checkConnectionStatus = async () => {
    try {
      if (!session?.user?.id) return
      
      const response = await apiFetch(`/api/credentials?userId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setAccConnected(!!data.acc?.connected)
        setProcoreConnected(!!data.procore?.connected)
        setReviztoConnected(!!data.revizto?.connected)
        
        if (data.procore?.connected) {
          loadProcoreCompanies()
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const getAvailableSystems = () => {
    const systems = []
    if (accConnected) systems.push({ value: 'acc', label: 'Autodesk Construction Cloud' })
    if (procoreConnected) systems.push({ value: 'procore', label: 'Procore' })
    if (reviztoConnected) systems.push({ value: 'revizto', label: 'Revizto' })
    return systems
  }

  const getAvailableDataTypes = (system: string) => {
    const dataTypes = [
      { value: 'issues', label: 'Issues', description: 'Coordination issues and problems' },
      { value: 'rfis', label: 'RFIs', description: 'Request for Information' },
      { value: 'submittals', label: 'Submittals', description: 'Document submittals and approvals' }
    ]
    return dataTypes
  }

  const getFieldsForDataType = (dataType: string) => {
    const fieldMappings = {
      issues: {
        source: [
          { id: 'title', label: 'Title', description: 'Issue title/subject' },
          { id: 'description', label: 'Description', description: 'Detailed issue description' },
          { id: 'status', label: 'Status', description: 'Open, In Progress, Closed, etc.' },
          { id: 'priority', label: 'Priority', description: 'High, Medium, Low' },
          { id: 'assignee', label: 'Assignee', description: 'Person responsible' },
          { id: 'location', label: 'Location', description: 'Building/floor/room' },
          { id: 'due_date', label: 'Due Date', description: 'Target resolution date' },
          { id: 'attachments', label: 'Attachments', description: 'Photos, documents, drawings' }
        ],
        destination: [
          { id: 'title', label: 'Title', description: 'Issue title/subject' },
          { id: 'description', label: 'Description', description: 'Detailed issue description' },
          { id: 'status', label: 'Status', description: 'Open, In Progress, Closed, etc.' },
          { id: 'priority', label: 'Priority', description: 'High, Medium, Low' },
          { id: 'assignee', label: 'Assignee', description: 'Person responsible' },
          { id: 'location', label: 'Location', description: 'Building/floor/room' },
          { id: 'due_date', label: 'Due Date', description: 'Target resolution date' },
          { id: 'attachments', label: 'Attachments', description: 'Photos, documents, drawings' }
        ]
      },
      rfis: {
        source: [
          { id: 'question', label: 'Question', description: 'The RFI question being asked' },
          { id: 'description', label: 'Description', description: 'Additional context and details' },
          { id: 'status', label: 'Status', description: 'Pending, Answered, Closed' },
          { id: 'submitted_by', label: 'Submitted By', description: 'Person who submitted the RFI' },
          { id: 'assigned_to', label: 'Assigned To', description: 'Person responsible for answering' },
          { id: 'due_date', label: 'Due Date', description: 'Response deadline' },
          { id: 'drawing_reference', label: 'Drawing Reference', description: 'Related drawing numbers' },
          { id: 'specification', label: 'Specification', description: 'Related spec sections' }
        ],
        destination: [
          { id: 'question', label: 'Question', description: 'The RFI question being asked' },
          { id: 'description', label: 'Description', description: 'Additional context and details' },
          { id: 'status', label: 'Status', description: 'Pending, Answered, Closed' },
          { id: 'submitted_by', label: 'Submitted By', description: 'Person who submitted the RFI' },
          { id: 'assigned_to', label: 'Assigned To', description: 'Person responsible for answering' },
          { id: 'due_date', label: 'Due Date', description: 'Response deadline' },
          { id: 'drawing_reference', label: 'Drawing Reference', description: 'Related drawing numbers' },
          { id: 'specification', label: 'Specification', description: 'Related spec sections' }
        ]
      },
      submittals: {
        source: [
          { id: 'title', label: 'Title', description: 'Submittal title/name' },
          { id: 'description', label: 'Description', description: 'Submittal description and purpose' },
          { id: 'status', label: 'Status', description: 'Pending, Approved, Rejected, Revise' },
          { id: 'submitted_by', label: 'Submitted By', description: 'Person who submitted' },
          { id: 'reviewer', label: 'Reviewer', description: 'Person reviewing the submittal' },
          { id: 'due_date', label: 'Due Date', description: 'Review deadline' },
          { id: 'specification', label: 'Specification', description: 'Related spec sections' },
          { id: 'attachments', label: 'Attachments', description: 'Documents, drawings, samples' }
        ],
        destination: [
          { id: 'title', label: 'Title', description: 'Submittal title/name' },
          { id: 'description', label: 'Description', description: 'Submittal description and purpose' },
          { id: 'status', label: 'Status', description: 'Pending, Approved, Rejected, Revise' },
          { id: 'submitted_by', label: 'Submitted By', description: 'Person who submitted' },
          { id: 'reviewer', label: 'Reviewer', description: 'Person reviewing the submittal' },
          { id: 'due_date', label: 'Due Date', description: 'Review deadline' },
          { id: 'specification', label: 'Specification', description: 'Related spec sections' },
          { id: 'attachments', label: 'Attachments', description: 'Documents, drawings, samples' }
        ]
      }
    }
    return fieldMappings[dataType as keyof typeof fieldMappings] || { source: [], destination: [] }
  }

  const handleSourceDataTypeChange = (dataType: string, checked: boolean) => {
    if (checked) {
      const newSourceTypes = [...selectedSourceDataTypes, dataType]
      setSelectedSourceDataTypes(newSourceTypes)
      // Auto-select the same data type in destination if not already selected
      if (!selectedDestinationDataTypes.includes(dataType)) {
        setSelectedDestinationDataTypes([...selectedDestinationDataTypes, dataType])
      }
    } else {
      setSelectedSourceDataTypes(selectedSourceDataTypes.filter(type => type !== dataType))
    }
  }

  const handleDestinationDataTypeChange = (dataType: string, checked: boolean) => {
    if (checked) {
      const newDestinationTypes = [...selectedDestinationDataTypes, dataType]
      setSelectedDestinationDataTypes(newDestinationTypes)
      // Auto-select the same data type in source if not already selected
      if (!selectedSourceDataTypes.includes(dataType)) {
        setSelectedSourceDataTypes([...selectedSourceDataTypes, dataType])
      }
    } else {
      setSelectedDestinationDataTypes(selectedDestinationDataTypes.filter(type => type !== dataType))
    }
  }

  const handleFieldMappingsChange = (dataType: string, mappings: Array<{sourceField: string, destinationField: string}>) => {
    setFieldMappings(prev => ({
      ...prev,
      [dataType]: mappings
    }))
  }

  // Validate all field mappings
  const validateAllFieldMappings = async () => {
    const allErrors: any[] = []
    const allWarnings: any[] = []
    
    for (const dataType of selectedSourceDataTypes) {
      const mappings = fieldMappings[dataType] || []
      const sourceFieldsForType = sourceFields[dataType] || []
      const destinationFieldsForType = destinationFields[dataType] || []
      
      if (mappings.length > 0 && sourceFieldsForType.length > 0 && destinationFieldsForType.length > 0) {
        try {
          const { validateFieldMappings } = await import('@/lib/field-type-validation')
          const validation = validateFieldMappings(mappings, sourceFieldsForType, destinationFieldsForType)
          allErrors.push(...validation.errors)
          allWarnings.push(...validation.warnings)
        } catch (error) {
          console.error('Error validating field mappings:', error)
        }
      }
    }
    
    setFieldMappingValidation({
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    })
    
    return allErrors.length === 0
  }

  // Validate field mappings when they change
  useEffect(() => {
    if (selectedSourceDataTypes.length > 0) {
      validateAllFieldMappings()
    }
  }, [fieldMappings, sourceFields, destinationFields, selectedSourceDataTypes])

  const fetchFieldsForSystem = async (system: string, dataTypes: string[]) => {
    if (!system || dataTypes.length === 0) return

    console.log(`Fetching fields for ${system} with data types:`, dataTypes)
    setLoadingFields(true)
    try {
      // For Revizto, pass the selected project ID
      let url = `/api/${system}/fields`
      if (system === 'revizto' && selectedReviztoProject) {
        url += `?projectId=${selectedReviztoProject}`
        console.log(`Fetching Revizto fields for project: ${selectedReviztoProject}`)
      }
      
      const response = await apiFetch(url)
      console.log(`Response for ${system}:`, response.status, response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error fetching fields for ${system}:`, errorText)
        setLoadingFields(false)
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log(`Fields data for ${system}:`, data)
        const fields: Record<string, any[]> = {}
        
        dataTypes.forEach(dataType => {
          fields[dataType] = data.fields[dataType] || []
          console.log(`Fields for ${dataType}:`, fields[dataType])
        })
        
        if (system === selectedSourceSystem) {
          console.log('Setting source fields:', fields)
          setSourceFields(fields)
        } else if (system === selectedDestinationSystem) {
          console.log('Setting destination fields:', fields)
          setDestinationFields(fields)
        }
      } else {
        const errorText = await response.text()
        console.error(`Failed to fetch fields for ${system}:`, response.status, errorText)
      }
    } catch (error) {
      console.error(`Error fetching fields for ${system}:`, error)
    } finally {
      setLoadingFields(false)
    }
  }

  const loadAccProjects = async () => {
    try {
      const response = await apiFetch('/api/acc/projects')
      if (response.ok) {
        const data = await response.json()
        const projects = data.projects || data
        setAccProjects(Array.isArray(projects) ? projects : [])
      } else {
        console.error('Failed to load ACC projects')
        setAccProjects([])
      }
    } catch (error) {
      console.error('Error loading ACC projects:', error)
      setAccProjects([])
    }
  }

  const loadReviztoProjects = async () => {
    try {
      const response = await apiFetch('/api/revizto/projects')
      if (response.ok) {
        const data = await response.json()
        console.log('Revizto projects response:', data)
        const projects = data.projects || data
        console.log('Extracted projects:', projects)
        setReviztoProjects(Array.isArray(projects) ? projects : [])
      } else {
        const data = await response.json()
        console.error('Failed to load Revizto projects:', data.error)
        if (data.code === 'TOKEN_EXPIRED') {
          setMessage('Revizto connection has expired. Please reconnect in Settings.')
        }
        setReviztoProjects([])
      }
    } catch (error) {
      console.error('Error loading Revizto projects:', error)
      setReviztoProjects([])
    }
  }

  const loadProcoreCompanies = async () => {
    try {
      const response = await apiFetch('/api/procore/companies')
      if (response.ok) {
        const data = await response.json()
        const companies = data.companies || data
        setProcoreCompanies(Array.isArray(companies) ? companies : [])
      } else {
        console.error('Failed to load Procore companies')
        setProcoreCompanies([])
      }
    } catch (error) {
      console.error('Error loading Procore companies:', error)
      setProcoreCompanies([])
    }
  }

  const loadProcoreProjects = async (companyId: string) => {
    try {
      console.log('Loading Procore projects for company:', companyId)
      const response = await fetch(`/api/procore/projects?companyId=${companyId}`)
      console.log('Procore projects response:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Procore projects data:', data)
        const projects = data.projects || data
        setProcoreProjects(Array.isArray(projects) ? projects : [])
        console.log('Set Procore projects:', Array.isArray(projects) ? projects : [])
      } else {
        console.error('Failed to load Procore projects')
        setProcoreProjects([])
      }
    } catch (error) {
      console.error('Error loading Procore projects:', error)
      setProcoreProjects([])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!syncName.trim()) {
      setMessage('Please enter a sync name')
      setLoading(false)
      return
    }

    if (!selectedSourceSystem || !selectedDestinationSystem) {
      setMessage('Please select both source and destination systems')
      setLoading(false)
      return
    }

    if (selectedSourceSystem === selectedDestinationSystem) {
      setMessage('Source and destination systems must be different')
      setLoading(false)
      return
    }

    if (selectedSourceDataTypes.length === 0) {
      setMessage('Please select at least one data type to sync from source system')
      setLoading(false)
      return
    }

    if (selectedDestinationDataTypes.length === 0) {
      setMessage('Please select at least one data type to sync to destination system')
      setLoading(false)
      return
    }

    // Get project IDs based on selected systems
    let sourceProjectId = ''
    let sourceProjectName = ''
    let destinationProjectId = ''
    let destinationProjectName = ''
    let destinationCompanyId = ''

    if (selectedSourceSystem === 'acc') {
      if (!selectedAccProject) {
        setMessage('Please select a source project')
        setLoading(false)
        return
      }
      sourceProjectId = selectedAccProject
      sourceProjectName = accProjects.find(p => p.id === selectedAccProject)?.name || ''
    } else if (selectedSourceSystem === 'procore') {
      if (!selectedProcoreProject) {
        setMessage('Please select a source project')
        setLoading(false)
        return
      }
      sourceProjectId = selectedProcoreProject
      sourceProjectName = procoreProjects.find(p => p.id === selectedProcoreProject)?.display_name || ''
    } else if (selectedSourceSystem === 'revizto') {
      if (!selectedReviztoProject) {
        setMessage('Please select a source project')
        setLoading(false)
        return
      }
      sourceProjectId = selectedReviztoProject
      sourceProjectName = reviztoProjects.find(p => p.uuid === selectedReviztoProject)?.title || ''
    }

    if (selectedDestinationSystem === 'procore') {
      if (!selectedProcoreProject) {
        setMessage('Please select a destination project')
        setLoading(false)
        return
      }
      destinationProjectId = selectedProcoreProject
      destinationProjectName = procoreProjects.find(p => p.id === selectedProcoreProject)?.display_name || ''
      destinationCompanyId = selectedProcoreCompany || ''
    } else if (selectedDestinationSystem === 'acc') {
      if (!selectedAccProject) {
        setMessage('Please select a destination project')
        setLoading(false)
        return
      }
      destinationProjectId = selectedAccProject
      destinationProjectName = accProjects.find(p => p.id === selectedAccProject)?.name || ''
    } else if (selectedDestinationSystem === 'revizto') {
      if (!selectedReviztoProject) {
        setMessage('Please select a destination project')
        setLoading(false)
        return
      }
      destinationProjectId = selectedReviztoProject
      destinationProjectName = reviztoProjects.find(p => p.uuid === selectedReviztoProject)?.title || ''
    }

    try {
      const response = await apiFetch('/api/syncs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: syncName,
          description: description || null,
          sourceSystem: selectedSourceSystem,
          sourceProjectId: sourceProjectId,
          sourceProjectName: sourceProjectName,
          sourceDataTypes: selectedSourceDataTypes,
          destinationSystem: selectedDestinationSystem,
          destinationProjectId: destinationProjectId,
          destinationProjectName: destinationProjectName,
          destinationCompanyId: destinationCompanyId,
          destinationDataTypes: selectedDestinationDataTypes,
          fieldMappings: fieldMappings
        }),
      })

      if (response.ok) {
        setMessage('Sync created successfully! Redirecting to home...')
        setTimeout(() => {
          window.location.href = '/home'
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.error || 'Failed to create sync')
      }
    } catch (error) {
      setMessage('Error creating sync')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to create syncs.</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout>
      {message && <Alert type="info" className="mb-6">{message}</Alert>}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Create New Sync</h1>
      </div>


      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Sync Name"
              value={syncName}
              onChange={setSyncName}
              placeholder="e.g., ACC to Procore Issues"
              required
            />
            <Input
              label="Description (Optional)"
              value={description}
              onChange={setDescription}
              placeholder="Brief description of this sync"
            />
          </div>
        </Card>

        {/* Source System */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Source System</h2>
          
          <Select
            label="Select Source System"
            value={selectedSourceSystem}
            onChange={setSelectedSourceSystem}
            options={getAvailableSystems()}
            placeholder="Choose a source system..."
            disabled={getAvailableSystems().length === 0}
            required
          />
          
          {selectedSourceSystem === 'acc' && (
            <div className="mt-4">
              <Select
                label="Select Source Project"
                value={selectedAccProject}
                onChange={setSelectedAccProject}
                options={accProjects?.map(p => ({ value: p.id, label: p.name })) || []}
                placeholder="Choose a source project..."
                disabled={!accConnected}
                required
              />
            </div>
          )}
          
          {selectedSourceSystem === 'procore' && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Select Source Company"
                  value={selectedProcoreCompany}
                  onChange={handleCompanyChange}
                  options={procoreCompanies?.map(c => ({ value: c.id, label: c.name })) || []}
                  placeholder="Choose a company..."
                  disabled={!procoreConnected}
                  required
                />
                
                {selectedProcoreCompany && (
                  <Select
                    label="Select Source Project"
                    value={selectedProcoreProject}
                    onChange={setSelectedProcoreProject}
                    options={procoreProjects?.map(p => ({ value: p.id, label: p.display_name })) || []}
                    placeholder="Choose a project..."
                    disabled={!procoreConnected}
                    required
                  />
                )}
              </div>
            </div>
          )}

          {selectedSourceSystem === 'revizto' && (
            <div className="mt-4">
              <Select
                label="Select Source Project"
                value={selectedReviztoProject}
                onChange={setSelectedReviztoProject}
                options={reviztoProjects?.map(p => ({ value: p.uuid, label: p.title })) || []}
                placeholder="Choose a source project..."
                disabled={!reviztoConnected}
                required
              />
            </div>
          )}
          
          {getAvailableSystems().length === 0 && (
            <p className="text-yellow-300 text-sm mt-2">
              Connect systems in Settings to see available options.
            </p>
          )}
        </Card>

        {/* Destination System */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Destination System</h2>
          
          <Select
            label="Select Destination System"
            value={selectedDestinationSystem}
            onChange={setSelectedDestinationSystem}
            options={getAvailableSystems()}
            placeholder="Choose a destination system..."
            disabled={getAvailableSystems().length === 0}
            required
          />
          
          {selectedDestinationSystem === 'procore' && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Select Destination Company"
                  value={selectedProcoreCompany}
                  onChange={handleCompanyChange}
                  options={procoreCompanies?.map(c => ({ value: c.id, label: c.name })) || []}
                  placeholder="Choose a company..."
                  disabled={!procoreConnected}
                  required
                />
                
                {selectedProcoreCompany && (
                  <Select
                    label="Select Destination Project"
                    value={selectedProcoreProject}
                    onChange={setSelectedProcoreProject}
                    options={procoreProjects?.map(p => ({ value: p.id, label: p.display_name })) || []}
                    placeholder="Choose a project..."
                    disabled={!procoreConnected}
                    required
                  />
                )}
              </div>
            </div>
          )}
          
          {selectedDestinationSystem === 'acc' && (
            <div className="mt-4">
              <Select
                label="Select Destination Project"
                value={selectedAccProject}
                onChange={setSelectedAccProject}
                options={accProjects?.map(p => ({ value: p.id, label: p.name })) || []}
                placeholder="Choose a destination project..."
                disabled={!accConnected}
                required
              />
            </div>
          )}

          {selectedDestinationSystem === 'revizto' && (
            <div className="mt-4">
              <Select
                label="Select Destination Project"
                value={selectedReviztoProject}
                onChange={setSelectedReviztoProject}
                options={reviztoProjects?.map(p => ({ value: p.uuid, label: p.title })) || []}
                placeholder="Choose a destination project..."
                disabled={!reviztoConnected}
                required
              />
            </div>
          )}
          
          {getAvailableSystems().length === 0 && (
            <p className="text-yellow-300 text-sm mt-2">
              Connect systems in Settings to see available options.
            </p>
          )}
        </Card>

        {/* Data Type Selection */}
        {selectedSourceSystem && selectedDestinationSystem && selectedSourceSystem !== selectedDestinationSystem && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Data Type Selection</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Source Data Types */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  What to sync from {selectedSourceSystem === 'acc' ? 'Autodesk Construction Cloud' : selectedSourceSystem === 'procore' ? 'Procore' : 'Revizto'}
                </h3>
                <div className="space-y-3">
                  {getAvailableDataTypes(selectedSourceSystem).map((dataType) => (
                    <label key={dataType.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSourceDataTypes.includes(dataType.value)}
                        onChange={(e) => handleSourceDataTypeChange(dataType.value, e.target.checked)}
                        className="mt-1 h-4 w-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <div>
                        <div className="text-gray-800 font-medium">{dataType.label}</div>
                        <div className="text-gray-400 text-sm">{dataType.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Destination Data Types */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  What to sync to {selectedDestinationSystem === 'acc' ? 'Autodesk Construction Cloud' : selectedDestinationSystem === 'procore' ? 'Procore' : 'Revizto'}
                </h3>
                <div className="space-y-3">
                  {getAvailableDataTypes(selectedDestinationSystem).map((dataType) => (
                    <label key={dataType.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDestinationDataTypes.includes(dataType.value)}
                        onChange={(e) => handleDestinationDataTypeChange(dataType.value, e.target.checked)}
                        className="mt-1 h-4 w-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <div>
                        <div className="text-gray-800 font-medium">{dataType.label}</div>
                        <div className="text-gray-400 text-sm">{dataType.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Field Mapping */}
        {selectedSourceSystem && selectedDestinationSystem && selectedSourceSystem !== selectedDestinationSystem && 
         selectedSourceDataTypes.length > 0 && selectedDestinationDataTypes.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Field Mapping</h2>
            <p className="text-gray-600 mb-6">
              Map fields between your source and destination systems to ensure data syncs correctly.
            </p>
            
            <div className="space-y-6">
              {selectedSourceDataTypes.map((dataType) => {
                const sourceFieldsForType = sourceFields[dataType] || []
                const destinationFieldsForType = destinationFields[dataType] || []
                const currentMappings = fieldMappings[dataType] || []
                
                return (
                  <FieldMapping
                    key={dataType}
                    dataType={dataType}
                    sourceFields={sourceFieldsForType}
                    destinationFields={destinationFieldsForType}
                    mappings={currentMappings}
                    onMappingsChange={(mappings) => handleFieldMappingsChange(dataType, mappings)}
                    loading={loadingFields}
                  />
                )
              })}
            </div>
          </Card>
        )}

        {/* Summary */}
        {selectedSourceSystem && selectedDestinationSystem && selectedSourceSystem !== selectedDestinationSystem && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Sync Summary</h2>
            <div className="bg-white rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Source</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-gray-400">System:</p>
                      <p className="text-gray-800 font-medium">
                        {selectedSourceSystem === 'acc' ? 'Autodesk Construction Cloud' : 
                         selectedSourceSystem === 'procore' ? 'Procore' : 
                         selectedSourceSystem === 'revizto' ? 'Revizto' : 'Not selected'}
                      </p>
                    </div>
                    {selectedSourceSystem === 'procore' && selectedProcoreCompany && (
                      <div>
                        <p className="text-gray-400">Company:</p>
                        <p className="text-gray-800 font-medium">{procoreCompanies?.find(c => c.id === selectedProcoreCompany)?.name || selectedProcoreCompany}</p>
                      </div>
                    )}
                    {selectedSourceSystem === 'procore' && selectedProcoreProject && (
                      <div>
                        <p className="text-gray-400">Project:</p>
                        <p className="text-gray-800 font-medium">{procoreProjects?.find(p => p.id === selectedProcoreProject)?.name || selectedProcoreProject}</p>
                      </div>
                    )}
                    {selectedSourceSystem === 'acc' && selectedAccProject && (
                      <div>
                        <p className="text-gray-400">Project:</p>
                        <p className="text-gray-800 font-medium">{accProjects.find(p => p.id === selectedAccProject)?.name}</p>
                      </div>
                    )}
                    {selectedSourceSystem === 'revizto' && selectedReviztoProject && (
                      <div>
                        <p className="text-gray-400">Project:</p>
                        <p className="text-gray-800 font-medium">{reviztoProjects.find(p => p.uuid === selectedReviztoProject)?.title}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Data Types:</p>
                      <p className="text-gray-800 font-medium">
                        {selectedSourceDataTypes.length > 0 
                          ? selectedSourceDataTypes.map(type => 
                              getAvailableDataTypes(selectedSourceSystem).find(dt => dt.value === type)?.label
                            ).join(', ')
                          : 'None selected'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Destination</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-gray-400">System:</p>
                      <p className="text-gray-800 font-medium">
                        {selectedDestinationSystem === 'acc' ? 'Autodesk Construction Cloud' : 
                         selectedDestinationSystem === 'procore' ? 'Procore' : 
                         selectedDestinationSystem === 'revizto' ? 'Revizto' : 'Not selected'}
                      </p>
                    </div>
                    {selectedDestinationSystem === 'procore' && selectedProcoreCompany && (
                      <div>
                        <p className="text-gray-400">Company:</p>
                        <p className="text-gray-800 font-medium">{procoreCompanies?.find(c => c.id === selectedProcoreCompany)?.name || selectedProcoreCompany}</p>
                      </div>
                    )}
                    {selectedDestinationSystem === 'procore' && selectedProcoreProject && (
                      <div>
                        <p className="text-gray-400">Project:</p>
                        <p className="text-gray-800 font-medium">{procoreProjects?.find(p => p.id === selectedProcoreProject)?.name || selectedProcoreProject}</p>
                      </div>
                    )}
                    {selectedDestinationSystem === 'acc' && selectedAccProject && (
                      <div>
                        <p className="text-gray-400">Project:</p>
                        <p className="text-gray-800 font-medium">{accProjects.find(p => p.id === selectedAccProject)?.name}</p>
                      </div>
                    )}
                    {selectedDestinationSystem === 'revizto' && selectedReviztoProject && (
                      <div>
                        <p className="text-gray-400">Project:</p>
                        <p className="text-gray-800 font-medium">{reviztoProjects.find(p => p.uuid === selectedReviztoProject)?.title}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Data Types:</p>
                      <p className="text-gray-800 font-medium">
                        {selectedDestinationDataTypes.length > 0 
                          ? selectedDestinationDataTypes.map(type => 
                              getAvailableDataTypes(selectedDestinationSystem).find(dt => dt.value === type)?.label
                            ).join(', ')
                          : 'None selected'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400">Sync Name:</p>
                    <p className="text-gray-800 font-medium">{syncName || 'Untitled Sync'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">Status:</p>
                    <p className="text-green-400 font-medium">Ready to configure</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="secondary" href="/home">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={
              !syncName || 
              !selectedSourceSystem || 
              !selectedDestinationSystem || 
              selectedSourceSystem === selectedDestinationSystem ||
              (selectedSourceSystem === 'acc' && !selectedAccProject) ||
              (selectedSourceSystem === 'procore' && (!selectedProcoreCompany || !selectedProcoreProject)) ||
              (selectedSourceSystem === 'revizto' && !selectedReviztoProject) ||
              (selectedDestinationSystem === 'acc' && !selectedAccProject) ||
              (selectedDestinationSystem === 'procore' && (!selectedProcoreCompany || !selectedProcoreProject)) ||
              (selectedDestinationSystem === 'revizto' && !selectedReviztoProject) ||
              selectedSourceDataTypes.length === 0 ||
              selectedDestinationDataTypes.length === 0 ||
              !fieldMappingValidation.valid
            }
          >
            {loading ? 'Creating...' : 'Create Sync'}
          </Button>
        </div>
      </form>
    </PageLayout>
  )
}
