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

    const credentials = await db.reviztoCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No Revizto credentials found' }, { status: 404 })
    }

    const reviztoApi = new ReviztoApi(
      credentials.accessToken,
      'https://api.virginia.revizto.com', // Use the correct API base URL
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || undefined,
      credentials.expiresAt ? Number(credentials.expiresAt) : undefined
    )

    try {
      console.log('=== REVIZTO PROJECTS API CALLED ===')
      const projects = await reviztoApi.getProjects()
      console.log('=== REVIZTO PROJECTS API RESULT ===', projects.length, 'projects')
      console.log('=== REVIZTO PROJECTS DATA ===', JSON.stringify(projects, null, 2))
      return NextResponse.json({ success: true, projects })
    } catch (error) {
      console.error('Error fetching Revizto projects:', error)
      console.error('Error details:', (error as any)?.message)
      console.error('Error stack:', (error as any)?.stack)
      
      // Check if it's a token refresh issue
      if ((error as any)?.message?.includes('Failed to refresh access token') && (error as any)?.message?.includes('403')) {
        return NextResponse.json(
          { 
            error: 'Revizto tokens have expired. Please reconnect to Revizto in Settings.',
            code: 'TOKEN_EXPIRED',
            action: 'reconnect'
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch projects from Revizto', details: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in Revizto projects API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
