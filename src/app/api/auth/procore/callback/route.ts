import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    console.log('Procore OAuth callback received:', request.url)
    
    const session = await auth()
    
    if (!session?.user?.id) {
      console.log('No session found, redirecting to signin')
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    console.log('Procore OAuth callback params:', { code: !!code, state, error })

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL('/home?error=oauth_denied', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/home?error=missing_parameters', request.url))
    }

    // Get stored credentials and PKCE data
    const credentials = await db.procoreCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials) {
      return NextResponse.redirect(new URL('/home?error=no_credentials', request.url))
    }

    // Parse stored PKCE data
    let pkceData
    try {
      pkceData = JSON.parse(credentials.accessToken)
    } catch {
      return NextResponse.redirect(new URL('/home?error=invalid_oauth_data', request.url))
    }

    // Verify state
    if (pkceData.state !== state) {
      return NextResponse.redirect(new URL('/home?error=invalid_state', request.url))
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://login.procore.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code: code,
        redirect_uri: `http://localhost:3000/api/auth/procore/callback`,
        code_verifier: pkceData.codeVerifier
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const { access_token, refresh_token, expires_in } = tokenResponse.data as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    const expiresAt = new Date(Date.now() + (expires_in * 1000))

    // Store real tokens in database
    await db.procoreCredentials.update({
      where: { userId: session.user.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        updatedAt: new Date()
      }
    })

    // Redirect back to home with success
    return NextResponse.redirect(new URL('/home?success=procore_authenticated', request.url))
  } catch (error) {
    console.error('Error in Procore OAuth callback:', error)
    return NextResponse.redirect(new URL('/home?error=oauth_failed', request.url))
  }
}
export const dynamic = "force-dynamic"
