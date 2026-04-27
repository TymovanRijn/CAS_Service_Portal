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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Applicatie laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
        {/* Mobiel: ruimte voor vaste titelbalk + ondere tabbalk; desktop: zelfde padding als voorheen */}
        <main className="min-h-0 max-w-full px-3 pt-14 pb-24 sm:px-4 md:px-6 lg:px-8 lg:pt-6 lg:pb-8">
          {renderPage(currentPage, user)}
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
