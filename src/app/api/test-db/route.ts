import { NextRequest, NextResponse } from 'next/server'

const RAILWAY_BACKEND_URL = 'https://concoord-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Railway backend connection...')
    
    // Forward request to Railway backend
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/test-db`)
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
