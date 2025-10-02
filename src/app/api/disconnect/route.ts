import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await request.json()

    if (!type || !['acc', 'procore', 'revizto'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be "acc", "procore", or "revizto"' }, { status: 400 })
    }

    const userId = session.user.id

    try {
      if (type === 'acc') {
        // Delete ACC credentials
        await db.accCredentials.deleteMany({
          where: { userId }
        })
        console.log(`Deleted ACC credentials for user ${userId}`)
      } else if (type === 'procore') {
        // Delete Procore credentials
        await db.procoreCredentials.deleteMany({
          where: { userId }
        })
        console.log(`Deleted Procore credentials for user ${userId}`)
      } else if (type === 'revizto') {
        // Delete Revizto credentials
        await db.reviztoCredentials.deleteMany({
          where: { userId }
        })
        console.log(`Deleted Revizto credentials for user ${userId}`)
      }

      return NextResponse.json({ 
        success: true, 
        message: `${type.toUpperCase()} account disconnected successfully` 
      })
    } catch (error) {
      console.error(`Error disconnecting ${type} account:`, error)
      return NextResponse.json(
        { error: `Failed to disconnect ${type} account` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in disconnect API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
