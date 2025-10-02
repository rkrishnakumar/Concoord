import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

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
    
    return NextResponse.json({ 
      success: true, 
      session: session ? 'exists' : 'null',
      userId: session?.user?.id,
      envCheck
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
