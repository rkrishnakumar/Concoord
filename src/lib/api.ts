// API configuration for Railway backend
const RAILWAY_BACKEND_URL = 'https://concoord-production.up.railway.app';

export const api = {
  // Health check
  health: () => fetch(`${RAILWAY_BACKEND_URL}/api/health`),
  
  // Database operations
  testDb: () => fetch(`${RAILWAY_BACKEND_URL}/api/test-db`),
  setupDb: () => fetch(`${RAILWAY_BACKEND_URL}/api/setup-db`, { method: 'POST' }),
  
  // User operations
  signup: (data: { name: string; email: string; password: string }) =>
    fetch(`${RAILWAY_BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  
  // OAuth operations
  connectAcc: () => fetch(`${RAILWAY_BACKEND_URL}/api/auth/acc/connect`),
  connectProcore: () => fetch(`${RAILWAY_BACKEND_URL}/api/auth/procore/connect`),
  connectRevizto: () => fetch(`${RAILWAY_BACKEND_URL}/api/auth/revizto/connect`),
  
  // Project operations
  getAccProjects: () => fetch(`${RAILWAY_BACKEND_URL}/api/acc/projects`),
  getProcoreCompanies: () => fetch(`${RAILWAY_BACKEND_URL}/api/procore/companies`),
  getProcoreProjects: (companyId: string) => 
    fetch(`${RAILWAY_BACKEND_URL}/api/procore/projects?companyId=${companyId}`),
  getReviztoProjects: () => fetch(`${RAILWAY_BACKEND_URL}/api/revizto/projects`),
  
  // Sync operations
  getSyncs: () => fetch(`${RAILWAY_BACKEND_URL}/api/syncs`),
  createSync: (data: any) => 
    fetch(`${RAILWAY_BACKEND_URL}/api/syncs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  executeSync: (id: string) => 
    fetch(`${RAILWAY_BACKEND_URL}/api/syncs/${id}/execute`, { method: 'POST' })
};
