import React, { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  FolderIcon,
  CloudIcon,
  CogIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';
import { MessageSquare, HelpCircle } from 'lucide-react';
import ChatPanel from './ChatPanel/ChatPanel';
import HelpPage from './Help/HelpPage';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Projects', href: '/projects', icon: RectangleGroupIcon },
    { name: 'Repositories', href: '/repositories', icon: FolderIcon },
    { name: 'Deployments', href: '/deployments', icon: CloudIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const isCurrentPath = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const handleHelpClick = () => {
    setShowHelp(true);
  };

  const handleBackFromHelp = () => {
    setShowHelp(false);
  };

  // Show help page instead of normal layout
  if (showHelp) {
    return <HelpPage onBack={handleBackFromHelp} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D.AI</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Deploy.AI</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`sidebar-menu-item ${isCurrentPath(item.href) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* Mobile chat and help buttons */}
            <div className="px-4 py-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  setChatOpen(true);
                  setSidebarOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                AI Assistant
              </button>
              <button
                onClick={() => {
                  handleHelpClick();
                  setSidebarOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <HelpCircle className="h-5 w-5 mr-3" />
                Help
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D.AI</span>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">Deploy.AI</span>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-menu-item ${isCurrentPath(item.href) ? 'active' : ''}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Desktop chat and help buttons */}
          <div className="px-4 py-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              AI Assistant
            </button>
            <button
              onClick={handleHelpClick}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <HelpCircle className="h-5 w-5 mr-3" />
              Help
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              {/* Mobile chat button */}
              <button
                onClick={() => setChatOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <MessageSquare className="h-5 w-5" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {user?.avatar ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.avatar}
                      alt={user.username}
                    />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  )}
                  <span className="hidden md:block text-gray-700 font-medium">
                    {user?.username}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <div className="font-medium">{user?.username}</div>
                        <div className="text-gray-500">{user?.email}</div>
                      </div>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <CogIcon className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        repositoryId={undefined} // Could be passed from context or route params
      />
    </div>
  );
};

export default Layout; 