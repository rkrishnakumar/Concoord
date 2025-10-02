import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const syncs = await db.sync.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(syncs)
  } catch (error) {
    console.error('Error fetching syncs:', error)
    return NextResponse.json({ error: 'Failed to fetch syncs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      sourceSystem, 
      sourceProjectId, 
      sourceProjectName,
      sourceDataTypes,
      destinationSystem,
      destinationProjectId,
      destinationProjectName,
      destinationCompanyId,
      destinationDataTypes,
      fieldMappings
    } = body

    // Validate required fields
    if (!name || !sourceSystem || !sourceProjectId || !destinationSystem || !destinationProjectId) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, sourceSystem, sourceProjectId, destinationSystem, destinationProjectId' 
      }, { status: 400 })
    }

    console.log('Creating sync with data:', {
      userId: session.user.id,
      name,
      description,
      sourceSystem,
      sourceProjectId,
      sourceProjectName,
      sourceDataTypes: sourceDataTypes || [],
      destinationSystem,
      destinationProjectId,
      destinationProjectName,
      destinationCompanyId: destinationCompanyId || null,
      destinationDataTypes: destinationDataTypes || [],
      fieldMappings: fieldMappings || {},
      status: 'draft'
    })

    const sync = await db.sync.create({
      data: {
        userId: session.user.id,
        name,
        description,
        sourceSystem,
        sourceProjectId,
        sourceProjectName,
        sourceDataTypes: sourceDataTypes || [],
        destinationSystem,
        destinationProjectId,
        destinationProjectName,
        destinationCompanyId: destinationCompanyId || null,
        destinationDataTypes: destinationDataTypes || [],
        fieldMappings: fieldMappings || {},
        status: 'draft'
      }
    })

    return NextResponse.json(sync, { status: 201 })
  } catch (error) {
    console.error('Error creating sync:', error)
    return NextResponse.json({ error: 'Failed to create sync' }, { status: 500 })
  }
}
