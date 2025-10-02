import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Revizto connect route called')
    console.log('DB object:', typeof db, db ? 'exists' : 'undefined')
    
    const session = await auth()
    console.log('Session:', session?.user?.id ? 'exists' : 'undefined')
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accessCode } = await request.json()
    
    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Exchange the access code for tokens
    try {
      console.log('Attempting Revizto token exchange with access code:', accessCode.substring(0, 10) + '...')
      
      const tokenResponse = await fetch('https://api.virginia.revizto.com/v5/oauth2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: accessCode
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Revizto token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          body: errorText
        })
        throw new Error(`Failed to exchange access code for tokens: ${tokenResponse.status} ${errorText}`)
      }

      const tokenData = await tokenResponse.json()
      console.log('Revizto API response:', JSON.stringify(tokenData, null, 2))
      
      // Check if the response indicates an error
      if (tokenData.result && tokenData.result !== 0) {
        throw new Error(`Revizto API error: ${tokenData.message || 'Unknown error'}`)
      }
      
      // Check if we have the expected token fields
      if (!tokenData.access_token) {
        throw new Error('Revizto API did not return an access token')
      }
      
      console.log('Revizto token exchange successful:', { 
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token 
      })
      
      // Store the access token and refresh token
      await db.reviztoCredentials.upsert({
        where: { userId: session.user.id },
        update: {
          clientId: '', // Not needed for Revizto
          clientSecret: '', // Not needed for Revizto
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour from now
          baseUrl: 'https://developer.revizto.com'
        },
        create: {
          userId: session.user.id,
          clientId: '', // Not needed for Revizto
          clientSecret: '', // Not needed for Revizto
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour from now
          baseUrl: 'https://developer.revizto.com'
        }
      })
    } catch (error) {
      console.error('Error exchanging access code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return NextResponse.json({ 
        error: 'Failed to exchange access code for tokens', 
        details: errorMessage 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Revizto access code configured successfully' 
    })
  } catch (error) {
    console.error('Error configuring Revizto access code:', error)
    return NextResponse.json({ error: 'Failed to configure access code' }, { status: 500 })
  }
}
