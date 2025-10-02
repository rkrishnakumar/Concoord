import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const sync = await db.sync.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!sync) {
      return NextResponse.json({ error: 'Sync not found' }, { status: 404 })
    }

    return NextResponse.json(sync)
  } catch (error) {
    console.error('Error fetching sync:', error)
    return NextResponse.json({ error: 'Failed to fetch sync' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, status, scheduleType, scheduleValue, fieldMappings } = body

    const sync = await db.sync.updateMany({
      where: {
        id,
        userId: session.user.id
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(scheduleType && { scheduleType }),
        ...(scheduleValue !== undefined && { scheduleValue }),
        ...(fieldMappings && { fieldMappings }),
        updatedAt: new Date()
      }
    })

    if (sync.count === 0) {
      return NextResponse.json({ error: 'Sync not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Sync updated successfully' })
  } catch (error) {
    console.error('Error updating sync:', error)
    return NextResponse.json({ error: 'Failed to update sync' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const sync = await db.sync.deleteMany({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (sync.count === 0) {
      return NextResponse.json({ error: 'Sync not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Sync deleted successfully' })
  } catch (error) {
    console.error('Error deleting sync:', error)
    return NextResponse.json({ error: 'Failed to delete sync' }, { status: 500 })
  }
}
export const dynamic = "force-dynamic"
