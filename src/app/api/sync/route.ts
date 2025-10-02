import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SyncService } from '@/lib/sync-service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectMappingId } = await request.json()

    if (!projectMappingId) {
      return NextResponse.json(
        { error: 'Project mapping ID is required' },
        { status: 400 }
      )
    }

    // Get project mapping with credentials
    const projectMapping = await db.projectMapping.findUnique({
      where: { 
        id: projectMappingId,
        userId: session.user.id 
      },
      include: {
        user: {
          include: {
            accCredentials: true,
            procoreCredentials: true
          }
        }
      }
    })

    if (!projectMapping) {
      return NextResponse.json(
        { error: 'Project mapping not found' },
        { status: 404 }
      )
    }

    // Check if user has valid credentials
    if (!projectMapping.user.accCredentials || !projectMapping.user.procoreCredentials) {
      return NextResponse.json(
        { error: 'Missing ACC or Procore credentials. Please authenticate first.' },
        { status: 400 }
      )
    }

    // Check if credentials are expired
    const now = new Date()
    if (projectMapping.user.accCredentials.expiresAt < now || 
        projectMapping.user.procoreCredentials.expiresAt < now) {
      return NextResponse.json(
        { error: 'Credentials expired. Please re-authenticate.' },
        { status: 400 }
      )
    }

    // Create sync service and run sync
    const syncService = new SyncService(
      projectMapping.user.accCredentials.accessToken,
      projectMapping.user.procoreCredentials.accessToken,
      projectMappingId,
      projectMapping.user.accCredentials.baseUrl,
      projectMapping.user.procoreCredentials.baseUrl,
      projectMapping.user.accCredentials.clientId,
      projectMapping.user.accCredentials.clientSecret,
      projectMapping.user.accCredentials.refreshToken || undefined
    )

    const result = await syncService.syncIssues()

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error running sync:', error)
    return NextResponse.json(
      { error: 'Failed to run sync' },
      { status: 500 }
    )
  }
}
export const dynamic = "force-dynamic"
