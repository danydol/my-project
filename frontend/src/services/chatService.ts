import { apiClient } from './api';

export interface ChatSession {
  chatId: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  lastActivity: string;
  createdAt: string;
}

export interface ChatMessage {
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
  timestamp: string;
}

export class ChatService {
  private static instance: ChatService;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  async createChatSession(title: string, repositoryId?: string): Promise<string> {
    try {
      const response = await apiClient.post('/chat/sessions', {
        title,
        repositoryId
      });
      return response.data.chatId;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  async getChatSessions(): Promise<ChatSession[]> {
    try {
      const response = await apiClient.get('/chat/sessions');
      return response.data.sessions;
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      throw new Error('Failed to fetch chat sessions');
    }
  }

  async getChatHistory(chatId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const response = await apiClient.get(`/chat/${chatId}/messages`, {
        params: { limit }
      });
      return response.data.messages;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw new Error('Failed to fetch chat history');
    }
  }

  async sendMessage(
    chatId: string, 
    message: string, 
    repositoryId?: string
  ): Promise<ChatMessage> {
    try {
      const response = await apiClient.post(`/chat/${chatId}/messages`, {
        message,
        repositoryId
      });
      return response.data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  async deleteChatSession(chatId: string): Promise<void> {
    try {
      await apiClient.delete(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw new Error('Failed to delete chat session');
    }
  }
}

export const chatService = ChatService.getInstance(); 