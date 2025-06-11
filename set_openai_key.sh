#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <your_openai_api_key>"
    echo "Example: $0 sk-1234567890abcdef..."
    exit 1
fi

API_KEY="$1"

# Validate API key format
if [[ ! $API_KEY =~ ^sk-[a-zA-Z0-9]{32,}$ ]]; then
    echo "Error: Invalid API key format. API key should start with 'sk-' and be at least 35 characters long."
    exit 1
fi

# Create backup
cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)

# Update the .env file
sed -i.bak "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$API_KEY/" backend/.env

# Verify the update
if grep -q "OPENAI_API_KEY=$API_KEY" backend/.env; then
    echo "✅ OpenAI API key updated successfully!"
    echo "🔄 Restarting backend container..."
    docker-compose restart backend
    echo "✅ Backend restarted. You can now try the repository analysis again."
else
    echo "❌ Failed to update API key."
    exit 1
fi 