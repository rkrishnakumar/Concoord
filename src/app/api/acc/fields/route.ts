import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Temporarily return mock data until Railway backend is fully implemented
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
