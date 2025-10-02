import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    hasUrl: !!process.env.NEXT_PUBLIC_API_BASE_URL
  })
}
