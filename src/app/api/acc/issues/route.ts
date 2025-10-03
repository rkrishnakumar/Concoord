import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api-helper'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Forward request to Railway backend
    const response = await fetch(`${buildApiUrl('/api/acc/issues')}?userId=${session.user.id}&projectId=${projectId}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in ACC issues API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
