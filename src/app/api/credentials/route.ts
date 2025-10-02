import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        accCredentials: true,
        procoreCredentials: true,
        reviztoCredentials: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      accCredentials: user.accCredentials,
      procoreCredentials: user.procoreCredentials,
      reviztoCredentials: user.reviztoCredentials
    })
  } catch (error) {
    console.error('Error fetching credentials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, credentials } = await request.json()

    if (!type || !credentials) {
      return NextResponse.json(
        { error: 'Type and credentials are required' },
        { status: 400 }
      )
    }

    if (type === 'acc') {
      const { clientId, clientSecret } = credentials
      
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Client ID and Client Secret are required' },
          { status: 400 }
        )
      }

      // Store the client credentials in the database
      await db.accCredentials.upsert({
        where: { userId: session.user.id },
        update: {
          clientId: clientId,
          clientSecret: clientSecret,
        },
        create: {
          userId: session.user.id,
          clientId: clientId,
          clientSecret: clientSecret,
          accessToken: '', // Will be filled during OAuth
          refreshToken: '',
          expiresAt: new Date(),
          baseUrl: 'https://developer.api.autodesk.com'
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'ACC credentials saved. Use "Authenticate with ACC" to get access tokens.' 
      })

    } else if (type === 'procore') {
      const { clientId, clientSecret } = credentials
      
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Client ID and Client Secret are required' },
          { status: 400 }
        )
      }

      // Store the client credentials in the database
      await db.procoreCredentials.upsert({
        where: { userId: session.user.id },
        update: {
          clientId: clientId,
          clientSecret: clientSecret,
        },
        create: {
          userId: session.user.id,
          clientId: clientId,
          clientSecret: clientSecret,
          accessToken: '', // Will be filled during OAuth
          refreshToken: '',
          expiresAt: new Date(),
          baseUrl: 'https://api.procore.com'
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Procore credentials saved. Use "Authenticate with Procore" to get access tokens.' 
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "acc" or "procore"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving credentials:', error)
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    )
  }
}
export const dynamic = "force-dynamic"
