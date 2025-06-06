#!/bin/bash

set -e

echo "🚀 Starting DeployAI Local Development Environment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists ngrok; then
    echo -e "${RED}❌ ngrok is not installed. Please install ngrok and try again.${NC}"
    exit 1
fi

if ! command_exists gh; then
    echo -e "${RED}❌ GitHub CLI is not installed. Please install gh and try again.${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are available${NC}"

# Kill any existing ngrok processes
echo -e "${YELLOW}🔄 Stopping any existing ngrok processes...${NC}"
pkill ngrok 2>/dev/null || true

# Start ngrok in background
echo -e "${YELLOW}🌐 Starting ngrok tunnel...${NC}"
ngrok http 3004 --config ngrok.yml > /dev/null 2>&1 &

# Wait for ngrok to start
echo -e "${YELLOW}⏳ Waiting for ngrok to initialize...${NC}"
sleep 5

# Get ngrok URL
max_retries=10
retry_count=0
ngrok_url=""

while [ $retry_count -lt $max_retries ]; do
    if ngrok_url=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto=="https") | .public_url' 2>/dev/null); then
        if [ -n "$ngrok_url" ] && [ "$ngrok_url" != "null" ]; then
            break
        fi
    fi
    
    echo -e "${YELLOW}⏳ Retrying to get ngrok URL... ($retry_count/$max_retries)${NC}"
    sleep 2
    ((retry_count++))
done

if [ -z "$ngrok_url" ] || [ "$ngrok_url" = "null" ]; then
    echo -e "${RED}❌ Failed to get ngrok URL after $max_retries attempts${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ngrok tunnel established: $ngrok_url${NC}"

# Update backend .env file
echo -e "${YELLOW}📝 Updating backend .env file...${NC}"

env_file="backend/.env"
if [ ! -f "$env_file" ]; then
    echo -e "${RED}❌ Backend .env file not found at $env_file${NC}"
    exit 1
fi

# Update the callback URL and CORS origin
new_callback_url="$ngrok_url/api/auth/github/callback"

# Create a temporary file for the updated content
temp_file=$(mktemp)

while IFS= read -r line; do
    if [[ $line =~ ^GITHUB_CALLBACK_URL= ]]; then
        echo "GITHUB_CALLBACK_URL=$new_callback_url" >> "$temp_file"
        echo -e "  ${GREEN}✅ Updated GITHUB_CALLBACK_URL to: $new_callback_url${NC}"
    elif [[ $line =~ ^CORS_ORIGIN= ]]; then
        echo "CORS_ORIGIN=$ngrok_url" >> "$temp_file"
        echo -e "  ${GREEN}✅ Updated CORS_ORIGIN to: $ngrok_url${NC}"
    else
        echo "$line" >> "$temp_file"
    fi
done < "$env_file"

# Replace the original file
mv "$temp_file" "$env_file"
echo -e "${GREEN}✅ Backend .env file updated successfully${NC}"

# Get GitHub Client ID from .env file
github_client_id=$(grep "^GITHUB_CLIENT_ID=" "$env_file" | cut -d'=' -f2)

if [ -z "$github_client_id" ]; then
    echo -e "${RED}❌ GITHUB_CLIENT_ID not found in .env file${NC}"
    exit 1
fi

# Update GitHub OAuth App settings
echo -e "${YELLOW}🔧 Updating GitHub OAuth App settings...${NC}"

# Check if user is authenticated with GitHub CLI
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}❌ Please authenticate with GitHub CLI first: gh auth login${NC}"
    exit 1
fi

# Update OAuth App
echo -e "${CYAN}  📝 Updating OAuth App with Client ID: $github_client_id${NC}"

# Create JSON data for the update
update_data=$(cat <<EOF
{
  "name": "Deploy.AI",
  "url": "$ngrok_url",
  "callback_url": "$new_callback_url"
}
EOF
)

# Use GitHub CLI to make the API call
if echo "$update_data" | gh api -X PATCH "/applications/$github_client_id" --input - >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ GitHub OAuth App updated successfully${NC}"
    echo -e "    ${CYAN}📍 Homepage URL: $ngrok_url${NC}"
    echo -e "    ${CYAN}📍 Callback URL: $new_callback_url${NC}"
else
    echo -e "  ${YELLOW}⚠️ Could not update GitHub OAuth App automatically${NC}"
    echo -e "    ${YELLOW}Please manually update your GitHub OAuth App settings:${NC}"
    echo -e "    ${CYAN}📍 Homepage URL: $ngrok_url${NC}"
    echo -e "    ${CYAN}📍 Callback URL: $new_callback_url${NC}"
    echo -e "    ${CYAN}🔗 Go to: https://github.com/settings/applications/$github_client_id${NC}"
fi

# Restart backend container
echo -e "${YELLOW}🔄 Restarting backend container...${NC}"
if docker-compose restart backend >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend container restarted successfully${NC}"
else
    echo -e "${RED}❌ Failed to restart backend container${NC}"
fi

# Start frontend if not running
echo -e "${YELLOW}🔄 Starting frontend container...${NC}"
docker-compose up frontend -d >/dev/null 2>&1

# Display summary
echo ""
echo -e "${GREEN}🎉 Local Development Environment Ready!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo -e "${CYAN}📱 Frontend URL: $ngrok_url${NC}"
echo -e "${CYAN}🔧 Backend API: $ngrok_url/api${NC}"
echo -e "${CYAN}📊 Ngrok Dashboard: http://localhost:4040${NC}"
echo ""
echo -e "${YELLOW}🔑 GitHub OAuth Configuration:${NC}"
echo -e "   ${CYAN}📍 Homepage URL: $ngrok_url${NC}"
echo -e "   ${CYAN}📍 Callback URL: $new_callback_url${NC}"
echo ""
echo -e "${GREEN}🚀 Your DeployAI application is now accessible at: $ngrok_url${NC}"
echo ""
echo -e "To stop the environment, press Ctrl+C or run: docker-compose down && pkill ngrok" 