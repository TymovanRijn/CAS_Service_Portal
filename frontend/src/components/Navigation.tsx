import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { getNavigationItems, getPageTitle } from '../navigationConfig';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [user?.avatar_url]);

  useEffect(() => {
    if (onSidebarToggle) {
      onSidebarToggle(isCollapsed);
    }
  }, [isCollapsed, onSidebarToggle]);

  useEffect(() => {
    if (!accountOpen) return;
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [accountOpen]);

  if (!user) return null;

  const avatarInitial =
    user.username.slice(0, 2).toUpperCase() || '?';

  const navigationItems = getNavigationItems(user);
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
      {/* Mobiel: compacte app-header + safe area (desktop: verborgen) */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-slate-200/50 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="relative mx-auto flex h-[3rem] max-w-lg items-center gap-2 px-3 sm:px-4">
          <div className="relative shrink-0" ref={accountRef}>
            <button
              type="button"
              id="mobile-account-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setAccountOpen((o) => !o);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-800 shadow-sm transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-controls="mobile-account-menu"
            >
              {user.avatar_url && !avatarImageFailed ? (
                <img
                  src={`${BACKEND_URL}${user.avatar_url}`}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  onError={() => setAvatarImageFailed(true)}
                />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </button>
            {accountOpen && (
              <div
                id="mobile-account-menu"
                role="menu"
                aria-labelledby="mobile-account-trigger"
                className="absolute left-0 top-full z-[60] mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200/90 bg-white py-2 shadow-lg"
              >
                <div className="border-b border-slate-100 px-3 pb-2">
                  <p className="truncate text-sm font-medium text-slate-900">{user.username}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getRoleColor(user.role_name)}`}
                  >
                    {user.role_name}
                  </span>
                </div>
                <div className="p-2">
                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      logout();
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Uitloggen
                  </Button>
                </div>
              </div>
            )}
          </div>
          <h1 className="min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
            {getPageTitle(currentPage, user)}
          </h1>
          <span className="h-9 w-9 shrink-0 opacity-0" aria-hidden />
        </div>
      </header>

      {/* Mobiel: drijvende dock (geen rand-tot-rand „website“-balk) */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 w-full lg:hidden">
        <nav
          className="pointer-events-auto mx-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
          aria-label="Hoofdnavigatie"
        >
          <div className="overflow-hidden rounded-[1.625rem] border border-white/90 bg-white/92 shadow-[0_12px_40px_-4px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/88">
            {/* Gecentreerde tabstrip; bij veel items horizontaal scrollen */}
            <div className="-mx-0 flex justify-center overflow-x-auto overscroll-x-contain px-1 py-2 [-webkit-overflow-scrolling:touch]">
              <div className="scrollbar-hide flex w-max max-w-[min(100%,100vw-3rem)] snap-x snap-mandatory flex-nowrap items-stretch gap-0.5">
              {navigationItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePageChange(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`tap-scale flex min-h-[4rem] min-w-[4rem] shrink-0 snap-start snap-always touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl px-2 transition-colors duration-200 motion-reduce:transition-none ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-inner'
                        : 'text-slate-500 hover:bg-slate-100/90 active:bg-slate-100'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex [&>svg]:h-[1.375rem] [&>svg]:w-[1.375rem] [&>svg]:shrink-0 ${
                        isActive ? '[&>svg]:text-white' : '[&>svg]:text-slate-500'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`max-w-[4.75rem] text-center text-[10px] font-semibold leading-[1.1] tracking-[-0.01em] ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {tabLabel(item)}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </nav>
      </div>

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
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                {user.avatar_url && !avatarImageFailed ? (
                  <img
                    src={`${BACKEND_URL}${user.avatar_url}`}
                    alt=""
                    className="h-10 w-10 object-cover"
                    onError={() => setAvatarImageFailed(true)}
                  />
                ) : (
                  <span className="text-[11px] font-bold text-gray-600">{avatarInitial}</span>
                )}
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
