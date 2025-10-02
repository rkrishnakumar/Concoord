import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Railway database connection...')
    
    // Check environment variables
    const envCheck = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      databaseUrl: process.env.DATABASE_URL ? 'exists' : 'missing'
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Railway database test',
      envCheck
    })
    
  } catch (error) {
    console.error('❌ Railway test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
