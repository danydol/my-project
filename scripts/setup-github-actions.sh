#!/bin/bash

# GitHub Actions Setup Script for Deploy.AI
# This script helps you configure GitHub Actions secrets and settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if gh CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed."
        echo "Please install it from: https://cli.github.com/"
        echo "Or run: brew install gh (macOS) / apt install gh (Ubuntu)"
        exit 1
    fi
}

# Check if user is authenticated with GitHub
check_github_auth() {
    if ! gh auth status &> /dev/null; then
        print_warning "You are not authenticated with GitHub CLI."
        echo "Please run: gh auth login"
        exit 1
    fi
}

# Get repository information
get_repo_info() {
    print_header "Repository Information"
    
    # Get current repository
    REPO_URL=$(git remote get-url origin)
    REPO_OWNER=$(echo $REPO_URL | sed -n 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git/\1/p')
    REPO_NAME=$(echo $REPO_URL | sed -n 's/.*github\.com[:/]\([^/]*\)\/\([^/]*\)\.git/\2/p')
    
    if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
        print_error "Could not determine repository owner and name."
        echo "Please ensure you're in a git repository with a GitHub remote."
        exit 1
    fi
    
    print_status "Repository: $REPO_OWNER/$REPO_NAME"
}

# Get Deploy.AI configuration
get_deploy_ai_config() {
    print_header "Deploy.AI Configuration"
    
    echo "Please provide your Deploy.AI configuration:"
    
    # Get Deploy.AI API URL
    read -p "Deploy.AI API URL [https://bafb-77-137-25-91.ngrok-free.app]: " DEPLOY_AI_API_URL
    DEPLOY_AI_API_URL=${DEPLOY_AI_API_URL:-https://bafb-77-137-25-91.ngrok-free.app}
    
    # Get Deploy.AI JWT Token
    echo ""
    echo "To get your Deploy.AI JWT token:"
    echo "1. Login to your Deploy.AI platform"
    echo "2. Open browser developer tools (F12)"
    echo "3. Go to Application/Storage tab"
    echo "4. Find the JWT token in localStorage"
    echo "5. Copy the token value"
    echo ""
    read -p "Deploy.AI JWT Token: " DEPLOY_AI_TOKEN
    
    if [ -z "$DEPLOY_AI_TOKEN" ]; then
        print_error "Deploy.AI JWT Token is required."
        exit 1
    fi
    
    # Get Repository ID
    echo ""
    echo "To get your Repository ID:"
    echo "1. Go to Deploy.AI dashboard > Projects"
    echo "2. Select your project"
    echo "3. Copy the repository ID from the URL or project details"
    echo ""
    read -p "Repository ID: " REPOSITORY_ID
    
    if [ -z "$REPOSITORY_ID" ]; then
        print_error "Repository ID is required."
        exit 1
    fi
    
    # Get Cloud Connection ID
    echo ""
    echo "To get your Cloud Connection ID:"
    echo "1. Go to Deploy.AI dashboard > Cloud Connections"
    echo "2. Select your AWS connection"
    echo "3. Copy the connection ID"
    echo ""
    read -p "Cloud Connection ID: " CLOUD_CONNECTION_ID
    
    if [ -z "$CLOUD_CONNECTION_ID" ]; then
        print_error "Cloud Connection ID is required."
        exit 1
    fi
}

# Get AWS configuration
get_aws_config() {
    print_header "AWS Configuration"
    
    read -p "AWS Region [il-central-1]: " AWS_REGION
    AWS_REGION=${AWS_REGION:-il-central-1}
}

# Get optional security tools configuration
get_security_config() {
    print_header "Security Tools Configuration (Optional)"
    
    echo "These are optional but recommended for enhanced security:"
    
    read -p "Snyk Token (for dependency scanning): " SNYK_TOKEN
    read -p "Codecov Token (for coverage reporting): " CODECOV_TOKEN
}

# Set GitHub secrets
set_github_secrets() {
    print_header "Setting GitHub Secrets"
    
    print_status "Setting Deploy.AI API URL..."
    gh secret set DEPLOY_AI_API_URL --body "$DEPLOY_AI_API_URL" --repo "$REPO_OWNER/$REPO_NAME"
    
    print_status "Setting Deploy.AI JWT Token..."
    gh secret set DEPLOY_AI_TOKEN --body "$DEPLOY_AI_TOKEN" --repo "$REPO_OWNER/$REPO_NAME"
    
    print_status "Setting Repository ID..."
    gh secret set REPOSITORY_ID --body "$REPOSITORY_ID" --repo "$REPO_OWNER/$REPO_NAME"
    
    print_status "Setting Cloud Connection ID..."
    gh secret set DEFAULT_CLOUD_CONNECTION_ID --body "$CLOUD_CONNECTION_ID" --repo "$REPO_OWNER/$REPO_NAME"
    
    print_status "Setting AWS Region..."
    gh secret set AWS_REGION --body "$AWS_REGION" --repo "$REPO_OWNER/$REPO_NAME"
    
    if [ -n "$SNYK_TOKEN" ]; then
        print_status "Setting Snyk Token..."
        gh secret set SNYK_TOKEN --body "$SNYK_TOKEN" --repo "$REPO_OWNER/$REPO_NAME"
    fi
    
    if [ -n "$CODECOV_TOKEN" ]; then
        print_status "Setting Codecov Token..."
        gh secret set CODECOV_TOKEN --body "$CODECOV_TOKEN" --repo "$REPO_OWNER/$REPO_NAME"
    fi
}

# Enable GitHub Actions
enable_github_actions() {
    print_header "Enabling GitHub Actions"
    
    print_status "Enabling GitHub Actions for the repository..."
    gh api repos/$REPO_OWNER/$REPO_NAME --method PATCH --field allow_auto_merge=true --field allow_rebase_merge=true --field allow_squash_merge=true
    
    print_status "GitHub Actions is now enabled!"
}

# Create workflow files if they don't exist
create_workflow_files() {
    print_header "Checking Workflow Files"
    
    if [ ! -d ".github/workflows" ]; then
        print_status "Creating .github/workflows directory..."
        mkdir -p .github/workflows
    fi
    
    if [ ! -f ".github/workflows/deploy.yml" ]; then
        print_warning "deploy.yml workflow file not found."
        echo "Please ensure the workflow files are present in .github/workflows/"
    else
        print_status "deploy.yml workflow file found."
    fi
    
    if [ ! -f ".github/workflows/infrastructure.yml" ]; then
        print_warning "infrastructure.yml workflow file not found."
    else
        print_status "infrastructure.yml workflow file found."
    fi
    
    if [ ! -f ".github/workflows/test.yml" ]; then
        print_warning "test.yml workflow file not found."
    else
        print_status "test.yml workflow file found."
    fi
}

# Test the configuration
test_configuration() {
    print_header "Testing Configuration"
    
    print_status "Testing Deploy.AI API connection..."
    if curl -s -H "Authorization: Bearer $DEPLOY_AI_TOKEN" "$DEPLOY_AI_API_URL/api/health" > /dev/null; then
        print_status "✅ Deploy.AI API connection successful"
    else
        print_warning "⚠️  Deploy.AI API connection failed. Please check your token and URL."
    fi
    
    print_status "Testing GitHub repository access..."
    if gh repo view "$REPO_OWNER/$REPO_NAME" > /dev/null; then
        print_status "✅ GitHub repository access successful"
    else
        print_error "❌ GitHub repository access failed."
        exit 1
    fi
}

# Display next steps
show_next_steps() {
    print_header "Setup Complete! Next Steps"
    
    echo "🎉 Your GitHub Actions CI/CD pipeline is now configured!"
    echo ""
    echo "📋 What was configured:"
    echo "  ✅ GitHub Secrets for Deploy.AI integration"
    echo "  ✅ AWS configuration"
    echo "  ✅ Security tools (if provided)"
    echo ""
    echo "🚀 To test your setup:"
    echo "  1. Push a commit to the 'develop' branch for staging deployment"
    echo "  2. Push a commit to the 'main' branch for production deployment"
    echo "  3. Create a pull request to trigger quality checks"
    echo ""
    echo "🔧 Manual workflows available:"
    echo "  - Deploy to AWS via Deploy.AI"
    echo "  - Provision AWS Infrastructure via Deploy.AI"
    echo ""
    echo "📊 Monitor your deployments:"
    echo "  - GitHub Actions tab: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    echo "  - Deploy.AI Dashboard: $DEPLOY_AI_API_URL"
    echo ""
    echo "📚 Documentation:"
    echo "  - .github/README.md - Complete setup guide"
    echo "  - Deploy.AI Platform - Infrastructure and deployment management"
    echo ""
    echo "🔒 Security:"
    echo "  - All secrets are encrypted and stored securely"
    echo "  - No credentials are stored in the repository"
    echo "  - Automated security scanning is enabled"
}

# Main execution
main() {
    print_header "GitHub Actions Setup for Deploy.AI"
    
    check_gh_cli
    check_github_auth
    get_repo_info
    get_deploy_ai_config
    get_aws_config
    get_security_config
    
    echo ""
    print_status "Summary of configuration:"
    echo "  Repository: $REPO_OWNER/$REPO_NAME"
    echo "  Deploy.AI API: $DEPLOY_AI_API_URL"
    echo "  AWS Region: $AWS_REGION"
    echo ""
    
    read -p "Proceed with setting up GitHub Actions? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        test_configuration
        set_github_secrets
        enable_github_actions
        create_workflow_files
        show_next_steps
    else
        print_status "Setup cancelled."
        exit 0
    fi
}

# Run main function
main "$@" 