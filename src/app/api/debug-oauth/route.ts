import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Debugging OAuth setup...')
    
    // Check session
    const session = await auth()
    console.log('Session:', session ? 'exists' : 'null')
    console.log('User ID:', session?.user?.id)
    
    // Check environment variables
    const envCheck = {
      hasAutodeskClientId: !!process.env.AUTODESK_CLIENT_ID,
      hasAutodeskClientSecret: !!process.env.AUTODESK_CLIENT_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL
    }
    console.log('Environment check:', envCheck)
    
    // Test database connection
    let dbTest = 'not tested'
    try {
      await db.$connect()
      const userCount = await db.user.count()
      dbTest = `connected, ${userCount} users`
    } catch (dbError) {
      dbTest = `error: ${dbError instanceof Error ? dbError.message : 'unknown'}`
    }
    
    return NextResponse.json({ 
      success: true, 
      session: session ? 'exists' : 'null',
      userId: session?.user?.id,
      envCheck,
      dbTest
    })
    
  } catch (error) {
    console.error('❌ OAuth debug error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
