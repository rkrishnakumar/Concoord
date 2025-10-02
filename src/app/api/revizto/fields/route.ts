import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReviztoApi } from '@/lib/revizto-api'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project ID from query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get user's Revizto credentials
    const credentials = await db.reviztoCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No Revizto credentials found' }, { status: 404 })
    }

    // Create Revizto API client
    const reviztoApi = new ReviztoApi(
      credentials.accessToken,
      'https://api.virginia.revizto.com',
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || undefined,
      credentials.expiresAt ? Number(credentials.expiresAt) : undefined
    )

    try {
      // Use the specific project ID to discover fields
      console.log(`Discovering fields for Revizto project: ${projectId}`)
      
      // Get issues from the specific project to discover field structure
      console.log(`Attempting to fetch issues for project: ${projectId}`)
      const issues = await reviztoApi.getIssues(projectId)
      console.log(`Found ${issues.length} issues for field discovery`)
      console.log('Issues response:', JSON.stringify(issues, null, 2))
      
      // Debug: Check if issues is actually an array
      console.log('Issues type:', typeof issues)
      console.log('Is issues array?', Array.isArray(issues))
      if (issues && issues.length > 0) {
        console.log('First issue keys:', Object.keys(issues[0]))
      }
      
      // Extract field structure from issues
      const discoveredFields = {
        issues: [],
        rfis: [],
        submittals: []
      }
      
      if (issues.length > 0) {
        const sampleIssue = issues[0]
        console.log('Sample issue structure:', JSON.stringify(sampleIssue, null, 2))
        
        // Dynamically discover fields from the actual issue structure
        const issueFields: Array<{name: string, type: string, description: string}> = []
        
        // Extract all fields from the sample issue
        console.log('Processing sample issue fields...')
        const allKeys = Object.keys(sampleIssue)
        console.log(`Total keys in sample issue: ${allKeys.length}`)
        console.log('All keys:', allKeys)
        
        allKeys.forEach(key => {
          console.log(`Processing field: ${key}`)
          
          // Skip system fields that aren't user-facing
          if (['uuid', 'id', 'author', 'binding', 'commented', 'comments', 'unread', 'type', 'customStatusName', 'customTypeName', 'updated', 'version', 'preview', 'openLinks'].includes(key)) {
            console.log(`Skipping system field: ${key}`)
            return
          }
          
          const fieldData = (sampleIssue as any)[key]
          let fieldType = 'string'
          let fieldValue = fieldData
          
          console.log(`Field ${key} data:`, fieldData)
          
          // Handle Revizto's field structure where each field has timestamp and value
          if (fieldData && typeof fieldData === 'object' && fieldData.value !== undefined) {
            fieldValue = fieldData.value
            console.log(`Field ${key} value:`, fieldValue)
          }
          
          // Determine field type based on the actual value
          if (typeof fieldValue === 'boolean') fieldType = 'boolean'
          else if (typeof fieldValue === 'number') fieldType = 'number'
          else if (fieldValue instanceof Date || (typeof fieldValue === 'string' && !isNaN(Date.parse(fieldValue)))) fieldType = 'datetime'
          else if (Array.isArray(fieldValue)) fieldType = 'array'
          else if (typeof fieldValue === 'object' && fieldValue !== null) fieldType = 'object'
          
          // Create a more user-friendly label
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
          
          const field = { 
            name: key, 
            type: fieldType, 
            description: `Revizto field: ${key}` 
          }
          
          console.log(`Adding field:`, field)
          issueFields.push(field)
        })
        
        discoveredFields.issues = issueFields
        console.log(`Discovered ${issueFields.length} fields for Revizto issues`)
        console.log('Discovered fields:', issueFields.map(f => `${f.name} (${f.type})`))
      } else {
        console.log('No issues found in Revizto project - cannot discover fields')
        discoveredFields.issues = []
      }
      
      return NextResponse.json({ 
        success: true, 
        fields: discoveredFields
      })
    } catch (error) {
      console.error('Error fetching Revizto fields:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fields from Revizto' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in Revizto fields API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
