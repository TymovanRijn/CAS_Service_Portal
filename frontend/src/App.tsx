import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Archive } from './components/Archive';
import { ActionManagement } from './components/ActionManagement';
import { Reports } from './components/Reports';
import { AIInsights } from './components/AIInsights';
import { AdminManagement } from './components/AdminManagement';
import { KPIDashboard } from './components/KPIDashboard';
import { Navigation } from './components/Navigation';

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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'archive':
        return <Archive />;
      case 'incidents':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="px-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Incident Beheer</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Beheer alle incidenten en acties</p>
            </div>
            <div className="text-center py-8 sm:py-12 text-gray-500 px-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-base sm:text-lg font-medium mb-2">Incident Beheer</h3>
              <p className="text-sm sm:text-base">Geavanceerde incident beheer functionaliteit komt binnenkort...</p>
            </div>
          </div>
        );
      case 'actions':
        return <ActionManagement />;
      case 'admin':
        return <AdminManagement />;
      case 'reports':
        return <Reports />;
      case 'ai-insights':
        return <AIInsights />;
      case 'kpi-dashboard':
        return <KPIDashboard />;
      default:
        return <Dashboard />;
    }
  };

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
        {/* Mobile-first padding and spacing */}
        <main className="p-3 sm:p-4 md:p-6 lg:p-8 pt-16 lg:pt-6">
          {renderCurrentPage()}
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
