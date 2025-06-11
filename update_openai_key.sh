#!/bin/bash

echo "OpenAI API Key Update Script"
echo "============================"
echo ""
echo "This script will update your OpenAI API key in the backend/.env file."
echo ""

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env file not found!"
    exit 1
fi

# Prompt for API key
echo -n "Enter your OpenAI API key (starts with 'sk-'): "
read -s OPENAI_API_KEY
echo ""

# Validate API key format
if [[ ! $OPENAI_API_KEY =~ ^sk-[a-zA-Z0-9]{32,}$ ]]; then
    echo "Error: Invalid API key format. API key should start with 'sk-' and be at least 35 characters long."
    exit 1
fi

# Create backup
cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)

# Update the .env file
sed -i.bak "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_API_KEY/" backend/.env

# Verify the update
if grep -q "OPENAI_API_KEY=$OPENAI_API_KEY" backend/.env; then
    echo "✅ OpenAI API key updated successfully!"
    echo "📁 Backup created: backend/.env.backup.*"
    echo ""
    echo "🔄 Restarting backend container..."
    docker-compose restart backend
    echo ""
    echo "✅ Backend restarted. You can now try the repository analysis again."
else
    echo "❌ Failed to update API key. Please check the backend/.env file manually."
    exit 1
fi 