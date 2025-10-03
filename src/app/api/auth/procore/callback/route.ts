import { NextRequest, NextResponse } from 'next/server'
import { buildApiUrl } from '@/lib/api-helper'

export async function GET(request: NextRequest) {
  try {
    // Forward the callback to Railway backend
    const url = new URL(request.url)
    const railwayUrl = `${buildApiUrl('/api/auth/procore/callback')}${url.search}`
    
    const response = await fetch(railwayUrl)
    
    if (response.redirected) {
      return NextResponse.redirect(response.url)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in Procore callback:', error)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }
}
