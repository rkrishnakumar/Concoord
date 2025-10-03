import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { code, state } = Object.fromEntries(request.nextUrl.searchParams)
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', request.url))
    }

    if (!process.env.PROCORE_CLIENT_ID || !process.env.PROCORE_CLIENT_SECRET) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_credentials', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.procore.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/api/oauth/procore-callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Procore token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    console.log('Procore OAuth successful:', tokenData)

    // TODO: Store credentials in database once schema is fixed
    console.log('Procore OAuth successful - tokens received:', {
      access_token: tokenData.access_token ? 'present' : 'missing',
      refresh_token: tokenData.refresh_token ? 'present' : 'missing',
      expires_in: tokenData.expires_in
    });

    return NextResponse.redirect(new URL('/home?success=procore_connected', request.url))
  } catch (error) {
    console.error('Error in Procore callback:', error)
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', request.url))
  }
}
