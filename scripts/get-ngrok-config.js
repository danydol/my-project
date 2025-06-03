#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getNgrokConfig() {
  try {
    console.log('🔍 Checking for active ngrok tunnels...\n');
    
    // Get ngrok tunnels
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    if (tunnels.length === 0) {
      console.log('❌ No ngrok tunnels found!');
      console.log('   Start ngrok first: ngrok http 3005\n');
      return;
    }
    
    // Find the tunnel for port 3005 (backend)
    const backendTunnel = tunnels.find(tunnel => 
      tunnel.config.addr.includes('3005') || tunnel.config.addr.includes('localhost:3005')
    );
    
    if (!backendTunnel) {
      console.log('❌ No ngrok tunnel found for port 3005!');
      console.log('   Start backend tunnel: ngrok http 3005\n');
      return;
    }
    
    const ngrokUrl = backendTunnel.public_url;
    console.log(`✅ Found ngrok tunnel: ${ngrokUrl}\n`);
    
    // GitHub OAuth configuration
    console.log('🔧 GitHub OAuth App Configuration:');
    console.log('   Go to: https://github.com/settings/developers\n');
    
    console.log('📝 Update these fields in your GitHub OAuth App:');
    console.log(`   Homepage URL: ${ngrokUrl}`);
    console.log(`   Authorization callback URL: ${ngrokUrl}/api/auth/github/callback\n`);
    
    // Environment variables
    console.log('🌍 Environment Variables for .env file:');
    console.log(`   GITHUB_CALLBACK_URL=${ngrokUrl}/api/auth/github/callback`);
    console.log(`   REACT_APP_API_URL=${ngrokUrl}\n`);
    
    // Check if .env exists and offer to update it
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      console.log('📄 Found existing .env file');
      console.log('   Would you like to update it automatically? (Edit this script to enable auto-update)\n');
      
      // Show current .env contents (GitHub-related only)
      const envContent = fs.readFileSync(envPath, 'utf8');
      const githubLines = envContent.split('\n').filter(line => 
        line.includes('GITHUB_') || line.includes('REACT_APP_API_URL')
      );
      
      if (githubLines.length > 0) {
        console.log('🔍 Current GitHub-related environment variables:');
        githubLines.forEach(line => console.log(`   ${line}`));
        console.log('');
      }
    } else {
      console.log('📄 .env file not found. Create one with:');
      console.log('   GITHUB_CLIENT_ID=your_client_id');
      console.log('   GITHUB_CLIENT_SECRET=your_client_secret');
      console.log(`   GITHUB_CALLBACK_URL=${ngrokUrl}/api/auth/github/callback`);
      console.log(`   REACT_APP_API_URL=${ngrokUrl}\n`);
    }
    
    // Quick commands
    console.log('🚀 Quick Commands:');
    console.log('   Test ngrok URL: curl ' + ngrokUrl + '/health');
    console.log('   View ngrok dashboard: http://localhost:4040');
    console.log('   Restart Docker: docker-compose restart\n');
    
    // Summary
    console.log('📋 Summary:');
    console.log('   1. Update GitHub OAuth App URLs (see above)');
    console.log('   2. Update .env file with ngrok URLs');
    console.log('   3. Restart your application');
    console.log('   4. Test OAuth flow at: ' + ngrokUrl);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to ngrok!');
      console.log('   Make sure ngrok is running: ngrok http 3005');
      console.log('   ngrok web interface should be at: http://localhost:4040\n');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Add this function to auto-update .env (uncomment to enable)
function updateEnvFile(ngrokUrl) {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env file not found, skipping auto-update');
    return;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add GitHub callback URL
  if (envContent.includes('GITHUB_CALLBACK_URL=')) {
    envContent = envContent.replace(
      /GITHUB_CALLBACK_URL=.*/,
      `GITHUB_CALLBACK_URL=${ngrokUrl}/api/auth/github/callback`
    );
  } else {
    envContent += `\nGITHUB_CALLBACK_URL=${ngrokUrl}/api/auth/github/callback`;
  }
  
  // Update or add React app API URL
  if (envContent.includes('REACT_APP_API_URL=')) {
    envContent = envContent.replace(
      /REACT_APP_API_URL=.*/,
      `REACT_APP_API_URL=${ngrokUrl}`
    );
  } else {
    envContent += `\nREACT_APP_API_URL=${ngrokUrl}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with ngrok URLs');
}

// Run the script
if (require.main === module) {
  getNgrokConfig();
}

module.exports = { getNgrokConfig }; 