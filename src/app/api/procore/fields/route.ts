import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProcoreApi } from '@/lib/procore-api'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Procore credentials
    const credentials = await db.procoreCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No Procore credentials found' }, { status: 404 })
    }

    // Create Procore API client
    const procoreApi = new ProcoreApi(
      credentials.accessToken, 
      credentials.baseUrl,
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || undefined
    )

    try {
      // For now, return standard Procore fields
      // TODO: Implement actual field discovery from Procore API
      return NextResponse.json({ 
        success: true, 
        fields: {
          issues: [
            { id: 'title', label: 'Title', description: 'Issue title/subject', type: 'string' },
            { id: 'description', label: 'Description', description: 'Detailed issue description', type: 'text' },
            { id: 'status', label: 'Status', description: 'Open, In Progress, Closed, etc.', type: 'select' },
            { id: 'priority', label: 'Priority', description: 'High, Medium, Low', type: 'select' },
            { id: 'assignee', label: 'Assignee', description: 'Person responsible', type: 'user' },
            { id: 'location', label: 'Location', description: 'Building/floor/room', type: 'string' },
            { id: 'due_date', label: 'Due Date', description: 'Target resolution date', type: 'date' },
            { id: 'attachments', label: 'Attachments', description: 'Photos, documents, drawings', type: 'file' }
          ],
          rfis: [
            { id: 'title', label: 'Title', description: 'RFI title/subject', type: 'string' },
            { id: 'description', label: 'Description', description: 'Detailed RFI description', type: 'text' },
            { id: 'status', label: 'Status', description: 'Open, In Progress, Closed, etc.', type: 'select' },
            { id: 'priority', label: 'Priority', description: 'High, Medium, Low', type: 'select' },
            { id: 'assignee', label: 'Assignee', description: 'Person responsible', type: 'user' },
            { id: 'due_date', label: 'Due Date', description: 'Target resolution date', type: 'date' }
          ],
          submittals: [
            { id: 'title', label: 'Title', description: 'Submittal title/subject', type: 'string' },
            { id: 'description', label: 'Description', description: 'Detailed submittal description', type: 'text' },
            { id: 'status', label: 'Status', description: 'Open, In Progress, Closed, etc.', type: 'select' },
            { id: 'priority', label: 'Priority', description: 'High, Medium, Low', type: 'select' },
            { id: 'assignee', label: 'Assignee', description: 'Person responsible', type: 'user' },
            { id: 'due_date', label: 'Due Date', description: 'Target resolution date', type: 'date' }
          ]
        }
      })
    } catch (error) {
      console.error('Error fetching Procore fields:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fields from Procore' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in Procore fields API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
