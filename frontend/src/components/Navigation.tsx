import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onSidebarToggle?: (isCollapsed: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange, onSidebarToggle }) => {
  const { user, logout, currentTenant } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Notify parent when sidebar collapses/expands
  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(isCollapsed);
    }
  }, [isCollapsed, onSidebarToggle]);

  // Close mobile sidebar when clicking outside or on page change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return null;

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handlePageChange = (page: string) => {
    onPageChange(page);
    setIsSidebarOpen(false); // Close mobile sidebar on navigation
  };

  const hasPermission = (requiredPermissions: string[]) => {
    if (!user.permissions) return false;
    return requiredPermissions.some(permission => 
      user.permissions!.includes(permission) || user.permissions!.includes('all')
    );
  };

  const getNavigationItems = () => {
    const allItems = [
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
          </svg>
        ),
        description: 'Overzicht van vandaag',
        permissions: ['all', 'dashboard:read']
      },
      {
        id: 'incidents',
        name: 'Incidenten',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        description: 'Beheer incidenten',
        permissions: ['all', 'incidents', 'incidents:read']
      },
      {
        id: 'knowledge-base',
        name: 'Kennisbank',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        description: 'Deel en ontdek security kennis',
        permissions: ['all', 'knowledge_base', 'knowledge_base:read']
      },

      {
        id: 'actions',
        name: 'Acties',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        description: 'Beheer acties',
        permissions: ['all', 'actions', 'actions:read']
      },
      {
        id: 'admin',
        name: 'Admin Management',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        description: 'Gebruikers, categorieën en locaties',
        permissions: ['all']
      },
      {
        id: 'kpi-dashboard',
        name: 'KPI Dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
        description: 'Prestatie-indicatoren en analytics',
        permissions: ['all', 'dashboard:read']
      },
      {
        id: 'reports',
        name: 'Rapporten',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        description: 'Analyses en rapporten',
        permissions: ['all', 'reports', 'reports:read']
      },
      {
        id: 'ai-insights',
        name: 'AI Insights',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        description: 'AI-gegenereerde inzichten',
        permissions: ['all', 'dashboard:read', 'ai:read']
      }
    ];

    return allItems.filter(item => hasPermission(item.permissions));
  };

  const navigationItems = getNavigationItems();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'Security Officer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Dashboard Viewer': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      {/* Mobile menu button - Improved positioning and touch target */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-white shadow-lg hover:shadow-xl transition-shadow touch-manipulation min-w-[44px] min-h-[44px] p-2"
        >
          {isSidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </Button>
      </div>

      {/* Desktop Sidebar - Unchanged but with better transitions */}
      <div className={`hidden lg:flex fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shadow-sm ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              {currentTenant?.settings?.logoPath ? (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/${currentTenant.settings.logoPath}`}
                  alt={`${currentTenant.name} logo`}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ backgroundColor: currentTenant?.settings?.primaryColor || '#3B82F6' }}
                >
                  {currentTenant?.name?.charAt(0) || 'C'}
                </div>
              )}
              <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                <h1 className="text-sm font-bold leading-tight" title={currentTenant?.name || 'CAS Portal'}>
                  {currentTenant?.name || 'CAS Portal'}
                </h1>
                <p className="text-xs text-gray-500 leading-tight">Incident & Action Management</p>
              </div>
            </div>
            
            {/* Collapse Toggle Button - Always below logo */}
            <div className="flex justify-center mt-3">
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="w-8 h-8 p-0 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md text-gray-600 hover:scale-105 active:scale-95 border border-transparent hover:border-blue-200"
                  title={isCollapsed ? 'Menu uitklappen' : 'Menu inklappen'}
                >
                  <svg className={`w-4 h-4 transition-all duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </Button>
                
                {/* Enhanced Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out whitespace-nowrap z-50 shadow-xl pointer-events-none">
                    Menu uitklappen
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className={`flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {user.role_name && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getRoleColor(user.role_name)}`}>
                    {user.role_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 p-4 transition-all duration-300 ${isCollapsed ? 'space-y-1 overflow-hidden' : 'space-y-2 overflow-y-auto'}`}>
            <div className={`mb-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigatie</h3>
            </div>
            {navigationItems.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handlePageChange(item.id)}
                  className={`w-full flex items-center rounded-lg text-left transition-all duration-200 hover:scale-[1.02] ${
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${isCollapsed ? 'justify-center p-3 h-12' : 'space-x-3 px-3 py-3'}`}
                >
                  <span className={`flex-shrink-0 ${currentPage === item.id ? 'text-primary-foreground' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  <div className={`flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className={`text-xs truncate ${
                      currentPage === item.id ? 'text-primary-foreground/80' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                </button>
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out whitespace-nowrap z-50 shadow-xl pointer-events-none">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="text-xs text-gray-600">{item.description}</span>
                    </div>
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-gray-200 rotate-45"></div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="relative group">
              <Button
                variant="outline"
                onClick={logout}
                className={`w-full transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 ${isCollapsed ? 'px-0 justify-center' : 'justify-start'}`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100 ml-2'}`}>
                  Uitloggen
                </span>
              </Button>
              
              {/* Tooltip for collapsed logout button */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-white border border-gray-200 text-gray-900 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out whitespace-nowrap z-50 shadow-xl pointer-events-none">
                  Uitloggen
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-gray-200 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - Enhanced with better touch experience */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header - Enhanced */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              {currentTenant?.settings?.logoPath ? (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/${currentTenant.settings.logoPath}`}
                  alt={`${currentTenant.name} logo`}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: currentTenant?.settings?.primaryColor || '#3B82F6' }}
                >
                  {currentTenant?.name?.charAt(0) || 'C'}
                </div>
              )}
              <div>
                <h1 className="text-base font-bold leading-tight" title={currentTenant?.name || 'CAS Portal'}>
                  {currentTenant?.name || 'CAS Portal'}
                </h1>
                <p className="text-xs text-gray-500">Incident & Action Management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
              className="touch-manipulation min-w-[44px] min-h-[44px] p-2 hover:bg-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Mobile User Info - Enhanced */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">{user.username}</p>
                <p className="text-sm text-gray-600 truncate">{user.email}</p>
                {user.role_name && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border mt-2 ${getRoleColor(user.role_name)}`}>
                    {user.role_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation - Enhanced touch targets */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigatie</h3>
            </div>
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handlePageChange(item.id)}
                className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-left transition-all duration-200 touch-manipulation active:scale-95 ${
                  currentPage === item.id
                    ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <span className={`flex-shrink-0 ${currentPage === item.id ? 'text-primary-foreground' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">{item.name}</p>
                  <p className={`text-sm truncate ${
                    currentPage === item.id ? 'text-primary-foreground/80' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </p>
                </div>
                {currentPage === item.id && (
                  <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          {/* Mobile Footer - Enhanced */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={logout}
              className="w-full justify-start py-3 text-base font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200 touch-manipulation active:scale-95"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Uitloggen
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Overlay for mobile with backdrop blur */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}; 