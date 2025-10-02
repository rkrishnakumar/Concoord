import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Debug environment variable
    console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL)
    
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      console.error('NEXT_PUBLIC_API_BASE_URL is not set!')
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      )
    }

    // Forward request to Railway backend
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/signup`
    console.log('Making request to:', url)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status })
      }

      return NextResponse.json(data)
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: `Network error: ${fetchError.message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
