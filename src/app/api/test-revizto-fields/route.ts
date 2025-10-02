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

    // Get user's Revizto credentials
    const credentials = await db.reviztoCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No Revizto credentials found' }, { status: 404 })
    }

    console.log('Testing Revizto fields API...')
    console.log('Credentials found:', !!credentials.accessToken)

    // Create Revizto API client
    const reviztoApi = new ReviztoApi(
      credentials.accessToken,
      'https://api.virginia.revizto.com',
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || undefined,
      credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : undefined
    )

    try {
      // Test getting projects
      console.log('Getting projects...')
      const projects = await reviztoApi.getProjects()
      console.log(`Found ${projects.length} projects`)
      
      if (projects.length === 0) {
        return NextResponse.json({ 
          success: true, 
          message: 'No projects found',
          fields: { issues: [] }
        })
      }

      // Test getting issues from first project
      const sampleProject = projects[0]
      console.log(`Testing with project: ${sampleProject.title}`)
      
      const issues = await reviztoApi.getIssues(sampleProject.uuid)
      console.log(`Found ${issues.length} issues`)
      
      if (issues.length > 0) {
        const sampleIssue = issues[0]
        console.log('Sample issue keys:', Object.keys(sampleIssue))
        console.log('Sample issue:', JSON.stringify(sampleIssue, null, 2))
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Revizto API test successful',
        projects: projects.length,
        issues: issues.length,
        sampleIssue: issues.length > 0 ? Object.keys(issues[0]) : []
      })
    } catch (error) {
      console.error('Error testing Revizto API:', error)
      return NextResponse.json(
        { error: 'Failed to test Revizto API', details: (error as any)?.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in test API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
