import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Navigation } from './components/Navigation';
import { renderPage } from './pageRegistry';

// Main App Content Component
const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (isCollapsed: boolean) => {
    setIsSidebarCollapsed(isCollapsed);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
          <span className="text-lg font-extrabold tracking-tight">CAS</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Even geduld…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 max-lg:bg-gradient-to-b max-lg:from-slate-50 max-lg:to-slate-100/95">
      {/* Navigation Sidebar */}
      <Navigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        onSidebarToggle={handleSidebarToggle}
      />
      
      {/* Main Content - Fully responsive */}
      <div className={`transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        {/* Mobiel: header (~3rem) + safe area + ruimte voor drijvende dock; desktop ongewijzigd */}
        <main className="min-h-0 max-w-full px-3 pt-[calc(env(safe-area-inset-top,0px)+3rem+0.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+7.25rem)] sm:px-4 md:px-6 lg:px-8 lg:pt-6 lg:pb-8">
          <div key={currentPage} className="page-fade">
            {renderPage(currentPage, user)}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
