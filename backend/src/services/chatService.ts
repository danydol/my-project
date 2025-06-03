import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import llmService from './llmService';

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  repositoryId: { type: String, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ['text', 'plan', 'terminal', 'code', 'error'], 
    default: 'text' 
  },
  metadata: {
    planSteps: [String],
    terminalCommands: [String],
    codeBlocks: [{
      language: String,
      code: String,
      filename: String
    }],
    executionStatus: String,
    timestamp: Date
  },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  repositoryId: { type: String, index: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  context: {
    projectType: String,
    techStack: [String],
    currentPhase: String,
    goals: [String]
  },
  lastActivity: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

interface ChatMessage {
  chatId: string;
  userId: string;
  repositoryId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType: 'text' | 'plan' | 'terminal' | 'code' | 'error';
  metadata?: {
    planSteps?: string[];
    terminalCommands?: string[];
    codeBlocks?: Array<{
      language: string;
      code: string;
      filename?: string;
    }>;
    executionStatus?: string;
  };
}

class ChatService {
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/deployai_chat';
      await mongoose.connect(mongoUrl);
      this.isConnected = true;
      logger.info('Connected to MongoDB for chat service');
    } catch (error) {
      logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  async createChatSession(
    userId: string, 
    title: string, 
    repositoryId?: string
  ): Promise<string> {
    await this.connect();
    
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = new ChatSession({
      chatId,
      userId,
      repositoryId,
      title,
      status: 'active'
    });

    await session.save();
    
    // Add welcome message
    await this.addMessage(chatId, userId, {
      role: 'assistant',
      content: `Welcome to Deploy.AI! I'm here to help you with your project deployment. How can I assist you today?`,
      messageType: 'text'
    });

    logger.info('Created new chat session', { chatId, userId, title });
    return chatId;
  }

  async addMessage(
    chatId: string, 
    userId: string, 
    message: Omit<ChatMessage, 'chatId' | 'userId'>
  ): Promise<void> {
    await this.connect();

    const chatMessage = new ChatMessage({
      chatId,
      userId,
      ...message
    });

    await chatMessage.save();

    // Update session last activity
    await ChatSession.updateOne(
      { chatId },
      { lastActivity: new Date() }
    );

    logger.info('Added chat message', { chatId, role: message.role, messageType: message.messageType });
  }

  async processUserMessage(
    chatId: string,
    userId: string,
    userMessage: string,
    repositoryId?: string
  ): Promise<any> {
    await this.connect();

    // Add user message
    await this.addMessage(chatId, userId, {
      role: 'user',
      content: userMessage,
      messageType: 'text',
      repositoryId
    });

    // Get conversation history for context
    const recentMessages = await this.getChatHistory(chatId, 10);
    
    // Analyze the user's message and determine response type
    const responseType = await this.analyzeMessageIntent(userMessage);
    
    let assistantResponse;
    
    switch (responseType.type) {
      case 'deployment_plan':
        assistantResponse = await this.generateDeploymentPlan(userMessage, recentMessages, repositoryId);
        break;
      case 'code_generation':
        assistantResponse = await this.generateCode(userMessage, recentMessages, repositoryId);
        break;
      case 'terminal_commands':
        assistantResponse = await this.generateTerminalCommands(userMessage, recentMessages);
        break;
      case 'general_help':
      default:
        assistantResponse = await this.generateGeneralResponse(userMessage, recentMessages);
        break;
    }

    // Add assistant response
    await this.addMessage(chatId, userId, assistantResponse);

    return assistantResponse;
  }

  private async analyzeMessageIntent(message: string): Promise<{ type: string; confidence: number }> {
    const deploymentKeywords = ['deploy', 'deployment', 'production', 'staging', 'build', 'ci/cd', 'pipeline'];
    const codeKeywords = ['code', 'generate', 'create', 'dockerfile', 'yaml', 'terraform', 'kubernetes'];
    const terminalKeywords = ['run', 'command', 'terminal', 'execute', 'install', 'npm', 'docker'];

    const lowerMessage = message.toLowerCase();
    
    if (deploymentKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return { type: 'deployment_plan', confidence: 0.8 };
    }
    
    if (codeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return { type: 'code_generation', confidence: 0.8 };
    }
    
    if (terminalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return { type: 'terminal_commands', confidence: 0.7 };
    }

    return { type: 'general_help', confidence: 0.5 };
  }

  private async generateDeploymentPlan(
    userMessage: string, 
    context: any[], 
    repositoryId?: string
  ): Promise<any> {
    const prompt = `
You are an expert DevOps engineer helping a user create a deployment plan.

User's request: ${userMessage}
Context: ${JSON.stringify(context.slice(-3))}

Generate a structured deployment plan with the following format:
1. Clear step-by-step plan
2. Terminal commands needed
3. Expected outcomes

Please provide a comprehensive but concise plan.
`;

    try {
      const response = await this.generateFallbackPlan(userMessage);

      // Parse the response to extract plan steps and commands
      const planSteps = this.extractPlanSteps(response);
      const terminalCommands = this.extractTerminalCommands(response);

      return {
        role: 'assistant' as const,
        content: response,
        messageType: 'plan' as const,
        metadata: {
          planSteps,
          terminalCommands,
          executionStatus: 'pending'
        }
      };
    } catch (error) {
      logger.error('Error generating deployment plan', error);
      return this.generateErrorResponse('Failed to generate deployment plan');
    }
  }

  private async generateCode(
    userMessage: string,
    context: any[],
    repositoryId?: string
  ): Promise<any> {
    const prompt = `
Generate code based on the user's request: ${userMessage}

Context: ${JSON.stringify(context.slice(-3))}

Please provide:
1. Clear explanation of what the code does
2. Code blocks with proper formatting
3. Any additional setup instructions
`;

    try {
      const response = await this.callLLM(prompt);
      const codeBlocks = this.extractCodeBlocks(response);

      return {
        role: 'assistant' as const,
        content: response,
        messageType: 'code' as const,
        metadata: {
          codeBlocks
        }
      };
    } catch (error) {
      logger.error('Error generating code', error);
      return this.generateErrorResponse('Failed to generate code');
    }
  }

  private async generateTerminalCommands(
    userMessage: string,
    context: any[]
  ): Promise<any> {
    const response = await this.generateFallbackTerminalResponse(userMessage);
    const terminalCommands = this.extractTerminalCommands(response);

    return {
      role: 'assistant' as const,
      content: response,
      messageType: 'terminal' as const,
      metadata: {
        terminalCommands,
        executionStatus: 'ready'
      }
    };
  }

  private async generateGeneralResponse(
    userMessage: string,
    context: any[]
  ): Promise<any> {
    const prompt = `
You are a helpful AI assistant for Deploy.AI, a platform that helps developers deploy applications to the cloud.

User message: ${userMessage}
Recent context: ${JSON.stringify(context.slice(-3))}

Provide a helpful, concise response that guides the user toward their deployment goals.
`;

    try {
      const response = await this.callLLM(prompt);
      return {
        role: 'assistant' as const,
        content: response,
        messageType: 'text' as const
      };
    } catch (error) {
      return {
        role: 'assistant' as const,
        content: `I understand you're asking about: "${userMessage}". Let me help you with that! Deploy.AI can assist with repository analysis, infrastructure generation, and automated deployments. What specific aspect of your project would you like to work on?`,
        messageType: 'text' as const
      };
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    // Use the existing LLM service
    const messages = [
      { role: 'system', content: 'You are a helpful DevOps AI assistant.' },
      { role: 'user', content: prompt }
    ];

    // This would integrate with the existing llmService
    // For now, return a placeholder
    return "I'm ready to help you with your deployment! Could you provide more details about your project?";
  }

  private extractPlanSteps(response: string): string[] {
    const lines = response.split('\n');
    const steps = lines
      .filter(line => /^\d+\./.test(line.trim()) || line.includes('Step'))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(step => step.length > 0);
    
    return steps.length > 0 ? steps : ['Review project requirements', 'Set up infrastructure', 'Deploy application'];
  }

  private extractTerminalCommands(response: string): string[] {
    const codeBlockRegex = /```(?:bash|shell|sh)?\n([\s\S]*?)\n```/g;
    const commands: string[] = [];
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const code = match[1].trim();
      commands.push(...code.split('\n').filter(line => line.trim().length > 0));
    }

    return commands;
  }

  private extractCodeBlocks(response: string): Array<{ language: string; code: string; filename?: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const blocks: Array<{ language: string; code: string; filename?: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }

    return blocks;
  }

  private generateFallbackPlan(userMessage: string): string {
    return `Based on your request: "${userMessage}"

Here's a suggested deployment plan:

1. **Analysis Phase**
   - Review your current codebase
   - Identify dependencies and requirements
   - Choose appropriate deployment strategy

2. **Infrastructure Setup**
   - Configure cloud resources
   - Set up CI/CD pipeline
   - Prepare environment variables

3. **Deployment Execution**
   - Build and test application
   - Deploy to staging environment
   - Validate deployment and go live

\`\`\`bash
# Example commands
git clone <your-repo>
npm install
npm run build
docker build -t your-app .
kubectl apply -f deployment.yaml
\`\`\`

Would you like me to elaborate on any of these steps?`;
  }

  private generateFallbackTerminalResponse(userMessage: string): string {
    return `Here are some common commands for your request:

\`\`\`bash
# Basic deployment commands
npm install
npm run build
docker build -t myapp .
docker run -p 3000:3000 myapp
\`\`\`

Let me know if you need specific commands for your use case!`;
  }

  private generateErrorResponse(message: string): any {
    return {
      role: 'assistant' as const,
      content: `Sorry, I encountered an error: ${message}. Please try again or contact support if the issue persists.`,
      messageType: 'error' as const
    };
  }

  async getChatHistory(chatId: string, limit: number = 50): Promise<any[]> {
    await this.connect();
    
    const messages = await ChatMessage
      .find({ chatId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return messages.reverse();
  }

  async getUserChatSessions(userId: string): Promise<any[]> {
    await this.connect();
    
    return await ChatSession
      .find({ userId })
      .sort({ lastActivity: -1 })
      .limit(20);
  }

  async deleteChatSession(chatId: string, userId: string): Promise<void> {
    await this.connect();
    
    // Delete all messages in the chat
    await ChatMessage.deleteMany({ chatId, userId });
    
    // Delete the session
    await ChatSession.deleteOne({ chatId, userId });
    
    logger.info('Deleted chat session', { chatId, userId });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      return mongoose.connection.readyState === 1;
    } catch {
      return false;
    }
  }
}

export default new ChatService(); 