# GitHub OAuth Setup with ngrok

This guide explains how to configure GitHub OAuth for Deploy.AI when running locally with ngrok.

## 🚀 Quick Setup

### 1. Start Your Application
```bash
# Start all services
docker-compose up -d

# Or start manually
npm run dev
```

### 2. Start ngrok Tunnel
```bash
# Tunnel to your backend (port 3005)
ngrok http 3005
```

You'll see output like:
```
Session Status                online
Account                       your-account
Version                       3.22.1
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3005
```

**Important**: Copy the `https://abc123.ngrok.io` URL - this is your ngrok URL.

### 3. Configure GitHub OAuth App

Go to your GitHub OAuth App settings:
https://github.com/settings/developers

Update these fields:

#### **Homepage URL**
```
https://abc123.ngrok.io
```

#### **Authorization callback URL**
```
https://abc123.ngrok.io/api/auth/github/callback
```

Replace `abc123.ngrok.io` with your actual ngrok URL.

### 4. Update Environment Variables

Create or update your `.env` file:

```bash
# Your existing GitHub OAuth credentials
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Update callback URL to match ngrok
GITHUB_CALLBACK_URL=https://abc123.ngrok.io/api/auth/github/callback

# Update frontend URL if needed
REACT_APP_API_URL=https://abc123.ngrok.io
```

### 5. Restart Your Application
```bash
# If using Docker
docker-compose restart

# If running manually
npm run dev
```

## 🔧 Advanced Configuration

### Multiple ngrok Tunnels (Frontend + Backend)

If you want separate tunnels for frontend and backend:

#### Terminal 1 - Backend Tunnel
```bash
ngrok http 3005 --subdomain=deployai-api
```

#### Terminal 2 - Frontend Tunnel
```bash
ngrok http 3004 --subdomain=deployai-app
```

#### GitHub OAuth Configuration
- **Homepage URL**: `https://deployai-app.ngrok.io`
- **Callback URL**: `https://deployai-api.ngrok.io/api/auth/github/callback`

#### Environment Variables
```bash
GITHUB_CALLBACK_URL=https://deployai-api.ngrok.io/api/auth/github/callback
REACT_APP_API_URL=https://deployai-api.ngrok.io
```

### Using ngrok Config File

Create `~/.ngrok2/ngrok.yml`:

```yaml
authtoken: your_ngrok_authtoken
tunnels:
  deployai-backend:
    proto: http
    addr: 3005
    subdomain: deployai-api
  deployai-frontend:
    proto: http
    addr: 3004
    subdomain: deployai-app
```

Start both tunnels:
```bash
ngrok start deployai-backend deployai-frontend
```

## 🛠️ Development Workflow

### Daily Setup Process
1. **Start ngrok**: `ngrok http 3005`
2. **Copy URL**: Note the ngrok URL (e.g., `https://abc123.ngrok.io`)
3. **Update GitHub**: Only if ngrok URL changed
4. **Update .env**: Only if ngrok URL changed
5. **Start app**: `docker-compose up -d`

### When ngrok URL Changes

The free ngrok plan generates random URLs. When the URL changes:

1. **Update GitHub OAuth App**:
   - Homepage URL: `https://new-url.ngrok.io`
   - Callback URL: `https://new-url.ngrok.io/api/auth/github/callback`

2. **Update .env file**:
   ```bash
   GITHUB_CALLBACK_URL=https://new-url.ngrok.io/api/auth/github/callback
   REACT_APP_API_URL=https://new-url.ngrok.io
   ```

3. **Restart application**:
   ```bash
   docker-compose restart
   ```

## 🎯 Pro Tips

### 1. Fixed Subdomain (ngrok Pro)
With ngrok Pro, you can use fixed subdomains:
```bash
ngrok http 3005 --subdomain=deployai
# Always gives you: https://deployai.ngrok.io
```

### 2. Environment Switching Script

Create `scripts/ngrok-setup.sh`:
```bash
#!/bin/bash

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok\.io')

echo "🌐 ngrok URL: $NGROK_URL"

# Update .env file
sed -i "s|GITHUB_CALLBACK_URL=.*|GITHUB_CALLBACK_URL=$NGROK_URL/api/auth/github/callback|" .env
sed -i "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$NGROK_URL|" .env

echo "✅ Environment variables updated"
echo "⚠️  Remember to update GitHub OAuth App:"
echo "   - Homepage URL: $NGROK_URL"
echo "   - Callback URL: $NGROK_URL/api/auth/github/callback"
```

### 3. Auto-restart on URL Change

Create `scripts/watch-ngrok.js`:
```javascript
const axios = require('axios');
const { execSync } = require('child_process');

let lastUrl = '';

setInterval(async () => {
  try {
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const currentUrl = response.data.tunnels[0]?.public_url;
    
    if (currentUrl && currentUrl !== lastUrl) {
      console.log(`🔄 ngrok URL changed: ${currentUrl}`);
      lastUrl = currentUrl;
      
      // Update .env and restart
      execSync(`./scripts/ngrok-setup.sh`);
      execSync(`docker-compose restart`);
    }
  } catch (error) {
    console.log('⚠️  ngrok not running or not accessible');
  }
}, 5000);
```

## 📋 Troubleshooting

### Issue: "Callback URL mismatch"
- **Cause**: GitHub OAuth callback URL doesn't match your ngrok URL
- **Fix**: Update GitHub OAuth App callback URL to match ngrok

### Issue: "CORS errors"
- **Cause**: Frontend trying to call backend with wrong URL
- **Fix**: Update `REACT_APP_API_URL` in .env to ngrok URL

### Issue: "Cannot connect to localhost"
- **Cause**: External services trying to reach localhost instead of ngrok
- **Fix**: Ensure all external references use ngrok URL

### Issue: "SSL certificate errors"
- **Cause**: ngrok uses different SSL certificates
- **Fix**: This is normal, ngrok handles SSL termination

## 🔐 Security Notes

1. **Never commit ngrok URLs** to git - they change frequently
2. **Use environment variables** for all URLs
3. **Restrict GitHub OAuth scope** to minimum required
4. **Monitor ngrok web interface** at http://localhost:4040
5. **Consider ngrok Pro** for production-like testing with fixed domains

## 📱 Testing OAuth Flow

1. **Visit your app**: `https://abc123.ngrok.io` (your ngrok URL)
2. **Click "Login with GitHub"**
3. **Should redirect** to GitHub OAuth
4. **After authorization**, should redirect back to your app
5. **Check ngrok logs** at http://localhost:4040 for request details

## ✅ Verification Checklist

- [ ] ngrok tunnel running (`ngrok http 3005`)
- [ ] GitHub OAuth Homepage URL updated to ngrok URL
- [ ] GitHub OAuth Callback URL updated to ngrok URL + `/api/auth/github/callback`
- [ ] `.env` file updated with ngrok URLs
- [ ] Application restarted after .env changes
- [ ] Can access app via ngrok URL
- [ ] OAuth login works end-to-end

Your Deploy.AI app should now work perfectly with GitHub OAuth through ngrok! 🚀 