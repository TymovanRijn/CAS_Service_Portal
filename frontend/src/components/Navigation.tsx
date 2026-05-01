import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { getNavigationItems, getPageTitle } from '../navigationConfig';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onSidebarToggle?: (isCollapsed: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
  onSidebarToggle
}) => {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(isCollapsed);
    }
  }, [isCollapsed, onSidebarToggle]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', onDoc, true);
    return () => document.removeEventListener('click', onDoc, true);
  }, [userMenuOpen]);

  if (!user) return null;

  const navigationItems = getNavigationItems(user);
  const pageTitle = getPageTitle(currentPage, user);
  const tabLabel = (item: (typeof navigationItems)[0]) => item.shortLabel ?? item.name;

  const handlePageChange = (page: string) => {
    onPageChange(page);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SAC':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Stakeholder':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      {/* Mobiel: zelfde informatiearchitectuur als desktop — titelbalk + tabbalk, geen aparte “drawer app” */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm safe-area-top"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex h-12 items-center justify-between gap-2 pl-3 pr-2 sm:pl-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">CAS Portal</p>
            <h1 className="truncate text-base font-semibold text-foreground leading-tight">{pageTitle}</h1>
          </div>
          <div className="relative flex-shrink-0" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 touch-manipulation"
              aria-expanded={userMenuOpen}
              aria-label="Accountmenu"
            >
              <span className="max-w-[3rem] truncate">{user.username.slice(0, 2).toUpperCase()}</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-2 text-left shadow-lg">
                <p className="px-3 text-sm font-medium text-gray-900 truncate">{user.username}</p>
                <p className="px-3 text-xs text-gray-500 truncate border-b border-gray-100 pb-2 mb-2">
                  {user.email}
                </p>
                <p className="px-3 pb-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getRoleColor(
                      user.role_name
                    )}`}
                  >
                    {user.role_name}
                  </span>
                </p>
                <Button
                  variant="outline"
                  className="mx-2 w-[calc(100%-1rem)] justify-center"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                >
                  Uitloggen
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-white/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Hoofdnavigatie"
      >
        <div className="scrollbar-hide flex max-w-full justify-start gap-0.5 overflow-x-auto px-1 py-1.5">
          {navigationItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePageChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[3.5rem] min-w-[3.6rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 touch-manipulation ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 active:bg-gray-100'
                }`}
              >
                <span
                  className={
                    isActive ? 'text-primary-foreground [&>svg]:text-primary-foreground' : 'text-gray-500'
                  }
                >
                  {item.icon}
                </span>
                <span
                  className={`max-w-[4.2rem] text-center text-[10px] font-medium leading-tight ${
                    isActive ? 'text-primary-foreground' : 'text-gray-600'
                  }`}
                >
                  {tabLabel(item)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className={`hidden lg:flex fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shadow-sm ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex h-full w-full flex-col">
          <div className="border-b border-gray-200 p-3">
            <div
              className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
                <svg
                  className="h-4 w-4 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div
                className={`transition-all duration-300 ${
                  isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                }`}
              >
                <h1 className="whitespace-nowrap text-lg font-bold">CAS Portal</h1>
                <p className="whitespace-nowrap text-xs text-muted-foreground">Security Asset Coordination</p>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <div className="group relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed((c) => !c)}
                  className="h-8 w-8 rounded-lg border border-transparent p-0 text-gray-600 transition-all duration-200 hover:scale-105 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
                  title={isCollapsed ? 'Menu uitklappen' : 'Menu inklappen'}
                >
                  <svg
                    className={`h-4 w-4 transition-all duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </Button>
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 shadow-xl transition-all duration-200 ease-in-out group-hover:visible group-hover:opacity-100 invisible">
                    Menu uitklappen
                    <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1 rotate-45 bg-gray-900" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 p-4">
            <div
              className={`flex items-center transition-all duration-300 ${
                isCollapsed ? 'justify-center' : 'space-x-3'
              }`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div
                className={`min-w-0 flex-1 transition-all duration-300 ${
                  isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                }`}
              >
                <p className="truncate text-sm font-medium text-gray-900">{user.username}</p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
                    getRoleColor(user.role_name)
                  }`}
                >
                  {user.role_name}
                </span>
              </div>
            </div>
          </div>

          <nav
            className={`flex-1 p-4 transition-all duration-300 ${
              isCollapsed ? 'space-y-1 overflow-hidden' : 'space-y-2 overflow-y-auto'
            }`}
          >
            <div
              className={`mb-4 transition-all duration-300 ${
                isCollapsed ? 'mb-0 h-0 overflow-hidden opacity-0' : 'opacity-100'
              }`}
            >
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Navigatie</h3>
            </div>
            {navigationItems.map((item) => (
              <div key={item.id} className="group relative">
                <button
                  onClick={() => handlePageChange(item.id)}
                  className={`flex w-full items-center rounded-lg text-left transition-all duration-200 hover:scale-[1.02] ${
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${isCollapsed ? 'h-12 justify-center p-3' : 'space-x-3 px-3 py-3'}`}
                >
                  <span
                    className={`flex-shrink-0 ${
                      currentPage === item.id ? 'text-primary-foreground' : 'text-gray-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <div
                    className={`min-w-0 flex-1 transition-all duration-300 ${
                      isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p
                      className={`truncate text-xs ${
                        currentPage === item.id ? 'text-primary-foreground/80' : 'text-gray-500'
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </button>

                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 opacity-0 shadow-xl transition-all duration-200 ease-in-out group-hover:visible group-hover:opacity-100 invisible">
                    <div className="relative rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="block text-xs text-gray-600">{item.description}</span>
                    </div>
                    <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1 rotate-45 border-b border-l border-gray-200 bg-white" />
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="group relative">
              <Button
                variant="outline"
                onClick={logout}
                className={`w-full transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-700 ${
                  isCollapsed ? 'justify-center px-0' : 'justify-start'
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span
                  className={`transition-all duration-300 ${
                    isCollapsed ? 'ml-0 w-0 overflow-hidden opacity-0' : 'ml-2 opacity-100'
                  }`}
                >
                  Uitloggen
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
