# GitHub OAuth Setup for Deploy.AI

## Problem Solved
The "Continue with GitHub" button was redirecting to a dead route because:
1. ✅ **Fixed**: Frontend was using relative path `/api/auth/github` instead of full backend URL
2. ✅ **Fixed**: Backend health check was using wrong path
3. ✅ **Fixed**: Missing GitHub OAuth environment variables in docker-compose
4. ⚠️ **Still needed**: Actual GitHub OAuth App configuration

## What Was Fixed

### 1. Frontend OAuth Redirect
**Before:**
```javascript
window.location.href = '/api/auth/github';  // Relative path - WRONG
```

**After:**
```javascript
const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3005';
window.location.href = `${backendUrl}/api/auth/github`;  // Full URL - CORRECT
```

### 2. Backend Environment Variables
Added to `docker-compose.yml`:
```yaml
environment:
  - JWT_SECRET=deploy-ai-super-secret-jwt-key-change-in-production
  - JWT_EXPIRES_IN=7d
  - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-your_github_client_id}
  - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-your_github_client_secret}
  - GITHUB_CALLBACK_URL=http://localhost:3005/api/auth/github/callback
```

### 3. Health Check Fix
Fixed `backend/healthcheck.js` to use `/health` instead of `/api/health`

## Next Steps: Set Up GitHub OAuth App

To complete the setup, you need to create a GitHub OAuth App:

### 1. Create GitHub OAuth App
1. Go to GitHub.com → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Deploy.AI Local
   - **Homepage URL**: `http://localhost:3004`
   - **Authorization callback URL**: `http://localhost:3005/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Set Environment Variables
Create a `.env` file in the project root:
```bash
GITHUB_CLIENT_ID=your_actual_github_client_id
GITHUB_CLIENT_SECRET=your_actual_github_client_secret
```

### 3. Restart with Real Credentials
```bash
docker-compose down
export GITHUB_CLIENT_ID=your_actual_client_id
export GITHUB_CLIENT_SECRET=your_actual_client_secret
docker-compose up -d
```

## Testing the Fix

1. **Frontend**: http://localhost:3004
2. **Backend Health**: http://localhost:3005/health
3. **GitHub OAuth**: http://localhost:3005/api/auth/github (should redirect to GitHub)

## Current Status
- ✅ All containers running and healthy
- ✅ Frontend redirects to correct backend URL
- ✅ Backend has proper OAuth route configuration
- ⚠️ Needs actual GitHub OAuth credentials to complete authentication flow

Without real GitHub OAuth credentials, the button will redirect but GitHub will reject the request because the client ID is not valid. 