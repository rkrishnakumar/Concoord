import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AutodeskAccApi } from '@/lib/autodesk-acc'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's ACC credentials
    const credentials = await db.accCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No ACC credentials found' }, { status: 404 })
    }

    // Create ACC API client
    const accApi = new AutodeskAccApi(
      credentials.accessToken, 
      credentials.baseUrl
    )

    try {
      // Get projects to find a sample project for field discovery
      const projects = await accApi.getProjects()
      if (projects.length === 0) {
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
      }

      // For now, return standard ACC fields
      // TODO: Implement actual field discovery from ACC API
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
      console.error('Error fetching ACC fields:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fields from ACC' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in ACC fields API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
