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

    // Get user's Revizto credentials
    const credentials = await db.reviztoCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.refreshToken) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 404 })
    }

    try {
      // Refresh the token using Revizto's API
      const response = await axios.post('https://api.virginia.revizto.com/v5/oauth2', {
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      // Update the database with new tokens
      const tokenData = response.data as { access_token: string; refresh_token?: string }
      await db.reviztoCredentials.update({
        where: { userId: session.user.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || credentials.refreshToken,
          expiresAt: new Date(Date.now() + (60 * 60 * 1000)) // 1 hour from now
        }
      })

      return NextResponse.json({ 
        success: true, 
        accessToken: tokenData.access_token,
        expiresAt: Date.now() + (60 * 60 * 1000)
      })
    } catch (error) {
      console.error('Error refreshing Revizto token:', error)
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in Revizto token refresh API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
