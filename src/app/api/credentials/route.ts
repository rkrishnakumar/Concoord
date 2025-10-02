import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Forward request to Railway backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/credentials?userId=${session.user.id}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
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
