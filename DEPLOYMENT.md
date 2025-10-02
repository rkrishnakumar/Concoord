# Deployment Guide

## Railway Backend Deployment

### 1. Environment Variables for Railway

Set these in your Railway dashboard:

```bash
# Database (PostgreSQL - Railway will provide this)
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_URL="https://your-railway-app.railway.app"
NEXTAUTH_SECRET="your-nextauth-secret"

# API Credentials
AUTODESK_CLIENT_ID="your_autodesk_client_id"
AUTODESK_CLIENT_SECRET="your_autodesk_client_secret"
PROCORE_CLIENT_ID="your_procore_client_id"
PROCORE_CLIENT_SECRET="your_procore_client_secret"
```

### 2. OAuth Callback URLs

Update these in your OAuth provider dashboards:

**Autodesk:**
- Callback URL: `https://your-railway-app.railway.app/api/auth/acc/callback`

**Procore:**
- Callback URL: `https://your-railway-app.railway.app/api/auth/procore/callback`

**NextAuth:**
- Callback URL: `https://your-railway-app.railway.app/api/auth/callback`

### 3. Database Migration

After deployment, run:
```bash
npx prisma migrate deploy
```

## Firebase Frontend Deployment

### 1. Environment Variables for Firebase

Set these in your Firebase project:

```bash
# Backend API URL
NEXT_PUBLIC_API_BASE_URL="https://your-railway-app.railway.app"

# NextAuth URL (same as backend)
NEXT_PUBLIC_NEXTAUTH_URL="https://your-railway-app.railway.app"
```

### 2. Firebase Hosting Configuration

Create `firebase.json`:
```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://your-railway-app.railway.app/api/**"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Deployment Steps

1. **Deploy Backend to Railway:**
   - Connect GitHub repo to Railway
   - Set environment variables
   - Deploy and get Railway URL

2. **Update OAuth Callbacks:**
   - Update Autodesk/Procore OAuth settings with Railway URL

3. **Deploy Frontend to Firebase:**
   - Set environment variables with Railway URL
   - Build and deploy to Firebase Hosting

4. **Test Production:**
   - Test OAuth flows
   - Test API endpoints
   - Test sync creation and execution
