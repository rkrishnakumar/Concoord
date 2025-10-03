import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    console.log('Testing backend connection to:', baseUrl)
    
    const response = await fetch(`${baseUrl}/api/credentials?userId=test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return NextResponse.json({
      backendUrl: baseUrl,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })
  } catch (error) {
    console.error('Backend test error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: process.env.NEXT_PUBLIC_API_BASE_URL
    }, { status: 500 })
  }
}
