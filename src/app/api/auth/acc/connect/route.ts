import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

// Generate PKCE code challenge and verifier
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use your app's credentials (set these in environment variables)
    const clientId = process.env.AUTODESK_CLIENT_ID
    const clientSecret = process.env.AUTODESK_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Autodesk credentials not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = generatePKCE()
    
    // Store code verifier in session for later use
    const state = crypto.randomBytes(16).toString('hex')
    
    // Build authorization URL
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/acc/callback`
    const authUrl = new URL('https://developer.api.autodesk.com/authentication/v2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'data:read data:write account:read')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    // Store OAuth state and PKCE data in database
    await db.accCredentials.upsert({
      where: { userId: session.user.id },
      update: {
        clientId: clientId,
        clientSecret: clientSecret,
        // Store PKCE data temporarily
        accessToken: JSON.stringify({ state, codeVerifier, timestamp: Date.now() }),
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        clientId: clientId,
        clientSecret: clientSecret,
        accessToken: JSON.stringify({ state, codeVerifier, timestamp: Date.now() }),
        refreshToken: '',
        expiresAt: new Date(),
        baseUrl: 'https://developer.api.autodesk.com'
      }
    })

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Error initiating ACC OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
