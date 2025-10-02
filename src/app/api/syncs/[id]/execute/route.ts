import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ReviztoApi } from '@/lib/revizto-api'
import { ProcoreApi } from '@/lib/procore-api'
import { AutodeskAccApi } from '@/lib/autodesk-acc'

// Field mapping function to transform data between systems
function mapIssueFields(
  sourceIssue: any, 
  sourceFields: string[], 
  destinationFields: string[], 
  sourceSystem: string, 
  destinationSystem: string
) {
  const mappedData: any = {}
  
  // Map common fields
  if (sourceFields.includes('title') && destinationFields.includes('title')) {
    mappedData.title = sourceIssue.title || sourceIssue.name || 'Untitled Issue'
  }
  
  if (sourceFields.includes('description') && destinationFields.includes('description')) {
    mappedData.description = sourceIssue.description || ''
  }
  
  if (sourceFields.includes('status') && destinationFields.includes('status')) {
    mappedData.status = sourceIssue.status || 'open'
  }
  
  if (sourceFields.includes('assignee') && destinationFields.includes('assignee')) {
    mappedData.assignee_id = sourceIssue.assignee?.id || sourceIssue.assignee_id
  }
  
  // System-specific field mappings
  if (sourceSystem === 'revizto' && destinationSystem === 'procore') {
    // Map Revizto fields to Procore fields
    if (sourceFields.includes('priority') && destinationFields.includes('priority')) {
      mappedData.priority = sourceIssue.priority || 'Medium'
    }
    if (sourceFields.includes('due_date') && destinationFields.includes('due_date')) {
      mappedData.due_date = sourceIssue.due_date
    }
  } else if (sourceSystem === 'procore' && destinationSystem === 'revizto') {
    // Map Procore fields to Revizto fields
    if (sourceFields.includes('priority') && destinationFields.includes('priority')) {
      mappedData.priority = sourceIssue.priority || 'Medium'
    }
    if (sourceFields.includes('due_date') && destinationFields.includes('due_date')) {
      mappedData.due_date = sourceIssue.due_date
    }
  } else if (sourceSystem === 'acc' && destinationSystem === 'procore') {
    // Map ACC fields to Procore fields
    if (sourceFields.includes('priority') && destinationFields.includes('priority')) {
      mappedData.priority = sourceIssue.priority || 'Medium'
    }
    if (sourceFields.includes('due_date') && destinationFields.includes('due_date')) {
      mappedData.due_date = sourceIssue.due_date
    }
  }
  
  return mappedData
}

// New field mapping function that uses the field-to-field mapping structure
function mapIssueFieldsWithMappings(
  sourceIssue: any, 
  fieldMappings: Array<{sourceField: string, destinationField: string}>, 
  sourceSystem: string, 
  destinationSystem: string
) {
  const mappedData: any = {}
  
  // Apply each field mapping
  fieldMappings.forEach(mapping => {
    const sourceValue = getNestedValue(sourceIssue, mapping.sourceField)
    if (sourceValue !== undefined && sourceValue !== null) {
      mappedData[mapping.destinationField] = sourceValue
    }
  })
  
  // Ensure required fields are present
  if (!mappedData.title && sourceIssue.title) {
    mappedData.title = sourceIssue.title
  }
  if (!mappedData.description && sourceIssue.description) {
    mappedData.description = sourceIssue.description || ''
  }
  if (!mappedData.status && sourceIssue.status) {
    mappedData.status = sourceIssue.status
  }
  
  return mappedData
}

// Helper function to get nested values from objects
function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: syncId } = await params

    // Get the sync configuration
    const sync = await db.sync.findUnique({
      where: {
        id: syncId,
        userId: session.user.id
      }
    })

    if (!sync) {
      return NextResponse.json({ error: 'Sync not found' }, { status: 404 })
    }

    // Get user credentials for both systems
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        accCredentials: true,
        procoreCredentials: true,
        reviztoCredentials: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`Executing sync: ${sync.name}`)
    console.log(`Source: ${sync.sourceSystem} -> Destination: ${sync.destinationSystem}`)
    console.log(`Data types: ${JSON.stringify(sync.sourceDataTypes)} -> ${JSON.stringify(sync.destinationDataTypes)}`)

    let sourceApi: any = null
    let destinationApi: any = null

    // Initialize source API
    if (sync.sourceSystem === 'revizto') {
      if (!user.reviztoCredentials) {
        return NextResponse.json({ error: 'Revizto credentials not found' }, { status: 400 })
      }
      sourceApi = new ReviztoApi(
        user.reviztoCredentials.accessToken,
        'https://api.virginia.revizto.com',
        user.reviztoCredentials.clientId,
        user.reviztoCredentials.clientSecret,
        user.reviztoCredentials.refreshToken || undefined,
        user.reviztoCredentials.expiresAt ? new Date(user.reviztoCredentials.expiresAt).getTime() : undefined
      )
    } else if (sync.sourceSystem === 'procore') {
      if (!user.procoreCredentials) {
        return NextResponse.json({ error: 'Procore credentials not found' }, { status: 400 })
      }
      sourceApi = new ProcoreApi(
        user.procoreCredentials.accessToken,
        user.procoreCredentials.baseUrl,
        user.procoreCredentials.clientId,
        user.procoreCredentials.clientSecret,
        user.procoreCredentials.refreshToken || undefined
      )
    } else if (sync.sourceSystem === 'acc') {
      if (!user.accCredentials) {
        return NextResponse.json({ error: 'ACC credentials not found' }, { status: 400 })
      }
      sourceApi = new AutodeskAccApi(
        user.accCredentials.accessToken,
        user.accCredentials.baseUrl
      )
    }

    // Initialize destination API
    if (sync.destinationSystem === 'revizto') {
      if (!user.reviztoCredentials) {
        return NextResponse.json({ error: 'Revizto credentials not found' }, { status: 400 })
      }
      destinationApi = new ReviztoApi(
        user.reviztoCredentials.accessToken,
        'https://api.virginia.revizto.com',
        user.reviztoCredentials.clientId,
        user.reviztoCredentials.clientSecret,
        user.reviztoCredentials.refreshToken || undefined,
        user.reviztoCredentials.expiresAt ? new Date(user.reviztoCredentials.expiresAt).getTime() : undefined
      )
    } else if (sync.destinationSystem === 'procore') {
      if (!user.procoreCredentials) {
        return NextResponse.json({ error: 'Procore credentials not found' }, { status: 400 })
      }
      destinationApi = new ProcoreApi(
        user.procoreCredentials.accessToken,
        user.procoreCredentials.baseUrl,
        user.procoreCredentials.clientId,
        user.procoreCredentials.clientSecret,
        user.procoreCredentials.refreshToken || undefined,
        sync.destinationCompanyId || undefined
      )
    } else if (sync.destinationSystem === 'acc') {
      if (!user.accCredentials) {
        return NextResponse.json({ error: 'ACC credentials not found' }, { status: 400 })
      }
      destinationApi = new AutodeskAccApi(
        user.accCredentials.accessToken,
        user.accCredentials.baseUrl
      )
    }

    // Execute the sync based on data types
    const results = {
      issues: { created: 0, updated: 0, errors: [] as Array<{issue?: string, error: string}> },
      rfis: { created: 0, updated: 0, errors: [] as Array<{issue?: string, error: string}> },
      submittals: { created: 0, updated: 0, errors: [] as Array<{issue?: string, error: string}> }
    }

    // Sync Issues
    const sourceDataTypes = sync.sourceDataTypes as string[] | undefined
    const destinationDataTypes = sync.destinationDataTypes as string[] | undefined
    if (sourceDataTypes?.includes('issues') && destinationDataTypes?.includes('issues')) {
      console.log('Syncing Issues...')
      try {
        // Get issues from source
        let sourceIssues = []
        if (sync.sourceSystem === 'revizto') {
          sourceIssues = await sourceApi.getIssues(sync.sourceProjectId)
        } else if (sync.sourceSystem === 'procore') {
          sourceIssues = await sourceApi.getCoordinationIssues(sync.sourceProjectId)
        } else if (sync.sourceSystem === 'acc') {
          sourceIssues = await sourceApi.getProjectIssues(sync.sourceProjectId)
        }

        console.log(`Found ${sourceIssues.length} issues in source system`)

        // Create issues in destination with field mapping
        for (const issue of sourceIssues) {
          try {
            // Get field mappings for issues
            const fieldMappings = (sync.fieldMappings as any)?.issues || []
            
            // Map source fields to destination fields using the new mapping structure
            const mappedIssueData = mapIssueFieldsWithMappings(issue, fieldMappings, sync.sourceSystem, sync.destinationSystem)
            
            if (sync.destinationSystem === 'revizto') {
              // Create issue in Revizto
              const newIssue = await destinationApi.createIssue(sync.destinationProjectId, mappedIssueData)
              results.issues.created++
              console.log(`Created issue in Revizto: ${newIssue.id}`)
            } else if (sync.destinationSystem === 'procore') {
              // Create issue in Procore
              const newIssue = await destinationApi.createCoordinationIssue(sync.destinationProjectId, {
                ...mappedIssueData,
                project_id: sync.destinationProjectId
              })
              results.issues.created++
              console.log(`Created issue in Procore: ${newIssue.id}`)
            } else if (sync.destinationSystem === 'acc') {
              // Create issue in ACC
              const newIssue = await destinationApi.createIssue(sync.destinationProjectId, mappedIssueData)
              results.issues.created++
              console.log(`Created issue in ACC: ${newIssue.id}`)
            }
          } catch (error) {
            console.error(`Error creating issue: ${(error as any)?.message}`)
            results.issues.errors.push({
              issue: issue.title || issue.name,
              error: (error as any)?.message
            })
          }
        }
      } catch (error) {
        console.error('Error syncing issues:', error)
        results.issues.errors.push({
          error: `Failed to sync issues: ${(error as any)?.message}`
        })
      }
    }

    // Update sync status
    await db.sync.update({
      where: { id: syncId },
      data: {
        status: 'active',
        lastRunAt: new Date(),
        lastRunStatus: 'success'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sync executed successfully',
      results
    })

  } catch (error) {
    console.error('Error executing sync:', error)
    
    // Update sync status to error
    try {
      await db.sync.update({
        where: { id: (await params).id },
        data: {
          status: 'error',
          lastRunAt: new Date(),
          lastRunStatus: 'error'
        }
      })
    } catch (updateError) {
      console.error('Error updating sync status:', updateError)
    }

    return NextResponse.json(
      { error: 'Failed to execute sync' },
      { status: 500 }
    )
  }
}
export const dynamic = "force-dynamic"
