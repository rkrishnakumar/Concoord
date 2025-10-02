import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AutodeskAccApi } from '@/lib/autodesk-acc'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
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
      credentials.baseUrl,
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || undefined
    )

    try {
      console.log(`Fetching issues for ACC project: ${projectId}`)
      const issues = await accApi.getProjectIssues(projectId)
      console.log(`Found ${issues.length} issues for project ${projectId}`)
      
      return NextResponse.json({ 
        success: true, 
        issues 
      })
    } catch (error) {
      console.error('Error fetching ACC issues:', error)
      return NextResponse.json(
        { error: 'Failed to fetch issues from ACC' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in ACC issues API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
export const dynamic = "force-dynamic"
