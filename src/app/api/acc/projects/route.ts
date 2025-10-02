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
      // Get projects
      const projects = await accApi.getProjects()
      
      return NextResponse.json({ 
        success: true, 
        projects 
      })
    } catch (error) {
      console.error('Error fetching ACC projects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects from ACC' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in ACC projects API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
export const dynamic = "force-dynamic"
