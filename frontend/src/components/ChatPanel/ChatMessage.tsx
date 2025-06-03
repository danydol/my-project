import React, { useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../../services/chatService';
import { User, Bot, AlertCircle, Terminal, Code, FileText } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onExecuteCommand?: (command: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onExecuteCommand }) => {
  const renderIcon = () => {
    if (message.role === 'user') {
      return <User className="w-6 h-6 text-blue-600" />;
    }
    
    switch (message.messageType) {
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'terminal':
        return <Terminal className="w-6 h-6 text-green-600" />;
      case 'code':
        return <Code className="w-6 h-6 text-purple-600" />;
      case 'plan':
        return <FileText className="w-6 h-6 text-orange-600" />;
      default:
        return <Bot className="w-6 h-6 text-gray-600" />;
    }
  };

  const renderPlanSteps = () => {
    if (!message.metadata?.planSteps) return null;

    return (
      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Deployment Plan
        </h4>
        <ol className="list-decimal list-inside space-y-2">
          {message.metadata.planSteps.map((step, index) => (
            <li key={index} className="text-sm text-orange-700">
              {step}
            </li>
          ))}
        </ol>
        {message.metadata.executionStatus && (
          <div className="mt-3 text-xs text-orange-600">
            Status: <span className="font-semibold">{message.metadata.executionStatus}</span>
          </div>
        )}
      </div>
    );
  };

  const renderTerminalCommands = () => {
    if (!message.metadata?.terminalCommands) return null;

    return (
      <div className="mt-4 p-4 bg-gray-900 rounded-lg">
        <h4 className="font-semibold text-green-400 mb-3 flex items-center">
          <Terminal className="w-4 h-4 mr-2" />
          Terminal Commands
        </h4>
        <div className="space-y-2">
          {message.metadata.terminalCommands.map((command, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-800 p-2 rounded group"
            >
              <code className="text-green-300 text-sm flex-1 font-mono">{command}</code>
              {onExecuteCommand && (
                <button
                  onClick={() => onExecuteCommand(command)}
                  className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Run
                </button>
              )}
            </div>
          ))}
        </div>
        {message.metadata.executionStatus && (
          <div className="mt-3 text-xs text-green-400">
            Status: <span className="font-semibold">{message.metadata.executionStatus}</span>
          </div>
        )}
      </div>
    );
  };

  const renderCodeBlocks = () => {
    if (!message.metadata?.codeBlocks) return null;

    return (
      <div className="mt-4 space-y-4">
        {message.metadata.codeBlocks.map((block, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center">
                <Code className="w-4 h-4 mr-2 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  {block.filename || `${block.language} code`}
                </span>
              </div>
              <span className="text-xs text-gray-500">{block.language}</span>
            </div>
            <pre className="m-0 p-4 bg-gray-900 overflow-x-auto">
              <code className="text-green-300 text-sm font-mono">
                {block.code}
              </code>
            </pre>
          </div>
        ))}
      </div>
    );
  };

  const getMessageBgColor = () => {
    if (message.role === 'user') return 'bg-blue-50 border-blue-200';
    
    switch (message.messageType) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'plan':
        return 'bg-orange-50 border-orange-200';
      case 'terminal':
        return 'bg-green-50 border-green-200';
      case 'code':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`flex space-x-3 p-4 border rounded-lg ${getMessageBgColor()}`}>
      <div className="flex-shrink-0">
        {renderIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-semibold text-sm">
            {message.role === 'user' ? 'You' : 'Deploy.AI Assistant'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="prose prose-sm max-w-none">
          {message.content.split('\n').map((line, index) => (
            <p key={index} className="mb-2 last:mb-0">
              {line}
            </p>
          ))}
        </div>

        {renderPlanSteps()}
        {renderTerminalCommands()}
        {renderCodeBlocks()}
      </div>
    </div>
  );
};

export default ChatMessage; 