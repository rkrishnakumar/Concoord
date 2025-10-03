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
        redirect_uri: `https://concoord.vercel.app/api/oauth/procore-callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Procore token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    console.log('Procore OAuth successful:', tokenData)

    // Store credentials in database
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'default-user', // TODO: Get from session
          system: 'procore',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in
        })
      });
      
      if (response.ok) {
        console.log('Procore credentials stored successfully');
      } else {
        console.error('Failed to store Procore credentials');
      }
    } catch (error) {
      console.error('Error storing Procore credentials:', error);
    }

    return NextResponse.redirect(new URL('/home?success=procore_connected', request.url))
  } catch (error) {
    console.error('Error in Procore callback:', error)
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', request.url))
  }
}
