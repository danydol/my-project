import React from 'react';
import { 
  ExternalLink, 
  Book, 
  Code, 
  GitBranch, 
  Cloud, 
  MessageSquare, 
  Settings, 
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

interface HelpPageProps {
  onBack: () => void;
}

const HelpPage: React.FC<HelpPageProps> = ({ onBack }) => {
  // Use relative URL for API docs
  const API_DOCS_URL = '/api-docs';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deploy.AI Help Center</h1>
          <p className="text-gray-600">Everything you need to know about using Deploy.AI</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <Code className="w-8 h-8 text-blue-600" />
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">API Documentation</h3>
            <p className="text-sm text-gray-600">
              Complete Swagger documentation for all Deploy.AI API endpoints
            </p>
          </a>

          <div className="bg-white p-6 rounded-lg shadow border">
            <MessageSquare className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-sm text-gray-600">
              Chat with our AI to get deployment help and guidance
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <GitBranch className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Repository Setup</h3>
            <p className="text-sm text-gray-600">
              Connect your GitHub repositories and configure deployments
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Getting Started */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Book className="w-5 h-5 mr-2 text-blue-600" />
              Getting Started
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">1. Connect Your Repository</h3>
                <p className="text-sm text-gray-600">
                  Link your GitHub repository to Deploy.AI for automated analysis and deployment setup.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">2. AI Analysis</h3>
                <p className="text-sm text-gray-600">
                  Our AI will analyze your codebase to identify the tech stack, dependencies, and optimal deployment strategy.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">3. Infrastructure Generation</h3>
                <p className="text-sm text-gray-600">
                  Deploy.AI generates Terraform, Kubernetes, and CI/CD configurations tailored to your project.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">4. Deploy to Cloud</h3>
                <p className="text-sm text-gray-600">
                  One-click deployment to AWS with monitoring, scaling, and GitOps integration.
                </p>
              </div>
            </div>
          </div>

          {/* AI Assistant Guide */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
              Using the AI Assistant
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Ask About Deployments</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  "How do I deploy my React app to production?"
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Request Infrastructure Code</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  "Generate Kubernetes deployment for my Node.js app"
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Get Terminal Commands</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  "Show me the commands to build and deploy"
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Troubleshoot Issues</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  "My deployment failed, help me debug"
                </div>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Cloud className="w-5 h-5 mr-2 text-purple-600" />
              Platform Features
            </h2>
            
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-gray-800">Repository Analysis</span>
                  <p className="text-sm text-gray-600">AI-powered codebase analysis and tech stack detection</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-gray-800">Infrastructure as Code</span>
                  <p className="text-sm text-gray-600">Automated Terraform and Kubernetes configuration generation</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-gray-800">CI/CD Pipelines</span>
                  <p className="text-sm text-gray-600">GitHub Actions workflows for automated testing and deployment</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-gray-800">Cloud Deployment</span>
                  <p className="text-sm text-gray-600">One-click deployment to AWS EKS with monitoring</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-gray-800">GitOps Integration</span>
                  <p className="text-sm text-gray-600">ArgoCD setup for continuous deployment and sync</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-orange-600" />
              Troubleshooting
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Repository Connection Issues</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Ensure your GitHub account has proper permissions and the repository is accessible.
                </p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
                  <li>Check repository visibility settings</li>
                  <li>Verify GitHub token permissions</li>
                  <li>Ensure Deploy.AI app is installed</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Deployment Failures</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Most deployment issues are related to configuration or resource limits.
                </p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
                  <li>Check AWS credentials and permissions</li>
                  <li>Verify Docker image builds successfully</li>
                  <li>Review deployment logs for errors</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 mb-2">AI Assistant Not Responding</h3>
                <p className="text-sm text-gray-600 mb-2">
                  If the AI chat is unresponsive, try these steps:
                </p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
                  <li>Refresh the page and start a new conversation</li>
                  <li>Check your internet connection</li>
                  <li>Try asking simpler, more specific questions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Support Contact */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2" />
            Need More Help?
          </h2>
          <p className="text-blue-800 mb-4">
            Can't find what you're looking for? Our support team is here to help!
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Code className="w-4 h-4 mr-2" />
              API Documentation
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
            <button className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors">
              <MessageSquare className="w-4 h-4 mr-2" />
              Start AI Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage; 