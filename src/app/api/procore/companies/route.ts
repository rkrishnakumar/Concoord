import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProcoreApi } from '@/lib/procore-api'


export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Procore credentials
    const credentials = await db.procoreCredentials.findUnique({
      where: { userId: session.user.id }
    })

    if (!credentials?.accessToken) {
      return NextResponse.json({ error: 'No Procore credentials found' }, { status: 404 })
    }

    // Create Procore API client
    const procoreApi = new ProcoreApi(
      credentials.accessToken, 
      credentials.baseUrl,
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || undefined
    )

    try {
      console.log('Fetching Procore companies...')
      // Get companies
      const companies = await procoreApi.getCompanies()
      console.log('Procore companies fetched successfully:', companies.length)
      
      return NextResponse.json({ 
        success: true, 
        companies 
      })
    } catch (error) {
      console.error('Error fetching Procore companies:', error)
      console.error('Error details:', (error as any)?.response?.data)
      return NextResponse.json(
        { error: 'Failed to fetch companies from Procore' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in companies API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
