'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { getFieldCompatibility, validateFieldMappings } from '@/lib/field-type-validation'

interface Field {
  id: string
  label: string
  description: string
  type: string
}

interface FieldMapping {
  sourceField: string
  destinationField: string
}

interface FieldMappingProps {
  dataType: string
  sourceFields: Field[]
  destinationFields: Field[]
  mappings: FieldMapping[]
  onMappingsChange: (mappings: FieldMapping[]) => void
  loading?: boolean
}

export default function FieldMapping({ 
  dataType, 
  sourceFields, 
  destinationFields, 
  mappings, 
  onMappingsChange,
  loading = false 
}: FieldMappingProps) {
  console.log(`FieldMapping for ${dataType}:`, {
    sourceFields: sourceFields.length,
    destinationFields: destinationFields.length,
    loading
  })
  const [newMapping, setNewMapping] = useState<FieldMapping>({
    sourceField: '',
    destinationField: ''
  })
  const [validation, setValidation] = useState<{
    valid: boolean
    errors: any[]
    warnings: any[]
  }>({ valid: true, errors: [], warnings: [] })
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [loadingAi, setLoadingAi] = useState(false)

  // Validate mappings whenever they change
  useEffect(() => {
    if (mappings.length > 0 && sourceFields.length > 0 && destinationFields.length > 0) {
      const validationResult = validateFieldMappings(mappings, sourceFields, destinationFields)
      setValidation(validationResult)
    }
  }, [mappings, sourceFields, destinationFields])

  const addMapping = () => {
    if (newMapping.sourceField && newMapping.destinationField) {
      // Check if this mapping already exists
      const exists = mappings.some(m => 
        m.sourceField === newMapping.sourceField && 
        m.destinationField === newMapping.destinationField
      )
      
      if (!exists) {
        onMappingsChange([...mappings, newMapping])
        setNewMapping({ sourceField: '', destinationField: '' })
      }
    }
  }

  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index)
    onMappingsChange(newMappings)
  }

  const getFieldLabel = (fieldId: string, fields: Field[]) => {
    const field = fields.find(f => f.id === fieldId)
    return field ? `${field.label} (${field.type})` : fieldId
  }

  // Get compatibility status for current mapping
  const getCurrentMappingCompatibility = () => {
    if (!newMapping.sourceField || !newMapping.destinationField) {
      return null
    }
    
    const sourceField = sourceFields.find(f => f.id === newMapping.sourceField)
    const destinationField = destinationFields.find(f => f.id === newMapping.destinationField)
    
    if (!sourceField || !destinationField) {
      return null
    }
    
    return getFieldCompatibility(sourceField, destinationField)
  }

  const generateAiSuggestions = async () => {
    if (sourceFields.length === 0 || destinationFields.length === 0) {
      return
    }

    setLoadingAi(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}api/ai/suggest-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFields,
          destinationFields,
          dataType
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiSuggestions(data.suggestions || [])
        console.log('AI suggestions:', data.suggestions)
      } else {
        console.error('Failed to get AI suggestions:', await response.text())
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error)
    } finally {
      setLoadingAi(false)
    }
  }

  const applyAiSuggestion = (suggestion: any) => {
    const newMappings = [...mappings, {
      sourceField: suggestion.sourceField,
      destinationField: suggestion.destinationField
    }]
    onMappingsChange(newMappings)
    
    // Remove the applied suggestion
    setAiSuggestions(prev => prev.filter(s => s !== suggestion))
  }

  const currentCompatibility = getCurrentMappingCompatibility()

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        <p className="text-gray-600 mt-2">Loading fields from systems...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {dataType.charAt(0).toUpperCase() + dataType.slice(1)} Field Mapping
      </h3>
      
      {/* AI Suggestions */}
      {sourceFields.length > 0 && destinationFields.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-800">🤖 AI-Powered Field Mapping</h4>
            <button
              onClick={generateAiSuggestions}
              disabled={loadingAi}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingAi ? 'Generating...' : 'Get AI Suggestions'}
            </button>
          </div>
          
          {aiSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-blue-600 mb-2">AI found {aiSuggestions.length} intelligent field mappings:</p>
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-800">
                      {getFieldLabel(suggestion.sourceField, sourceFields)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm font-medium text-gray-800">
                      {getFieldLabel(suggestion.destinationField, destinationFields)}
                    </span>
                    <span className="text-xs text-blue-600">
                      ({Math.round(suggestion.confidence * 100)}% confidence)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 max-w-xs truncate">
                      {suggestion.reasoning}
                    </span>
                    <button
                      onClick={() => applyAiSuggestion(suggestion)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add New Mapping */}
      <div className="mb-6 p-4 bg-gray-600 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-3">Add Field Mapping</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source Field</label>
            <Select
              value={newMapping.sourceField}
              onChange={(value) => setNewMapping(prev => ({ ...prev, sourceField: value }))}
              options={sourceFields.map(field => ({ value: field.id, label: `${field.label} (${field.type})` }))}
              placeholder={sourceFields.length === 0 ? "No source fields available" : "Select source field"}
            />
          </div>
          <div className="flex items-center justify-center">
            <span className="text-gray-400 text-sm">→</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Destination Field</label>
            <Select
              value={newMapping.destinationField}
              onChange={(value) => setNewMapping(prev => ({ ...prev, destinationField: value }))}
              options={destinationFields.map(field => ({ value: field.id, label: `${field.label} (${field.type})` }))}
              placeholder="Select destination field"
            />
          </div>
        </div>
        {/* Type Compatibility Indicator */}
        {currentCompatibility && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            currentCompatibility.compatible 
              ? currentCompatibility.level === 'perfect' 
                ? 'bg-green-900 text-green-200 border border-green-700'
                : 'bg-yellow-900 text-yellow-200 border border-yellow-700'
              : 'bg-red-900 text-red-200 border border-red-700'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="font-medium">
                {currentCompatibility.compatible ? '✓' : '⚠️'}
              </span>
              <span>{currentCompatibility.message}</span>
            </div>
            {currentCompatibility.suggestions && currentCompatibility.suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1">Suggestions:</p>
                <ul className="text-xs space-y-1">
                  {currentCompatibility.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span>•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          onClick={addMapping}
          disabled={!newMapping.sourceField || !newMapping.destinationField || (currentCompatibility && !currentCompatibility.compatible) || false}
          className="mt-3 px-4 py-2 bg-orange-600 text-gray-800 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Mapping
        </button>
      </div>

      {/* Validation Status */}
      {validation.errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-900 text-red-200 border border-red-700 rounded-md">
          <h4 className="font-medium mb-2">⚠️ Mapping Errors ({validation.errors.length})</h4>
          <div className="space-y-2">
            {validation.errors.map((error, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">
                  {getFieldLabel(error.mapping.sourceField, sourceFields)} → {getFieldLabel(error.mapping.destinationField, destinationFields)}
                </span>
                <p className="text-red-300">{error.error}</p>
                {error.suggestions && error.suggestions.length > 0 && (
                  <ul className="mt-1 text-xs text-red-300">
                    {error.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>• {suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-900 text-yellow-200 border border-yellow-700 rounded-md">
          <h4 className="font-medium mb-2">⚠️ Mapping Warnings ({validation.warnings.length})</h4>
          <div className="space-y-1">
            {validation.warnings.map((warning, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">
                  {getFieldLabel(warning.mapping.sourceField, sourceFields)} → {getFieldLabel(warning.mapping.destinationField, destinationFields)}
                </span>
                <p className="text-yellow-300">{warning.warning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Mappings */}
      <div>
        <h4 className="text-sm font-medium text-gray-800 mb-3">
          Field Mappings ({mappings.length})
          {validation.valid && mappings.length > 0 && (
            <span className="ml-2 text-green-400 text-xs">✓ All mappings valid</span>
          )}
        </h4>
        
        {mappings.length === 0 ? (
          <p className="text-gray-400 text-sm">No field mappings configured yet</p>
        ) : (
          <div className="space-y-2">
            {mappings.map((mapping, index) => {
              const sourceField = sourceFields.find(f => f.id === mapping.sourceField)
              const destinationField = destinationFields.find(f => f.id === mapping.destinationField)
              const compatibility = sourceField && destinationField ? getFieldCompatibility(sourceField, destinationField) : null
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-800 font-medium">
                      {getFieldLabel(mapping.sourceField, sourceFields)}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-sm text-gray-800 font-medium">
                      {getFieldLabel(mapping.destinationField, destinationFields)}
                    </span>
                    {compatibility && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        compatibility.compatible 
                          ? compatibility.level === 'perfect' 
                            ? 'bg-green-800 text-green-200'
                            : 'bg-yellow-800 text-yellow-200'
                          : 'bg-red-800 text-red-200'
                      }`}>
                        {compatibility.level === 'perfect' ? '✓' : compatibility.compatible ? '⚠️' : '✗'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeMapping(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
