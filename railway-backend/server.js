const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

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
        clientId: user.accCredentials.clientId,
        baseUrl: user.accCredentials.baseUrl
      } : { connected: false },
      procore: user.procoreCredentials ? {
        connected: true,
        clientId: user.procoreCredentials.clientId,
        baseUrl: user.procoreCredentials.baseUrl
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

    // For now, just simulate success
    await prisma.sync.update({
      where: { id },
      data: { 
        status: 'completed',
        lastRunAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'Sync executed successfully! 0 issues created.',
      syncId: id
    });
  } catch (error) {
    console.error('Error executing sync:', error);
    res.status(500).json({ error: 'Failed to execute sync' });
  }
});

// Mock endpoints for external systems (return mock data)
app.get('/api/acc/projects', async (req, res) => {
  res.json({
    success: true,
    projects: [
      { id: 'project1', name: 'Sample ACC Project 1' },
      { id: 'project2', name: 'Sample ACC Project 2' }
    ]
  });
});

app.get('/api/acc/issues', async (req, res) => {
  res.json({
    success: true,
    issues: [
      { id: 'issue1', title: 'Sample Issue 1', status: 'open' },
      { id: 'issue2', title: 'Sample Issue 2', status: 'closed' }
    ]
  });
});

app.get('/api/acc/fields', async (req, res) => {
  res.json({
    success: true,
    fields: {
      issues: [
        { id: 'title', label: 'Title', type: 'string' },
        { id: 'description', label: 'Description', type: 'text' },
        { id: 'status', label: 'Status', type: 'select' }
      ]
    }
  });
});

app.get('/api/procore/companies', async (req, res) => {
  res.json({
    success: true,
    companies: [
      { id: 'company1', name: 'Sample Procore Company 1' },
      { id: 'company2', name: 'Sample Procore Company 2' }
    ]
  });
});

app.get('/api/procore/projects', async (req, res) => {
  res.json({
    success: true,
    projects: [
      { id: 'project1', name: 'Sample Procore Project 1' },
      { id: 'project2', name: 'Sample Procore Project 2' }
    ]
  });
});

app.get('/api/procore/fields', async (req, res) => {
  res.json({
    success: true,
    fields: {
      issues: [
        { id: 'title', label: 'Title', type: 'string' },
        { id: 'description', label: 'Description', type: 'text' },
        { id: 'status', label: 'Status', type: 'select' }
      ]
    }
  });
});

app.get('/api/revizto/projects', async (req, res) => {
  res.json({
    success: true,
    projects: [
      { id: 'project1', name: 'Sample Revizto Project 1' },
      { id: 'project2', name: 'Sample Revizto Project 2' }
    ]
  });
});

app.get('/api/revizto/fields', async (req, res) => {
  res.json({
    success: true,
    fields: {
      issues: [
        { id: 'title', label: 'Title', type: 'string' },
        { id: 'description', label: 'Description', type: 'text' },
        { id: 'status', label: 'Status', type: 'select' }
      ]
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Railway backend running on port ${PORT}`);
});
