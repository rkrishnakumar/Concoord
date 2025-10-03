import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api-helper'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Forward request to Railway backend
    const response = await fetch(`${buildApiUrl('/api/acc/projects')}?userId=${session.user.id}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in ACC projects API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
