# DeployAI Local Development Setup

## Quick Start

We've created automated scripts to streamline your local development experience with ngrok and GitHub OAuth integration.

### Prerequisites

Make sure you have the following installed:
- ✅ **Docker & Docker Compose** - For running the application containers
- ✅ **ngrok** - For exposing your local server to the internet ([Download here](https://ngrok.com/download))
- ✅ **GitHub CLI** - For automatically updating OAuth settings ([Install guide](https://cli.github.com/))

### Setup Scripts

We provide scripts for both Windows (PowerShell) and Linux/Mac (Bash):

#### For Windows (PowerShell)
```powershell
.\start_local.ps1
```

#### For Linux/Mac (Bash)
```bash
./start_local.sh
```

### What the Scripts Do

1. **🔍 Check Prerequisites** - Verifies all required tools are installed
2. **🔄 Kill Existing ngrok** - Stops any running ngrok processes
3. **🌐 Start ngrok Tunnel** - Starts ngrok on port 3004 with your configuration
4. **📝 Update Backend Config** - Automatically updates `backend/.env` with the new ngrok URL
5. **🔧 Update GitHub OAuth** - Uses GitHub CLI to update your OAuth app settings
6. **🐳 Restart Containers** - Restarts backend and ensures frontend is running
7. **✅ Show Summary** - Displays all the important URLs and information

### First Time Setup

1. **Authenticate with GitHub CLI** (one-time setup):
   ```bash
   gh auth login
   ```

2. **Ensure your GitHub OAuth app exists** with any temporary URLs (the script will update them)

3. **Run the script**:
   ```powershell
   # Windows
   .\start_local.ps1
   
   # Linux/Mac  
   ./start_local.sh
   ```

### What You'll See

```
🚀 Starting DeployAI Local Development Environment
=================================================
📋 Checking prerequisites...
✅ All prerequisites are available
🔄 Stopping any existing ngrok processes...
🌐 Starting ngrok tunnel...
⏳ Waiting for ngrok to initialize...
✅ Ngrok tunnel established: https://abc123.ngrok-free.app
📝 Updating backend .env file...
  ✅ Updated GITHUB_CALLBACK_URL to: https://abc123.ngrok-free.app/api/auth/github/callback
  ✅ Updated CORS_ORIGIN to: https://abc123.ngrok-free.app
✅ Backend .env file updated successfully
🔧 Updating GitHub OAuth App settings...
  📝 Updating OAuth App with Client ID: Iv23liQmHNmFhABnuCDz
  ✅ GitHub OAuth App updated successfully
    📍 Homepage URL: https://abc123.ngrok-free.app
    📍 Callback URL: https://abc123.ngrok-free.app/api/auth/github/callback
🔄 Restarting backend container...
✅ Backend container restarted successfully
🔄 Starting frontend container...

🎉 Local Development Environment Ready!
===============================================
📱 Frontend URL: https://abc123.ngrok-free.app
🔧 Backend API: https://abc123.ngrok-free.app/api
📊 Ngrok Dashboard: http://localhost:4040

🔑 GitHub OAuth Configuration:
   📍 Homepage URL: https://abc123.ngrok-free.app
   📍 Callback URL: https://abc123.ngrok-free.app/api/auth/github/callback

🚀 Your DeployAI application is now accessible at: https://abc123.ngrok-free.app
```

### Manual Fallback

If the GitHub CLI automatic update fails, the script will show you the URLs to manually update in your GitHub OAuth app settings:

Go to: `https://github.com/settings/applications/[your-client-id]`

### Stopping the Environment

To stop everything:
```bash
docker-compose down && pkill ngrok
```

Or on Windows:
```powershell
docker-compose down; Get-Process -Name "ngrok" | Stop-Process -Force
```

### Troubleshooting

#### "GitHub CLI not authenticated"
```bash
gh auth login
```

#### "ngrok command not found"
- Install ngrok from [ngrok.com/download](https://ngrok.com/download)
- Make sure it's in your PATH

#### "Docker not found"
- Install Docker Desktop
- Make sure Docker is running

#### "Backend .env file not found"
- Ensure you have `backend/.env` with your GitHub credentials
- Check the file exists: `ls backend/.env`

### Development Workflow

1. Run the start script once: `.\start_local.ps1`
2. Develop your application - the ngrok URL stays consistent
3. When you're done: `docker-compose down && pkill ngrok`
4. Next time, just run the script again for a fresh environment

The beauty of this setup is that **you only need to run one command** and everything is configured automatically! 🎉 