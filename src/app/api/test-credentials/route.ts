import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    // Check if credentials exist for this user
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/credentials?userId=${session.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    const credentials = await response.json()
    return NextResponse.json({ 
      userId: session.user.id,
      credentials: credentials 
    })
  } catch (error) {
    console.error('Error checking credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
