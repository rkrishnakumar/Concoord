import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId, clientSecret } = await request.json()

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID and Client Secret are required' },
        { status: 400 }
      )
    }

    // For MVP, we'll simulate OAuth flow
    // In production, you'd implement the full OAuth 2.0 flow
    const mockAccessToken = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const mockRefreshToken = `acc_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store credentials in database
    await db.accCredentials.upsert({
      where: { userId: session.user.id },
      update: {
        clientId: clientId,
        clientSecret: clientSecret,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        clientId: clientId,
        clientSecret: clientSecret,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt,
        baseUrl: 'https://developer.api.autodesk.com'
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'ACC authentication successful',
      accessToken: mockAccessToken
    })
  } catch (error) {
    console.error('Error authenticating with ACC:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate with ACC' },
      { status: 500 }
    )
  }
}
export const dynamic = "force-dynamic"
