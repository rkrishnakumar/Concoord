import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { code, state } = Object.fromEntries(request.nextUrl.searchParams)
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', request.url))
    }

    if (!process.env.ACC_CLIENT_ID || !process.env.ACC_CLIENT_SECRET) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_credentials', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.ACC_CLIENT_ID,
        client_secret: process.env.ACC_CLIENT_SECRET,
        redirect_uri: `https://concoord.vercel.app/api/oauth/acc-callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('ACC token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    console.log('ACC OAuth successful:', tokenData)

    // Get user session
    const session = await auth()
    console.log('Session in ACC callback:', session)
    if (!session?.user?.id) {
      console.error('No user session found')
      return NextResponse.redirect(new URL('/auth/error?error=no_session', request.url))
    }

    // Store credentials in database
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          system: 'acc',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in
        })
      });
      
      if (response.ok) {
        console.log('ACC credentials stored successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to store ACC credentials:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error storing ACC credentials:', error);
    }

    return NextResponse.redirect(new URL('/home?success=acc_connected', request.url))
  } catch (error) {
    console.error('Error in ACC callback:', error)
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', request.url))
  }
}
