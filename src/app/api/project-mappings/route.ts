import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AutodeskAccApi } from '@/lib/autodesk-acc'
import { ProcoreApi } from '@/lib/procore-api'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectMappings = await db.projectMapping.findMany({
      where: { userId: session.user.id },
      include: {
        issueCrosswalks: true,
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      }
    })

    return NextResponse.json({ projectMappings })
  } catch (error) {
    console.error('Error fetching project mappings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project mappings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accProjectId, accProjectName, procoreProjectId, procoreProjectName } = await request.json()

    if (!accProjectId || !procoreProjectId) {
      return NextResponse.json(
        { error: 'ACC Project ID and Procore Project ID are required' },
        { status: 400 }
      )
    }

    // Check if mapping already exists
    const existingMapping = await db.projectMapping.findFirst({
      where: {
        userId: session.user.id,
        accProjectId,
        procoreProjectId
      }
    })

    if (existingMapping) {
      return NextResponse.json(
        { error: 'Project mapping already exists' },
        { status: 409 }
      )
    }

    const projectMapping = await db.projectMapping.create({
      data: {
        userId: session.user.id,
        accProjectId,
        accProjectName: accProjectName || 'Unknown',
        procoreProjectId,
        procoreProjectName: procoreProjectName || 'Unknown'
      }
    })

    return NextResponse.json({ projectMapping }, { status: 201 })
  } catch (error) {
    console.error('Error creating project mapping:', error)
    return NextResponse.json(
      { error: 'Failed to create project mapping' },
      { status: 500 }
    )
  }
}
