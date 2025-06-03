import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Plus, MessageSquare, Trash2, Loader } from 'lucide-react';
import { chatService, ChatSession, ChatMessage as ChatMessageType } from '../../services/chatService';
import ChatMessage from './ChatMessage';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, repositoryId }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions on mount
  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen]);

  // Load messages when active session changes
  useEffect(() => {
    if (activeSession) {
      loadChatMessages(activeSession);
    }
  }, [activeSession]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const sessionList = await chatService.getChatSessions();
      setSessions(sessionList);
      
      // Auto-select the most recent session
      if (sessionList.length > 0 && !activeSession) {
        setActiveSession(sessionList[0].chatId);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const messageList = await chatService.getChatHistory(chatId);
      setMessages(messageList);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  const createNewChat = async () => {
    const title = `Chat ${new Date().toLocaleString()}`;
    try {
      const chatId = await chatService.createChatSession(title, repositoryId);
      await loadChatSessions();
      setActiveSession(chatId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const deleteSession = async (chatId: string) => {
    try {
      await chatService.deleteChatSession(chatId);
      setSessions(prev => prev.filter(s => s.chatId !== chatId));
      
      if (activeSession === chatId) {
        const remainingSessions = sessions.filter(s => s.chatId !== chatId);
        if (remainingSessions.length > 0) {
          setActiveSession(remainingSessions[0].chatId);
        } else {
          setActiveSession(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeSession || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add user message to UI immediately
      const userMessageObj: ChatMessageType = {
        role: 'user',
        content: userMessage,
        messageType: 'text',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessageObj]);

      // Send message to backend
      const response = await chatService.sendMessage(activeSession, userMessage, repositoryId);
      
      // Add assistant response
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message to UI
      const errorMessage: ChatMessageType = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        messageType: 'error',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExecuteCommand = (command: string) => {
    // This would integrate with a terminal service in a real implementation
    console.log('Execute command:', command);
    // You could integrate this with a WebSocket connection to execute commands
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Deploy.AI Assistant
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Session List */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Conversations</span>
          <button
            onClick={createNewChat}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="w-4 h-4 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.chatId}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  activeSession === session.chatId
                    ? 'bg-blue-100 border border-blue-300'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveSession(session.chatId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {session.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(session.lastActivity).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.chatId);
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Start a conversation with Deploy.AI</p>
            <p className="text-xs mt-1">Ask about deployments, infrastructure, or CI/CD pipelines</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              onExecuteCommand={handleExecuteCommand}
            />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your deployment..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading || !activeSession}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || !activeSession}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {!activeSession && (
          <p className="text-xs text-gray-500 mt-2">
            Create a new conversation to get started
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel; 