import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing authentication...')
    
    // Check session
    const session = await auth()
    console.log('Session exists:', !!session)
    console.log('User ID:', session?.user?.id)
    
    // Check users in database
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      session: session ? {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      } : null,
      users: users
    })
    
  } catch (error) {
    console.error('❌ Auth test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
