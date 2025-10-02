const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgres://postgres.hvposcymcjqegfsrihsq:xzdXfohLKX0yNFAc@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
    }
  }
});

async function checkTables() {
  try {
    console.log('Checking if tables exist...');
    
    // Try to query the User table
    const userCount = await prisma.user.count();
    console.log('✅ User table exists, count:', userCount);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('relation "User" does not exist')) {
      console.log('🔧 Tables need to be created');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
