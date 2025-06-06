#!/usr/bin/env pwsh

Write-Host "Starting DeployAI Local Development Environment" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "ngrok")) {
    Write-Host "ERROR: ngrok is not installed. Please install ngrok and try again." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "gh")) {
    Write-Host "ERROR: GitHub CLI is not installed. Please install gh and try again." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "docker")) {
    Write-Host "ERROR: Docker is not installed. Please install Docker and try again." -ForegroundColor Red
    exit 1
}

Write-Host "All prerequisites are available" -ForegroundColor Green

# Kill any existing ngrok processes
Write-Host "Stopping any existing ngrok processes..." -ForegroundColor Yellow
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force

# Start ngrok in background
Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
Start-Process -FilePath "ngrok" -ArgumentList "http", "3004", "--config", "ngrok.yml" -WindowStyle Hidden

# Wait for ngrok to start
Write-Host "Waiting for ngrok to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Get ngrok URL
$maxRetries = 10
$retryCount = 0
$ngrokUrl = $null

do {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get
        $ngrokUrl = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
        if ($ngrokUrl) {
            break
        }
    }
    catch {
        Write-Host "Retrying to get ngrok URL... ($retryCount/$maxRetries)" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 2
    $retryCount++
} while ($retryCount -lt $maxRetries)

if (-not $ngrokUrl) {
    Write-Host "ERROR: Failed to get ngrok URL after $maxRetries attempts" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: Ngrok tunnel established: $ngrokUrl" -ForegroundColor Green

# Update backend .env file
Write-Host "Updating backend .env file..." -ForegroundColor Yellow

$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: Backend .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

# Read the .env file
$envContent = Get-Content $envFile

# Update the callback URL and CORS origin
$newCallbackUrl = "$ngrokUrl/api/auth/github/callback"
$updatedContent = @()

foreach ($line in $envContent) {
    if ($line -match "^GITHUB_CALLBACK_URL=") {
        $updatedContent += "GITHUB_CALLBACK_URL=$newCallbackUrl"
        Write-Host "  SUCCESS: Updated GITHUB_CALLBACK_URL to: $newCallbackUrl" -ForegroundColor Green
    }
    elseif ($line -match "^CORS_ORIGIN=") {
        $updatedContent += "CORS_ORIGIN=$ngrokUrl"
        Write-Host "  SUCCESS: Updated CORS_ORIGIN to: $ngrokUrl" -ForegroundColor Green
    }
    else {
        $updatedContent += $line
    }
}

# Write back to .env file
$updatedContent | Set-Content $envFile
Write-Host " Backend .env file updated successfully" -ForegroundColor Green

# Get GitHub Client ID from .env file
$githubClientId = ($envContent | Where-Object { $_ -match "^GITHUB_CLIENT_ID=" }) -replace "GITHUB_CLIENT_ID=", ""

if (-not $githubClientId) {
    Write-Host " GITHUB_CLIENT_ID not found in .env file" -ForegroundColor Red
    exit 1
}

# Update GitHub OAuth App settings
Write-Host " Updating GitHub OAuth App settings..." -ForegroundColor Yellow

try {
    # Check if user is authenticated with GitHub CLI
    $ghUser = gh auth status 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Please authenticate with GitHub CLI first: gh auth login" -ForegroundColor Red
        exit 1
    }

    # Update OAuth App
    Write-Host "   Updating OAuth App with Client ID: $githubClientId" -ForegroundColor Cyan
    
    # GitHub CLI doesn't have direct OAuth app update commands, so we'll use the REST API
    $updateData = @{
        name = "Deploy.AI"
        url = $ngrokUrl
        callback_url = $newCallbackUrl
    } | ConvertTo-Json

    # Use GitHub CLI to make the API call
    $result = echo $updateData | gh api -X PATCH "/applications/$githubClientId" --input - 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   GitHub OAuth App updated successfully" -ForegroundColor Green
        Write-Host "     Homepage URL: $ngrokUrl" -ForegroundColor Cyan
        Write-Host "     Callback URL: $newCallbackUrl" -ForegroundColor Cyan
    } else {
        Write-Host "   Could not update GitHub OAuth App automatically" -ForegroundColor Yellow
        Write-Host "    Please manually update your GitHub OAuth App settings:" -ForegroundColor Yellow
        Write-Host "     Homepage URL: $ngrokUrl" -ForegroundColor Cyan
        Write-Host "     Callback URL: $newCallbackUrl" -ForegroundColor Cyan
        Write-Host "     Go to: https://github.com/settings/applications/$githubClientId" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "   Could not update GitHub OAuth App automatically: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    Please manually update your GitHub OAuth App settings:" -ForegroundColor Yellow
    Write-Host "     Homepage URL: $ngrokUrl" -ForegroundColor Cyan
    Write-Host "     Callback URL: $newCallbackUrl" -ForegroundColor Cyan
}

# Restart backend container with full reload of environment
Write-Host " Restarting backend container..." -ForegroundColor Yellow
docker-compose down backend
docker-compose up -d backend

if ($LASTEXITCODE -eq 0) {
    Write-Host " Backend container restarted successfully" -ForegroundColor Green
} else {
    Write-Host " Failed to restart backend container" -ForegroundColor Red
}

# Start frontend if not running
Write-Host " Starting frontend container..." -ForegroundColor Yellow
docker-compose up frontend -d

# Display summary
Write-Host "" -ForegroundColor White
Write-Host " Local Development Environment Ready!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host " Frontend URL: $ngrokUrl" -ForegroundColor Cyan
Write-Host " Backend API: $ngrokUrl/api" -ForegroundColor Cyan
Write-Host " Ngrok Dashboard: http://localhost:4040" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "GitHub OAuth Configuration:" -ForegroundColor Yellow
Write-Host "   Homepage URL: $ngrokUrl" -ForegroundColor Cyan
Write-Host "   Callback URL: $newCallbackUrl" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Your DeployAI application is now accessible at: $ngrokUrl" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "To stop the environment, press Ctrl+C or run: docker-compose down" -ForegroundColor Gray 
