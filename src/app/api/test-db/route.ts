import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...')
    console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('Environment check complete - using DATABASE_URL')
    
    // Try to connect to database
    await db.$connect()
    console.log('✅ Database connected successfully!')
    
    // Try to query the User table
    const userCount = await db.user.count()
    console.log('✅ User table exists, count:', userCount)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful!',
      userCount: userCount,
      envVars: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    })
    
  } catch (error) {
    console.error('❌ Database error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        envVars: {
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL
        }
      },
      { status: 500 }
    )
  }
}
