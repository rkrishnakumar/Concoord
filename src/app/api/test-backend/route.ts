import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    console.log('Testing backend connection to:', baseUrl)
    
    // Test health endpoint first
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Test credentials endpoint
    const credentialsResponse = await fetch(`${baseUrl}/api/credentials?userId=test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return NextResponse.json({
      backendUrl: baseUrl,
      health: {
        status: healthResponse.status,
        ok: healthResponse.ok
      },
      credentials: {
        status: credentialsResponse.status,
        ok: credentialsResponse.ok
      },
      headers: Object.fromEntries(credentialsResponse.headers.entries())
    })
  } catch (error) {
    console.error('Backend test error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: process.env.NEXT_PUBLIC_API_BASE_URL
    }, { status: 500 })
  }
}
