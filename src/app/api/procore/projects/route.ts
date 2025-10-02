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

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get user's Procore credentials
    const credentials = await db.procoreCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No Procore credentials found' }, { status: 404 })
    }

    // Create Procore API client
    const procoreApi = new ProcoreApi(credentials.accessToken, credentials.baseUrl)

    try {
      console.log(`Fetching projects for company ID: ${companyId}`)
      // Get projects for the specified company
      const projects = await procoreApi.getProjects(companyId)
      console.log(`Found ${projects.length} projects for company ${companyId}`)
      
      return NextResponse.json({ 
        success: true, 
        projects 
      })
    } catch (error) {
      console.error('Error fetching Procore projects:', error)
      console.error('Error details:', (error as any)?.response?.data)
      return NextResponse.json(
        { error: 'Failed to fetch projects from Procore' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in projects API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
