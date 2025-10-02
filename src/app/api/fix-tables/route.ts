import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Fixing table names...')
    
    // Drop existing tables
    await db.$executeRaw`DROP TABLE IF EXISTS "User" CASCADE;`
    await db.$executeRaw`DROP TABLE IF EXISTS "AccCredentials" CASCADE;`
    await db.$executeRaw`DROP TABLE IF EXISTS "ProcoreCredentials" CASCADE;`
    await db.$executeRaw`DROP TABLE IF EXISTS "ReviztoCredentials" CASCADE;`
    await db.$executeRaw`DROP TABLE IF EXISTS "Sync" CASCADE;`
    
    console.log('✅ Dropped existing tables')
    
    // Create tables with correct names
    await db.$executeRaw`
      CREATE TABLE "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `
    
    await db.$executeRaw`
      CREATE TABLE "acc_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    await db.$executeRaw`
      CREATE TABLE "procore_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    await db.$executeRaw`
      CREATE TABLE "revizto_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    await db.$executeRaw`
      CREATE TABLE "syncs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "sourceSystem" TEXT NOT NULL,
        "destinationSystem" TEXT NOT NULL,
        "sourceProject" TEXT NOT NULL,
        "destinationProject" TEXT NOT NULL,
        "fieldMappings" JSONB,
        "dataTypes" TEXT[],
        "status" TEXT NOT NULL DEFAULT 'active',
        "lastExecutedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `
    
    console.log('✅ Created tables with correct names')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tables fixed successfully!' 
    })
    
  } catch (error) {
    console.error('❌ Table fix error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
