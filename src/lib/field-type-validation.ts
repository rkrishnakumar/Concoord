// Field type compatibility validation for cross-system field mapping

export interface FieldType {
  id: string
  label: string
  description: string
  type: string
}

// Define type compatibility matrix
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  // String types
  'string': ['string', 'text', 'email', 'url'],
  'text': ['string', 'text', 'longtext'],
  'email': ['string', 'email'],
  'url': ['string', 'url'],
  
  // Numeric types
  'number': ['number', 'integer', 'float', 'decimal'],
  'integer': ['number', 'integer'],
  'float': ['number', 'float', 'decimal'],
  'decimal': ['number', 'decimal'],
  
  // Date/Time types
  'date': ['date', 'datetime', 'timestamp'],
  'datetime': ['date', 'datetime', 'timestamp'],
  'timestamp': ['datetime', 'timestamp'],
  
  // Boolean types
  'boolean': ['boolean', 'checkbox', 'toggle'],
  'checkbox': ['boolean', 'checkbox'],
  'toggle': ['boolean', 'toggle'],
  
  // Select/Choice types
  'select': ['select', 'dropdown', 'choice', 'enum'],
  'dropdown': ['select', 'dropdown'],
  'choice': ['select', 'choice'],
  'enum': ['select', 'enum'],
  
  // User/Reference types
  'user': ['user', 'assignee', 'owner', 'reference'],
  'assignee': ['user', 'assignee'],
  'owner': ['user', 'owner'],
  'reference': ['user', 'reference'],
  
  // List/Array types
  'array': ['array', 'list', 'collection'],
  'list': ['array', 'list'],
  'collection': ['array', 'collection'],
  'user_list': ['user_list', 'watchers', 'assignees'],
  'watchers': ['user_list', 'watchers'],
  'assignees': ['user_list', 'assignees'],
  'string_list': ['string_list', 'tags', 'labels'],
  'tags': ['string_list', 'tags'],
  'labels': ['string_list', 'labels'],
  'file_list': ['file_list', 'attachments', 'documents'],
  'attachments': ['file_list', 'attachments'],
  'documents': ['file_list', 'documents'],
  
  // Object types
  'object': ['object', 'json', 'custom'],
  'json': ['object', 'json'],
  'custom': ['object', 'custom']
}

// Check if two field types are compatible
export function areTypesCompatible(sourceType: string, destinationType: string): boolean {
  // Direct match
  if (sourceType === destinationType) {
    return true
  }
  
  // Check compatibility matrix
  const compatibleTypes = TYPE_COMPATIBILITY[sourceType.toLowerCase()]
  if (compatibleTypes && compatibleTypes.includes(destinationType.toLowerCase())) {
    return true
  }
  
  // Check reverse compatibility
  const reverseCompatibleTypes = TYPE_COMPATIBILITY[destinationType.toLowerCase()]
  if (reverseCompatibleTypes && reverseCompatibleTypes.includes(sourceType.toLowerCase())) {
    return true
  }
  
  return false
}

// Get compatibility level and warnings for field mapping
export function getFieldCompatibility(
  sourceField: FieldType, 
  destinationField: FieldType
): {
  compatible: boolean
  level: 'perfect' | 'good' | 'warning' | 'error'
  message: string
  suggestions?: string[]
} {
  const sourceType = sourceField.type.toLowerCase()
  const destinationType = destinationField.type.toLowerCase()
  
  // Perfect match
  if (sourceType === destinationType) {
    return {
      compatible: true,
      level: 'perfect',
      message: 'Perfect type match'
    }
  }
  
  // Check compatibility
  if (areTypesCompatible(sourceType, destinationType)) {
    return {
      compatible: true,
      level: 'good',
      message: 'Compatible types - data will be mapped successfully'
    }
  }
  
  // Get suggestions for incompatible types
  const suggestions = getTypeConversionSuggestions(sourceType, destinationType)
  
  return {
    compatible: false,
    level: 'error',
    message: `Incompatible types: ${sourceType} → ${destinationType}`,
    suggestions
  }
}

// Get suggestions for type conversion
function getTypeConversionSuggestions(sourceType: string, destinationType: string): string[] {
  const suggestions: string[] = []
  
  // String to other types
  if (sourceType === 'string' || sourceType === 'text') {
    if (destinationType === 'number' || destinationType === 'integer') {
      suggestions.push('Consider extracting numeric values from the string')
    }
    if (destinationType === 'date' || destinationType === 'datetime') {
      suggestions.push('Parse the string as a date if it contains date information')
    }
    if (destinationType === 'boolean') {
      suggestions.push('Convert string to boolean (e.g., "true"/"false", "yes"/"no")')
    }
  }
  
  // Number to other types
  if (sourceType === 'number' || sourceType === 'integer') {
    if (destinationType === 'string' || destinationType === 'text') {
      suggestions.push('Convert number to string representation')
    }
    if (destinationType === 'boolean') {
      suggestions.push('Convert number to boolean (0 = false, non-zero = true)')
    }
  }
  
  // Date to other types
  if (sourceType === 'date' || sourceType === 'datetime') {
    if (destinationType === 'string' || destinationType === 'text') {
      suggestions.push('Format date as string (ISO format recommended)')
    }
    if (destinationType === 'number') {
      suggestions.push('Convert date to timestamp (Unix epoch)')
    }
  }
  
  // Boolean to other types
  if (sourceType === 'boolean') {
    if (destinationType === 'string' || destinationType === 'text') {
      suggestions.push('Convert boolean to string ("true"/"false")')
    }
    if (destinationType === 'number') {
      suggestions.push('Convert boolean to number (1/0)')
    }
  }
  
  // List to other types
  if (sourceType.includes('list') || sourceType.includes('array')) {
    if (destinationType === 'string' || destinationType === 'text') {
      suggestions.push('Join array elements with separator (e.g., comma-separated)')
    }
    if (destinationType === 'user') {
      suggestions.push('Take first element from user list as primary user')
    }
  }
  
  // Single value to list
  if (!sourceType.includes('list') && !sourceType.includes('array')) {
    if (destinationType.includes('list') || destinationType.includes('array')) {
      suggestions.push('Wrap single value in array')
    }
  }
  
  return suggestions
}

// Validate all field mappings for a sync
export function validateFieldMappings(
  mappings: Array<{sourceField: string, destinationField: string}>,
  sourceFields: FieldType[],
  destinationFields: FieldType[]
): {
  valid: boolean
  errors: Array<{
    mapping: {sourceField: string, destinationField: string}
    error: string
    suggestions?: string[]
  }>
  warnings: Array<{
    mapping: {sourceField: string, destinationField: string}
    warning: string
  }>
} {
  const errors: Array<{
    mapping: {sourceField: string, destinationField: string}
    error: string
    suggestions?: string[]
  }> = []
  
  const warnings: Array<{
    mapping: {sourceField: string, destinationField: string}
    warning: string
  }> = []
  
  mappings.forEach(mapping => {
    const sourceField = sourceFields.find(f => f.id === mapping.sourceField)
    const destinationField = destinationFields.find(f => f.id === mapping.destinationField)
    
    if (!sourceField) {
      errors.push({
        mapping,
        error: `Source field '${mapping.sourceField}' not found`
      })
      return
    }
    
    if (!destinationField) {
      errors.push({
        mapping,
        error: `Destination field '${mapping.destinationField}' not found`
      })
      return
    }
    
    const compatibility = getFieldCompatibility(sourceField, destinationField)
    
    if (!compatibility.compatible) {
      // Treat type incompatibilities as warnings instead of errors
      warnings.push({
        mapping,
        warning: `${compatibility.message} ${compatibility.suggestions ? `(${compatibility.suggestions.join(', ')})` : ''}`
      })
    } else if (compatibility.level === 'warning') {
      warnings.push({
        mapping,
        warning: compatibility.message
      })
    }
  })
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
