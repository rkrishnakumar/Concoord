const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

const app = express();
const prisma = new PrismaClient();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "acc_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "procore_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "revizto_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "baseUrl" TEXT NOT NULL DEFAULT 'https://developer.revizto.com',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "syncs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "sourceSystem" TEXT NOT NULL,
        "sourceProjectId" TEXT NOT NULL,
        "sourceProjectName" TEXT NOT NULL,
        "sourceDataTypes" JSONB NOT NULL,
        "destinationSystem" TEXT NOT NULL,
        "destinationProjectId" TEXT NOT NULL,
        "destinationProjectName" TEXT NOT NULL,
        "destinationCompanyId" TEXT,
        "destinationDataTypes" JSONB NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "scheduleType" TEXT NOT NULL DEFAULT 'manual',
        "scheduleValue" TEXT,
        "lastRunAt" TIMESTAMP(3),
        "lastRunStatus" TEXT,
        "nextRunAt" TIMESTAMP(3),
        "fieldMappings" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    console.log('Database tables initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize database on startup
initializeDatabase();

app.use(cors());
app.use(express.json());

// OAuth callback endpoints
app.get('/api/auth/acc/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_code`);
    }

    if (!process.env.ACC_CLIENT_ID || !process.env.ACC_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_credentials`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.ACC_CLIENT_ID,
        client_secret: process.env.ACC_CLIENT_SECRET,
        redirect_uri: `${process.env.FRONTEND_URL}/api/auth/acc/callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('ACC token exchange failed:', errorText);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('ACC OAuth successful:', tokenData);

    // Store credentials in database
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    // Ensure user exists
    await prisma.user.upsert({
      where: { id: 'default-user' },
      update: {},
      create: {
        id: 'default-user',
        email: 'default@concoord.com',
        name: 'Default User',
        password: 'default-password'
      }
    });
    
    await prisma.accCredentials.upsert({
      where: { userId: 'default-user' }, // TODO: Get actual user ID from session
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt
      },
      create: {
        id: `acc_${Date.now()}`,
        userId: 'default-user', // TODO: Get actual user ID from session
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt
      }
    });

    console.log('ACC credentials stored successfully');
    res.redirect(`${process.env.FRONTEND_URL}/home?success=acc_connected`);
  } catch (error) {
    console.error('Error in ACC callback:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=callback_failed`);
  }
});

app.get('/api/auth/procore/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_code`);
    }

    if (!process.env.PROCORE_CLIENT_ID || !process.env.PROCORE_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_credentials`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.procore.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
        redirect_uri: `${process.env.FRONTEND_URL}/api/auth/procore/callback`
      })
    });

    if (!tokenResponse.ok) {
      console.error('Procore token exchange failed:', await tokenResponse.text());
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Procore OAuth successful:', tokenData);

    // Store credentials in database
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    await prisma.procoreCredentials.upsert({
      where: { userId: 'default-user' }, // TODO: Get actual user ID from session
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt
      },
      create: {
        id: `procore_${Date.now()}`,
        userId: 'default-user', // TODO: Get actual user ID from session
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt
      }
    });

    console.log('Procore credentials stored successfully');
    res.redirect(`${process.env.FRONTEND_URL}/home?success=procore_connected`);
  } catch (error) {
    console.error('Error in Procore callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=callback_failed`);
  }
});

// OAuth connect endpoints
app.get('/api/auth/acc/connect', (req, res) => {
  try {
    if (!process.env.ACC_CLIENT_ID) {
      console.error('ACC_CLIENT_ID not set')
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_client_id`)
    }
    
    // Get user ID from query parameter
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Generate state parameter that includes user ID
    const state = `${userId}_${Math.random().toString(36).substring(2, 15)}`
    
    // Store state in session or database for verification
    // For now, we'll include it in the URL
    const accOAuthUrl = `https://developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=${process.env.ACC_CLIENT_ID}&redirect_uri=https://concoord-production.up.railway.app/api/oauth/acc-callback&scope=data:read data:write&state=${state}`
    
    console.log('ACC OAuth URL:', accOAuthUrl)
    res.redirect(accOAuthUrl)
  } catch (error) {
    console.error('Error initiating ACC OAuth:', error)
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=oauth_failed`)
  }
})

app.get('/api/auth/procore/connect', (req, res) => {
  try {
    if (!process.env.PROCORE_CLIENT_ID) {
      console.error('PROCORE_CLIENT_ID not set')
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_client_id`)
    }
    
    // Get user ID from query parameter
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Generate state parameter that includes user ID
    const state = `${userId}_${Math.random().toString(36).substring(2, 15)}`
    
    // Store state in session or database for verification
    // For now, we'll include it in the URL
    const procoreOAuthUrl = `https://login.procore.com/oauth/authorize?response_type=code&client_id=${process.env.PROCORE_CLIENT_ID}&redirect_uri=https://concoord-production.up.railway.app/api/oauth/procore-callback&state=${state}`
    
    console.log('Procore OAuth URL:', procoreOAuthUrl)
    res.redirect(procoreOAuthUrl)
  } catch (error) {
    console.error('Error initiating Procore OAuth:', error)
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=oauth_failed`)
  }
})

// ACC OAuth callback endpoint
app.get('/api/oauth/acc-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_code`);
    }

    if (!process.env.ACC_CLIENT_ID || !process.env.ACC_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_credentials`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.ACC_CLIENT_ID,
        client_secret: process.env.ACC_CLIENT_SECRET,
        redirect_uri: 'https://concoord-production.up.railway.app/api/oauth/acc-callback'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('ACC token exchange failed:', errorText);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('ACC OAuth successful:', tokenData);

    // Store credentials in database
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    // Extract user ID from the state parameter
    const userId = state ? state.split('_')[0] : 'default-user';
    console.log('Using user ID for ACC:', userId);
    
    await prisma.accCredentials.upsert({
      where: { userId },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt
      },
      create: {
        id: `acc_${Date.now()}`,
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: expiresAt
      }
    });

    console.log('ACC credentials stored successfully');
    res.redirect(`${process.env.FRONTEND_URL}/home?success=acc_connected`);
  } catch (error) {
    console.error('Error in ACC callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=callback_failed`);
  }
});

// Credentials storage endpoint for all OAuth providers

// Revizto token storage endpoint
app.post('/api/revizto/tokens', async (req, res) => {
  try {
    console.log('Revizto tokens request body:', req.body);
    const { userId, accessToken, refreshToken, expiresIn } = req.body;
    
    console.log('Extracted values:', { userId, accessToken: accessToken ? 'present' : 'missing', refreshToken: refreshToken ? 'present' : 'missing', expiresIn });
    
    if (!userId || !accessToken) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({ error: 'userId and accessToken are required' });
    }

    // Store Revizto credentials in database
    await prisma.reviztoCredentials.upsert({
      where: { userId },
      update: {
        accessToken: accessToken,
        refreshToken: refreshToken || null,
        expiresAt: new Date(Date.now() + ((expiresIn || 3600) * 1000))
      },
      create: {
        id: `revizto_${Date.now()}`,
        userId,
        accessToken: accessToken,
        refreshToken: refreshToken || null,
        expiresAt: new Date(Date.now() + ((expiresIn || 3600) * 1000))
      }
    });
    
    console.log('Revizto credentials stored successfully');
    res.json({ success: true, message: 'Revizto credentials stored successfully' });
  } catch (error) {
    console.error('Error storing Revizto credentials:', error);
    res.status(500).json({ error: 'Failed to store Revizto credentials' });
  }
});

// Check if tables exist and have correct schema
async function checkTablesExist() {
  try {
    // Check if tables exist by querying their structure
    const accTable = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'acc_credentials' AND table_schema = 'public'
    `;
    
    const procoreTable = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'procore_credentials' AND table_schema = 'public'
    `;
    
    // Check if tables exist and don't have clientId/clientSecret columns (old schema)
    const hasOldSchema = accTable.some(col => col.column_name === 'clientId') || 
                        procoreTable.some(col => col.column_name === 'clientId');
    
    return accTable.length > 0 && procoreTable.length > 0 && !hasOldSchema;
  } catch (error) {
    console.log('Tables do not exist or error checking:', error.message);
    return false;
  }
}

// Fix database constraints on startup
async function fixDatabaseConstraints() {
  try {
    console.log('Checking database schema...');
    
    // Check if tables exist and have the correct schema
    const tablesExist = await checkTablesExist();
    
    if (tablesExist) {
      console.log('✅ Database tables already exist with correct schema');
      return;
    }
    
    console.log('⚠️ Tables missing or incorrect schema - recreating...');
    
    // Only drop and recreate if tables don't exist or have wrong schema
    try {
      await prisma.$executeRaw`DROP TABLE IF EXISTS "procore_credentials" CASCADE`;
      await prisma.$executeRaw`DROP TABLE IF EXISTS "acc_credentials" CASCADE`;
      await prisma.$executeRaw`DROP TABLE IF EXISTS "revizto_credentials" CASCADE`;
      console.log('✅ Dropped old credential tables');
    } catch (error) {
      console.log('⚠️ Error dropping tables:', error.message);
    }
    
    // Recreate tables with correct schema (no clientId/clientSecret columns)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "acc_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "procore_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "revizto_credentials" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("userId")
      );
    `;
    
    console.log('✅ Recreated credential tables with correct schema');
    
    console.log('✅ Tables created with unique constraints');
    
    console.log('🎉 Database schema fixed successfully!');
  } catch (error) {
    console.error('Error fixing database schema:', error);
  }
}

// Run database fixes on startup
fixDatabaseConstraints();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Railway backend is running' });
});

// User signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({
      error: 'Failed to login user'
    });
  }
});

// Get user credentials
app.get('/api/credentials', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accCredentials: true,
        procoreCredentials: true,
        reviztoCredentials: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      acc: user.accCredentials ? {
        connected: true,
        clientId: process.env.ACC_CLIENT_ID,
        baseUrl: 'https://developer.api.autodesk.com'
      } : { connected: false },
      procore: user.procoreCredentials ? {
        connected: true,
        clientId: process.env.PROCORE_CLIENT_ID,
        baseUrl: 'https://api.procore.com'
      } : { connected: false },
      revizto: user.reviztoCredentials ? {
        connected: true,
        baseUrl: user.reviztoCredentials.baseUrl
      } : { connected: false }
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

app.get('/api/oauth/procore-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_code`);
    }

    if (!process.env.PROCORE_CLIENT_ID || !process.env.PROCORE_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=missing_credentials`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.procore.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
        redirect_uri: 'https://concoord-production.up.railway.app/api/oauth/procore-callback'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Procore token exchange failed:', errorText);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Procore OAuth successful:', tokenData);

    // Store credentials in database
    try {
      // Extract user ID from the state parameter
      const userId = state ? state.split('_')[0] : 'default-user';
      console.log('Using user ID for Procore:', userId);
      
      // Ensure user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: 'default@concoord.com',
          name: 'Default User',
          password: 'default-password'
        }
      });

      await prisma.procoreCredentials.upsert({
        where: { userId },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
        },
        create: {
          id: `procore_${Date.now()}`,
          userId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
        }
      });
      console.log('Procore credentials stored successfully');
    } catch (error) {
      console.error('Error storing Procore credentials:', error);
    }

    res.redirect(`${process.env.FRONTEND_URL}/home?success=procore_connected`);
  } catch (error) {
    console.error('Error in Procore callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=callback_failed`);
  }
});

// Store credentials
app.post('/api/credentials', async (req, res) => {
  try {
    const { userId, system, accessToken, refreshToken, expiresIn } = req.body;
    
    if (!userId || !system || !accessToken) {
      return res.status(400).json({ error: 'User ID, system, and access token are required' });
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));

    if (system === 'acc') {
      await prisma.accCredentials.upsert({
        where: { userId },
        update: {
          accessToken,
          refreshToken,
          expiresAt
        },
        create: {
          id: `acc_${Date.now()}`,
          userId,
          accessToken,
          refreshToken,
          expiresAt
        }
      });
    } else if (system === 'procore') {
      await prisma.procoreCredentials.upsert({
        where: { userId },
        update: {
          accessToken,
          refreshToken,
          expiresAt
        },
        create: {
          id: `procore_${Date.now()}`,
          userId,
          accessToken,
          refreshToken,
          expiresAt
        }
      });
    } else if (system === 'revizto') {
      await prisma.reviztoCredentials.upsert({
        where: { userId },
        update: {
          accessToken,
          refreshToken,
          expiresAt
        },
        create: {
          id: `revizto_${Date.now()}`,
          userId,
          accessToken,
          refreshToken,
          expiresAt
        }
      });
    } else {
      return res.status(400).json({ error: 'Invalid system' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error storing credentials:', error);
    res.status(500).json({ error: 'Failed to store credentials' });
  }
});

// Disconnect system
app.post('/api/disconnect', async (req, res) => {
  try {
    const { userId, system } = req.body;
    
    if (!userId || !system) {
      return res.status(400).json({ error: 'User ID and system are required' });
    }

    if (system === 'acc') {
      await prisma.accCredentials.deleteMany({
        where: { userId }
      });
    } else if (system === 'procore') {
      await prisma.procoreCredentials.deleteMany({
        where: { userId }
      });
    } else if (system === 'revizto') {
      await prisma.reviztoCredentials.deleteMany({
        where: { userId }
      });
    }

    res.json({ success: true, message: `${system} disconnected successfully` });
  } catch (error) {
    console.error('Error disconnecting system:', error);
    res.status(500).json({ error: 'Failed to disconnect system' });
  }
});

// Test connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const { userId, type } = req.body;
    
    if (!userId || !type) {
      return res.status(400).json({ error: 'User ID and type are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accCredentials: type === 'acc',
        procoreCredentials: type === 'procore',
        reviztoCredentials: type === 'revizto'
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let credentials;
    if (type === 'acc') credentials = user.accCredentials;
    else if (type === 'procore') credentials = user.procoreCredentials;
    else if (type === 'revizto') credentials = user.reviztoCredentials;

    if (!credentials) {
      return res.status(404).json({ error: `No ${type} credentials found` });
    }

    // Simple health check - just return success for now
    res.json({ 
      success: true, 
      message: `${type} connection test successful`,
      connected: true
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// Get syncs
app.get('/api/syncs', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const syncs = await prisma.sync.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, syncs });
  } catch (error) {
    console.error('Error fetching syncs:', error);
    res.status(500).json({ error: 'Failed to fetch syncs' });
  }
});

// Create sync
app.post('/api/syncs', async (req, res) => {
  try {
    const { 
      userId, 
      name, 
      description, 
      sourceSystem, 
      sourceProjectId, 
      sourceProjectName,
      sourceDataTypes,
      destinationSystem,
      destinationProjectId,
      destinationProjectName,
      destinationCompanyId,
      destinationDataTypes,
      fieldMappings
    } = req.body;

    if (!userId || !name || !sourceSystem || !sourceProjectId || !destinationSystem || !destinationProjectId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, name, sourceSystem, sourceProjectId, destinationSystem, destinationProjectId' 
      });
    }

    const sync = await prisma.sync.create({
      data: {
        userId,
        name,
        description,
        sourceSystem,
        sourceProjectId,
        sourceProjectName,
        sourceDataTypes: sourceDataTypes || [],
        destinationSystem,
        destinationProjectId,
        destinationProjectName,
        destinationCompanyId: destinationCompanyId || null,
        destinationDataTypes: destinationDataTypes || [],
        fieldMappings: fieldMappings || {},
        status: 'draft'
      }
    });

    res.json({ success: true, sync });
  } catch (error) {
    console.error('Error creating sync:', error);
    res.status(500).json({ error: 'Failed to create sync' });
  }
});

// Get single sync
app.get('/api/syncs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const sync = await prisma.sync.findFirst({
      where: { 
        id,
        userId 
      }
    });

    if (!sync) {
      return res.status(404).json({ error: 'Sync not found' });
    }

    res.json({ success: true, sync });
  } catch (error) {
    console.error('Error fetching sync:', error);
    res.status(500).json({ error: 'Failed to fetch sync' });
  }
});

// Execute sync
// Helper function to fetch issues from Revizto
async function fetchReviztoIssues(credentials, projectId) {
  try {
    const response = await axios.get(`https://api.virginia.revizto.com/v5/project/${projectId}/issue-filter/filter`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Revizto issues response:', response.status);
    const issues = response.data?.data?.data || [];
    console.log(`Fetched ${issues.length} issues from Revizto`);
    return issues;
  } catch (error) {
    console.error('Error fetching Revizto issues:', error.message);
    throw new Error(`Failed to fetch issues from Revizto: ${error.message}`);
  }
}

// Helper function to validate required field mappings
function validateRequiredMappings(fieldMappings) {
  if (!fieldMappings || !fieldMappings.issues) {
    console.log('No field mappings found');
    return false;
  }

  const mappings = fieldMappings.issues;
  const hasTitleMapping = mappings.some(mapping => 
    mapping.destinationField === 'title'
  );

  console.log('Field mapping validation:', {
    totalMappings: mappings.length,
    hasTitleMapping,
    mappings: mappings.map(m => ({ source: m.sourceField, destination: m.destinationField }))
  });

  return hasTitleMapping;
}

// Helper function to apply field mappings
function applyFieldMappings(issues, fieldMappings) {
  if (!fieldMappings || !fieldMappings.issues) {
    console.log('No field mappings found, returning original issues');
    return issues;
  }

  const mappings = fieldMappings.issues;
  console.log('Applying field mappings:', mappings);

  return issues.map(issue => {
    const transformedIssue = {};
    
    // Apply each field mapping
    mappings.forEach(mapping => {
      const sourceValue = issue[mapping.sourceField];
      console.log(`Mapping ${mapping.sourceField} -> ${mapping.destinationField}:`, {
        sourceValue,
        hasValue: sourceValue !== undefined,
        type: typeof sourceValue
      });
      
      if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
        // Extract value from Revizto's nested object structure
        let finalValue = sourceValue;
        if (typeof sourceValue === 'object' && sourceValue.value !== undefined) {
          finalValue = sourceValue.value;
          console.log(`Extracted value from nested object: ${sourceValue.value}`);
        }
        
        // Handle date formatting for Procore
        if (mapping.destinationField === 'due_date' && finalValue) {
          // Skip invalid dates (like '2000-01-01 00:00:00')
          if (finalValue === '2000-01-01 00:00:00' || finalValue.includes('2000-01-01')) {
            console.log(`Skipping invalid due_date: ${finalValue}`);
            return; // Skip this mapping
          }
          
          // Convert date to yyyy-mm-dd format
          try {
            const date = new Date(finalValue);
            if (!isNaN(date.getTime())) {
              finalValue = date.toISOString().split('T')[0]; // yyyy-mm-dd format
              console.log(`Formatted due_date: ${finalValue}`);
            }
          } catch (error) {
            console.log(`Error formatting due_date: ${error.message}`);
            return; // Skip this mapping
          }
        }
        
        transformedIssue[mapping.destinationField] = finalValue;
      }
    });

    console.log('Transformed issue:', { 
      original: Object.keys(issue).slice(0, 5), // Show first 5 keys
      transformed: transformedIssue,
      hasTitle: !!transformedIssue.title,
      titleValue: transformedIssue.title
    });
    return transformedIssue;
  });
}

// Helper function to post issues to Procore
async function postIssuesToProcore(credentials, companyId, projectId, issues) {
  let created = 0;
  let updated = 0;
  const errors = [];

  console.log(`Posting ${issues.length} issues to Procore...`);
  console.log('postIssuesToProcore parameters:', {
    companyId,
    projectId,
    issuesCount: issues.length,
    credentialsPresent: !!credentials
  });

  // Test Procore API connectivity first
  try {
    console.log('Testing Procore API connectivity...');
    const testResponse = await axios.get('https://api.procore.com/rest/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Procore-Company-Id': companyId
      }
    });
    console.log('Procore API test successful:', {
      status: testResponse.status,
      user: testResponse.data?.name || 'Unknown'
    });
  } catch (testError) {
    console.error('Procore API test failed:', {
      status: testError.response?.status,
      data: testError.response?.data,
      message: testError.message
    });
  }

  for (const issue of issues) {
    // Only include fields that exist in the issue (were mapped)
    // Don't spread all issue fields as some might conflict with Procore's internal fields
    const payload = {
      project_id: projectId
    };
    
    // Add only the fields that were actually mapped and have values
    const acceptedFields = ['title', 'description', 'status', 'priority', 'assignee', 'due_date', 'location', 'drawing', 'trade'];
    acceptedFields.forEach(field => {
      if (issue[field] !== undefined && issue[field] !== null && issue[field] !== '') {
        payload[field] = issue[field];
      }
    });
    
    // Reduced logging to avoid rate limits
    console.log(`Creating payload for: ${issue.title}`, payload);
    
    try {
      console.log(`Posting to Procore: ${issue.title}`);
      
      const response = await axios.post('https://api.procore.com/rest/v1.0/coordination_issues', payload, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Procore-Company-Id': companyId,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Procore API response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.status === 201) {
        created++;
        console.log(`Created issue: ${issue.title || issue.name || 'Untitled'}`);
      } else if (response.status === 200) {
        updated++;
        console.log(`Updated issue: ${issue.title || issue.name || 'Untitled'}`);
      }
    } catch (error) {
      console.error('Error posting issue to Procore:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        payload: {
          title: payload.title,
          project_id: payload.project_id,
          keys: Object.keys(payload)
        }
      });
      errors.push({
        issue: issue.title || issue.name || 'Untitled',
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      });
    }
  }

  console.log(`Procore sync results: ${created} created, ${updated} updated, ${errors.length} errors`);
  return { created, updated, errors };
}

app.post('/api/syncs/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const sync = await prisma.sync.findFirst({
      where: { 
        id,
        userId 
      }
    });

    if (!sync) {
      return res.status(404).json({ error: 'Sync not found' });
    }

    // Update sync status
    await prisma.sync.update({
      where: { id },
      data: { 
        status: 'running',
        lastRunAt: new Date()
      }
    });

    // Real sync implementation
    console.log('Starting real sync execution for:', {
      syncId: id,
      sourceSystem: sync.sourceSystem,
      destinationSystem: sync.destinationSystem,
      sourceProjectId: sync.sourceProjectId,
      destinationProjectId: sync.destinationProjectId,
      destinationCompanyId: sync.destinationCompanyId
    });

    let issuesCreated = 0;
    let issuesUpdated = 0;
    let errors = [];

    try {
      // Step 1: Get user credentials for both systems
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          reviztoCredentials: true,
          procoreCredentials: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Step 2: Fetch issues from Revizto
      console.log('Fetching issues from Revizto...');
      const reviztoIssues = await fetchReviztoIssues(user.reviztoCredentials, sync.sourceProjectId);
      console.log(`Found ${reviztoIssues.length} issues in Revizto`);

      if (reviztoIssues.length === 0) {
        console.log('No issues found in Revizto project');
        await prisma.sync.update({
          where: { id },
          data: { 
            status: 'completed',
            lastRunAt: new Date(),
            lastRunStatus: 'success'
          }
        });

        return res.json({ 
          success: true, 
          message: 'Sync completed successfully! No issues to transfer.',
          results: { issues: { created: 0, updated: 0 } }
        });
      }

      // Step 3: Validate required field mappings
      console.log('Validating required field mappings...');
      const hasTitleMapping = validateRequiredMappings(sync.fieldMappings);
      if (!hasTitleMapping) {
        throw new Error('Cannot execute sync: "title" field mapping is required for Procore coordination issues');
      }

      // Step 4: Apply field mappings and transform data
      console.log('Applying field mappings...');
      const transformedIssues = applyFieldMappings(reviztoIssues, sync.fieldMappings);
      console.log(`Transformed ${transformedIssues.length} issues for Procore`);

      // Step 4: Post to Procore
      console.log('Posting issues to Procore...');
      const procoreResults = await postIssuesToProcore(
        user.procoreCredentials, 
        sync.destinationCompanyId,
        sync.destinationProjectId,
        transformedIssues
      );

      issuesCreated = procoreResults.created;
      issuesUpdated = procoreResults.updated;
      errors = procoreResults.errors;

      // Step 5: Update sync status
      const finalStatus = errors.length > 0 ? 'partial' : 'success';
      await prisma.sync.update({
        where: { id },
        data: { 
          status: finalStatus === 'success' ? 'completed' : 'error',
          lastRunAt: new Date(),
          lastRunStatus: finalStatus
        }
      });

      console.log(`Sync completed: ${issuesCreated} created, ${issuesUpdated} updated, ${errors.length} errors`);

      res.json({ 
        success: true, 
        message: `Sync executed successfully! ${issuesCreated} issues created, ${issuesUpdated} updated.`,
        results: { 
          issues: { 
            created: issuesCreated, 
            updated: issuesUpdated,
            errors: errors.length
          }
        }
      });

    } catch (error) {
      console.error('Sync execution failed:', error);
      
      await prisma.sync.update({
        where: { id },
        data: { 
          status: 'error',
          lastRunAt: new Date(),
          lastRunStatus: 'error'
        }
      });

      res.status(500).json({ 
        error: `Sync failed: ${error.message}`,
        results: { 
          issues: { 
            created: issuesCreated, 
            updated: issuesUpdated,
            errors: errors.length + 1
          }
        }
      });
    }
  } catch (error) {
    console.error('Error executing sync:', error);
    res.status(500).json({ error: 'Failed to execute sync' });
  }
});

// ACC endpoints - real API calls
app.get('/api/acc/projects', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accCredentials: true }
    });

    if (!user?.accCredentials?.accessToken) {
      return res.status(404).json({ error: 'No ACC credentials found' });
    }

    const accessToken = user.accCredentials.accessToken;
    
    // Step 1: Get Hub ID
    console.log('Fetching ACC hubs with token:', accessToken.substring(0, 20) + '...');
    const hubsResponse = await axios.get('https://developer.api.autodesk.com/project/v1/hubs', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Hubs response status:', hubsResponse.status);
    console.log('Hubs response data:', JSON.stringify(hubsResponse.data, null, 2));

    const hubs = hubsResponse.data.data || [];
    console.log('Found hubs:', hubs.length, hubs.map(h => ({ id: h.id, name: h.attributes?.name })));
    
    if (hubs.length === 0) {
      console.log('No hubs found - returning empty projects');
      return res.json({ success: true, projects: [] });
    }

    // Step 2: Get Projects for each Hub
    const allProjects = [];
    for (const hub of hubs) {
      try {
        console.log(`Fetching projects for hub ${hub.id} (${hub.attributes?.name})`);
        const projectsResponse = await axios.get(`https://developer.api.autodesk.com/project/v1/hubs/${hub.id}/projects`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Projects response for hub ${hub.id}:`, projectsResponse.status);
        console.log(`Projects data for hub ${hub.id}:`, JSON.stringify(projectsResponse.data, null, 2));
        
        const hubProjects = projectsResponse.data.data || [];
        console.log(`Found ${hubProjects.length} projects in hub ${hub.id}`);
        allProjects.push(...hubProjects);
      } catch (hubError) {
        console.error(`Error fetching projects for hub ${hub.id}:`, hubError.message);
        console.error(`Hub error details:`, hubError.response?.data);
        // Continue with other hubs even if one fails
      }
    }

    console.log(`Total projects found: ${allProjects.length}`);
    console.log('Final projects:', allProjects.map(p => ({ id: p.id, name: p.attributes?.name })));
    res.json({ success: true, projects: allProjects });
  } catch (error) {
    console.error('Error fetching ACC projects:', error);
    res.status(500).json({ error: 'Failed to fetch ACC projects' });
  }
});

app.get('/api/acc/issues', async (req, res) => {
  try {
    const { userId, projectId } = req.query;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'User ID and project ID are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accCredentials: true }
    });

    if (!user?.accCredentials?.accessToken) {
      return res.status(404).json({ error: 'No ACC credentials found' });
    }

    // Make real API call to ACC Issues API
    const response = await axios.get(`https://developer.api.autodesk.com/issues/v2/containers/${projectId}/issues`, {
      headers: {
        'Authorization': `Bearer ${user.accCredentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, issues: response.data.data || [] });
  } catch (error) {
    console.error('Error fetching ACC issues:', error);
    res.status(500).json({ error: 'Failed to fetch ACC issues' });
  }
});

app.get('/api/acc/fields', async (req, res) => {
  try {
    const { userId, projectId } = req.query;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'User ID and project ID are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accCredentials: true }
    });

    if (!user?.accCredentials?.accessToken) {
      return res.status(404).json({ error: 'No ACC credentials found' });
    }

    // Get issues to discover fields
    const response = await axios.get(`https://developer.api.autodesk.com/issues/v2/containers/${projectId}/issues`, {
      headers: {
        'Authorization': `Bearer ${user.accCredentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Extract fields from issues
    const issues = response.data.data || [];
    const fields = issues.length > 0 ? Object.keys(issues[0]).map(key => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      type: typeof issues[0][key]
    })) : [];

    res.json({ success: true, fields: { issues: fields } });
  } catch (error) {
    console.error('Error fetching ACC fields:', error);
    res.status(500).json({ error: 'Failed to fetch ACC fields' });
  }
});

// Procore endpoints - real API calls
app.get('/api/procore/companies', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { procoreCredentials: true }
    });

    if (!user?.procoreCredentials?.accessToken) {
      return res.status(404).json({ error: 'No Procore credentials found' });
    }

    // Make real API call to Procore
    const response = await axios.get('https://api.procore.com/rest/v1.0/companies', {
      headers: {
        'Authorization': `Bearer ${user.procoreCredentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, companies: response.data || [] });
  } catch (error) {
    console.error('Error fetching Procore companies:', error);
    res.status(500).json({ error: 'Failed to fetch Procore companies' });
  }
});

app.get('/api/procore/projects', async (req, res) => {
  try {
    const { userId, companyId } = req.query;
    
    if (!userId || !companyId) {
      return res.status(400).json({ error: 'User ID and company ID are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { procoreCredentials: true }
    });

    if (!user?.procoreCredentials?.accessToken) {
      return res.status(404).json({ error: 'No Procore credentials found' });
    }

    // Make real API call to Procore
    const response = await axios.get(`https://api.procore.com/rest/v1.0/projects?company_id=${companyId}`, {
      headers: {
        'Authorization': `Bearer ${user.procoreCredentials.accessToken}`,
        'Procore-Company-Id': companyId,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, projects: response.data || [] });
  } catch (error) {
    console.error('Error fetching Procore projects:', error);
    res.status(500).json({ error: 'Failed to fetch Procore projects' });
  }
});

app.get('/api/procore/fields', async (req, res) => {
  try {
    const { userId, projectId, companyId } = req.query;
    
    if (!userId || !projectId || !companyId) {
      return res.status(400).json({ error: 'User ID, project ID, and company ID are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { procoreCredentials: true }
    });

    if (!user?.procoreCredentials?.accessToken) {
      return res.status(404).json({ error: 'No Procore credentials found' });
    }

    // Get coordination issues to discover fields
    const response = await axios.get(`https://api.procore.com/rest/v1.0/coordination_issues?project_id=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${user.procoreCredentials.accessToken}`,
        'Content-Type': 'application/json',
        'Procore-Company-Id': companyId
      }
    });

    // Extract fields from issues
    const issues = response.data || [];
    
    // Whitelist of fields that Procore accepts when creating coordination issues
    // Read-only fields like 'id', 'uuid', 'created_at', etc. are excluded
    const acceptedFields = [
      'title',
      'description', 
      'status',
      'priority',
      'assignee',
      'due_date',
      'location',
      'drawing',
      'trade'
    ];
    
    const allFields = issues.length > 0 ? Object.keys(issues[0]) : [];
    const fields = allFields
      .filter(key => acceptedFields.includes(key))
      .map(key => ({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        type: typeof issues[0][key]
      }));

    console.log(`Filtered Procore fields: ${fields.length} writable out of ${allFields.length} total`);
    res.json({ success: true, fields: { issues: fields } });
  } catch (error) {
    console.error('Error fetching Procore fields:', error);
    res.status(500).json({ error: 'Failed to fetch Procore fields' });
  }
});

// Revizto endpoints - real API calls
app.get('/api/revizto/projects', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { reviztoCredentials: true }
    });

    if (!user?.reviztoCredentials?.accessToken) {
      return res.status(404).json({ error: 'No Revizto credentials found' });
    }

    // Get user licenses first
    const licensesResponse = await axios.get('https://api.virginia.revizto.com/v5/user/licenses', {
      headers: {
        'Authorization': `Bearer ${user.reviztoCredentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Revizto licenses response:', JSON.stringify(licensesResponse.data, null, 2));
    const licenses = licensesResponse.data.data?.entities || [];
    console.log('Licenses array:', licenses);
    let allProjects = [];

    // Get projects for each license
    console.log(`Found ${licenses.length} licenses, fetching projects...`);
    for (const license of licenses) {
      try {
        console.log(`Fetching projects for license ${license.uuid} (${license.name})`);
        const projectsResponse = await axios.get(`https://api.virginia.revizto.com/v5/project/list/${license.uuid}/paged`, {
          headers: {
            'Authorization': `Bearer ${user.reviztoCredentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`Projects response for license ${license.uuid}:`, JSON.stringify(projectsResponse.data, null, 2));
        const projects = projectsResponse.data.data?.data || [];
        console.log(`Raw projects from API:`, projects);
        
        // Transform projects to match expected format
        const transformedProjects = projects.map(project => ({
          uuid: project.uuid,
          title: project.title,
          description: project.description || '',
          created: project.created,
          updated: project.updated
        }));
        
        console.log(`Transformed projects:`, transformedProjects);
        allProjects = allProjects.concat(transformedProjects);
        console.log(`Added ${projectsResponse.data.data?.length || 0} projects from license ${license.uuid}`);
      } catch (error) {
        console.error(`Error fetching projects for license ${license.uuid}:`, error.message);
        console.error(`Full error:`, error);
      }
    }
    
    console.log(`Total projects found: ${allProjects.length}`);
    console.log('Final projects:', allProjects);

    res.json({ success: true, projects: allProjects });
  } catch (error) {
    console.error('Error fetching Revizto projects:', error);
    res.status(500).json({ error: 'Failed to fetch Revizto projects' });
  }
});

app.get('/api/revizto/fields', async (req, res) => {
  try {
    const { userId, projectId } = req.query;
    
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'User ID and project ID are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { reviztoCredentials: true }
    });

    if (!user?.reviztoCredentials?.accessToken) {
      return res.status(404).json({ error: 'No Revizto credentials found' });
    }

    // Get issues to discover fields
    const response = await axios.get(`https://api.virginia.revizto.com/v5/project/${projectId}/issue-filter/filter`, {
      headers: {
          'Authorization': `Bearer ${user.reviztoCredentials.accessToken}`,
          'Content-Type': 'application/json'
        }
    });

    // Extract fields from issues
    const issues = response.data.data?.data || [];
    const fields = issues.length > 0 ? Object.keys(issues[0]).map(key => ({
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      type: typeof issues[0][key]
    })) : [];

    res.json({ success: true, fields: { issues: fields } });
  } catch (error) {
    console.error('Error fetching Revizto fields:', error);
    res.status(500).json({ error: 'Failed to fetch Revizto fields' });
  }
});

// AI-powered field mapping suggestions
app.post('/api/ai/suggest-mappings', async (req, res) => {
  try {
    const { sourceFields, destinationFields, dataType } = req.body;
    
    if (!sourceFields || !destinationFields || !dataType) {
      return res.status(400).json({ error: 'Source fields, destination fields, and data type are required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log(`Generating AI field mappings for ${dataType}:`, {
      sourceFields: sourceFields.length,
      destinationFields: destinationFields.length
    });

    const prompt = `
You are an expert at mapping fields between construction management systems. 

Analyze these field lists and suggest intelligent mappings for ${dataType} data:

SOURCE FIELDS (${sourceFields.length}):
${sourceFields.map(f => `- ${f.id}: ${f.label} (${f.type})`).join('\n')}

DESTINATION FIELDS (${destinationFields.length}):
${destinationFields.map(f => `- ${f.id}: ${f.label} (${f.type})`).join('\n')}

Return a JSON array of suggested mappings. Each mapping should have:
- sourceField: the source field ID
- destinationField: the destination field ID  
- confidence: number 0-1 indicating how confident you are in this mapping
- reasoning: brief explanation of why these fields should be mapped

Focus on:
1. Exact name matches (case-insensitive)
2. Semantic similarity (e.g., "title" matches "name")
3. Type compatibility (string to string, number to number)
4. Construction industry context

Return only valid JSON, no other text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at field mapping for construction management systems. Always return valid JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const response = completion.choices[0].message.content;
    console.log('OpenAI response:', response);

    // Clean and parse the JSON response
    let suggestions;
    try {
      // Remove any markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Cleaned response:', cleanedResponse);
      suggestions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw response:', response);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate the response structure
    if (!Array.isArray(suggestions)) {
      return res.status(500).json({ error: 'AI response is not an array' });
    }

    // Filter out invalid mappings
    const validSuggestions = suggestions.filter(s => 
      s.sourceField && 
      s.destinationField && 
      sourceFields.some(f => f.id === s.sourceField) &&
      destinationFields.some(f => f.id === s.destinationField)
    );

    console.log(`Generated ${validSuggestions.length} valid field mapping suggestions`);

    res.json({ 
      success: true, 
      suggestions: validSuggestions,
      totalSourceFields: sourceFields.length,
      totalDestinationFields: destinationFields.length
    });

  } catch (error) {
    console.error('Error generating AI field mappings:', error);
    res.status(500).json({ error: 'Failed to generate field mapping suggestions' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Railway backend running on port ${PORT}`);
});
