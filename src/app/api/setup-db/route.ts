import { NextRequest, NextResponse } from 'next/server'

const RAILWAY_BACKEND_URL = 'https://concoord-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('Forwarding database setup to Railway backend...')
    
    // Forward request to Railway backend
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/setup-db`, {
      method: 'POST'
    })
    const data = await response.json()
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Railway backend error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
