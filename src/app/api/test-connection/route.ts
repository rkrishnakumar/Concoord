import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import axios from 'axios'
import { ReviztoApi } from '@/lib/revizto-api'
import { ProcoreApi } from '@/lib/procore-api'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await request.json()

    if (!type || (type !== 'acc' && type !== 'procore' && type !== 'revizto')) {
      return NextResponse.json(
        { error: 'Type must be "acc", "procore", or "revizto"' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        accCredentials: type === 'acc',
        procoreCredentials: type === 'procore',
        reviztoCredentials: type === 'revizto'
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (type === 'acc') {
      if (!user.accCredentials) {
        return NextResponse.json(
          { error: 'ACC credentials not found. Please configure them first.' },
          { status: 400 }
        )
      }

      try {
        // Simple API health check - just verify we can make an authenticated request
        const response = await axios.get(
          'https://developer.api.autodesk.com/project/v1/hubs',
          {
            headers: {
              'Authorization': `Bearer ${user.accCredentials.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Autodesk Construction Cloud.'
        })
      } catch (error) {
        console.error('ACC connection test failed:', error)
        return NextResponse.json(
          { error: 'Failed to connect to Autodesk. Please check your credentials.' },
          { status: 400 }
        )
      }

    } else if (type === 'procore') {
      if (!user.procoreCredentials) {
        return NextResponse.json(
          { error: 'Procore credentials not found. Please configure them first.' },
          { status: 400 }
        )
      }

      try {
        const procoreApi = new ProcoreApi(
          user.procoreCredentials.accessToken,
          user.procoreCredentials.baseUrl,
          user.procoreCredentials.clientId,
          user.procoreCredentials.clientSecret,
          user.procoreCredentials.refreshToken || undefined
        )

        // Test connection by getting companies
        await procoreApi.getCompanies()
        
        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Procore.'
        })
      } catch (error) {
        console.error('Procore connection test failed:', error)
        return NextResponse.json(
          { error: 'Failed to connect to Procore. Please check your credentials.' },
          { status: 400 }
        )
      }

    } else if (type === 'revizto') {
      if (!user.reviztoCredentials) {
        return NextResponse.json(
          { error: 'Revizto credentials not found. Please configure them first.' },
          { status: 400 }
        )
      }

      try {
        const reviztoApi = new ReviztoApi(
          user.reviztoCredentials.accessToken,
          'https://api.virginia.revizto.com', // Use the correct API base URL
          user.reviztoCredentials.clientId,
          user.reviztoCredentials.clientSecret,
          user.reviztoCredentials.refreshToken || undefined,
          user.reviztoCredentials.expiresAt
        )

        const isConnected = await reviztoApi.testConnection()
        
        if (isConnected) {
          return NextResponse.json({
            success: true,
            message: 'Successfully connected to Revizto.'
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to connect to Revizto. Please check your credentials.' },
            { status: 400 }
          )
        }
      } catch (error) {
        console.error('Revizto connection test failed:', error)
        return NextResponse.json(
          { error: 'Failed to connect to Revizto. Please check your credentials.' },
          { status: 400 }
        )
      }
    }

  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}
