import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CreateIncidentModal } from './CreateIncidentModal';
import { CreateActionModal } from './CreateActionModal';
import { IncidentDetailModal } from './IncidentDetailModal';
import { ActionDetailModal } from './ActionDetailModal';
import { MobileOptimizedCard } from './MobileOptimizedCard';
import { MobileButton } from './MobileButton';
import { MobilePageHeader } from './MobilePageHeader';
import { api } from '../lib/api';

interface Incident {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category_name?: string;
  location_name?: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  possible_solution?: string;
  category_id: number;
  location_id: number;
  attachment_count?: number;
}

interface Action {
  id: number;
  incident_id: number;
  action_description: string;
  status: string;
  incident_title: string;
  incident_priority: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  notes?: string;
  category_name?: string;
  location_name?: string;
  incident_status?: string;
}



interface User {
  id: number;
  username: string;
  email: string;
  role_name: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [todaysIncidents, setTodaysIncidents] = useState<Incident[]>([]);
  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateIncidentModalOpen, setIsCreateIncidentModalOpen] = useState(false);
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isIncidentDetailModalOpen, setIsIncidentDetailModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isActionDetailModalOpen, setIsActionDetailModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has dashboard permissions
  const hasPermission = (requiredPermissions: string[]) => {
    if (!user?.permissions) return false;
    return requiredPermissions.some(permission => 
      user.permissions!.includes(permission) || user.permissions!.includes('all')
    );
  };

  // Fetch data for users with dashboard permissions
  useEffect(() => {
    if (!user) return;
    
    if (hasPermission(['dashboard:read', 'incidents:read', 'actions:read'])) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (!user) return null;

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch data in parallel using tenant-aware API
      const [incidentsData, actionsData, usersData] = await Promise.all([
        api.get('/api/incidents/today').catch(() => ({ incidents: [] })),
        api.get('/api/actions/pending').catch(() => ({ actions: [] })),
        api.get('/api/actions/users').catch(() => ({ users: [] }))
      ]);

      setTodaysIncidents(incidentsData.incidents || []);
      setPendingActions(actionsData.actions || []);
      setAvailableUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Er is een fout opgetreden bij het laden van de dashboard gegevens.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncidentCreated = () => {
    setIsCreateIncidentModalOpen(false);
    fetchDashboardData();
  };

  const handleActionCreated = () => {
    setIsCreateActionModalOpen(false);
    fetchDashboardData();
  };

  const handleTakeAction = async (actionId: number) => {
    try {
      await api.put(`/api/actions/${actionId}/take`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error taking action:', error);
    }
  };

  const handleCompleteAction = async (actionId: number) => {
    try {
      await api.put(`/api/actions/${actionId}/complete`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error completing action:', error);
    }
  };

  const handleReleaseAction = async (actionId: number) => {
    try {
      await api.put(`/api/actions/${actionId}/release`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error releasing action:', error);
    }
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsIncidentDetailModalOpen(true);
  };

  const handleIncidentUpdated = () => {
    setIsIncidentDetailModalOpen(false);
    setSelectedIncident(null);
    fetchDashboardData();
  };

  const handleActionClick = (action: Action) => {
    setSelectedAction(action);
    setIsActionDetailModalOpen(true);
  };

  const handleActionUpdated = () => {
    setIsActionDetailModalOpen(false);
    setSelectedAction(null);
    fetchDashboardData();
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      case 'sac':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getRoleActions = (role: string) => {
    const actions = [];
    
    if (hasPermission(['incidents:create'])) {
      actions.push(
        <MobileButton
          key="create-incident"
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => setIsCreateIncidentModalOpen(true)}
          className="mb-3"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nieuw Incident
        </MobileButton>
      );
    }
    
    if (hasPermission(['actions:create'])) {
      actions.push(
        <MobileButton
          key="create-action"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => setIsCreateActionModalOpen(true)}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Nieuwe Actie
        </MobileButton>
      );
    }
    
    return actions;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in progress':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'closed':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Laden...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fout bij laden</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <MobileButton
                variant="primary"
                onClick={fetchDashboardData}
              >
                Opnieuw proberen
              </MobileButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <MobilePageHeader
          title="Dashboard"
          subtitle={`Welkom terug, ${user.username}`}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
          }
          className="mb-6"
        />

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 mobile-text-lg">Snelle Acties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {getRoleActions(user.role_name || 'User')}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MobileOptimizedCard variant="elevated" className="text-center">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600 mb-2">{todaysIncidents.length}</div>
              <div className="text-sm text-gray-600">Incidenten Vandaag</div>
            </CardContent>
          </MobileOptimizedCard>
          
          <MobileOptimizedCard variant="elevated" className="text-center">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600 mb-2">{pendingActions.length}</div>
              <div className="text-sm text-gray-600">Openstaande Acties</div>
            </CardContent>
          </MobileOptimizedCard>
          
          <MobileOptimizedCard variant="elevated" className="text-center">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {availableUsers.length}
              </div>
              <div className="text-sm text-gray-600">Beschikbare Gebruikers</div>
            </CardContent>
          </MobileOptimizedCard>
          
          <MobileOptimizedCard variant="elevated" className="text-center">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {user.role_name || 'User'}
              </div>
              <div className="text-sm text-gray-600">Jouw Rol</div>
            </CardContent>
          </MobileOptimizedCard>
        </div>

        {/* Today's Incidents */}
        {todaysIncidents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 mobile-text-lg">Incidenten van Vandaag</h2>
            <div className="space-y-4">
              {todaysIncidents.map((incident) => (
                <MobileOptimizedCard
                  key={incident.id}
                  variant="elevated"
                  onClick={() => handleIncidentClick(incident)}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mobile-text-base">
                        {incident.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(incident.priority)}`}>
                          {incident.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3 mobile-text-sm">
                      {incident.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>{incident.category_name || 'Geen categorie'}</span>
                        <span>{incident.location_name || 'Geen locatie'}</span>
                      </div>
                      <span>{formatTime(incident.created_at)}</span>
                    </div>
                  </CardContent>
                </MobileOptimizedCard>
              ))}
            </div>
          </div>
        )}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 mobile-text-lg">Openstaande Acties</h2>
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <MobileOptimizedCard
                  key={action.id}
                  variant="elevated"
                  onClick={() => handleActionClick(action)}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mobile-text-base">
                        {action.action_description}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(action.status)}`}>
                        {action.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3 mobile-text-sm">
                      <p className="mb-1"><strong>Incident:</strong> {action.incident_title}</p>
                      <p className="mb-1"><strong>Prioriteit:</strong> {action.incident_priority}</p>
                      {action.assigned_to_name && (
                        <p><strong>Toegewezen aan:</strong> {action.assigned_to_name}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{action.created_by_name}</span>
                      <span>{formatDate(action.created_at)}</span>
                    </div>
                  </CardContent>
                </MobileOptimizedCard>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {todaysIncidents.length === 0 && pendingActions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen activiteit vandaag</h3>
            <p className="text-gray-600 mb-6">Er zijn geen incidenten of acties voor vandaag.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {getRoleActions(user.role_name || 'User')}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateIncidentModal
        isOpen={isCreateIncidentModalOpen}
        onClose={() => setIsCreateIncidentModalOpen(false)}
        onIncidentCreated={handleIncidentCreated}
      />
      
      <CreateActionModal
        isOpen={isCreateActionModalOpen}
        onClose={() => setIsCreateActionModalOpen(false)}
        onSuccess={handleActionCreated}
        availableUsers={availableUsers}
      />
      
      <IncidentDetailModal
        isOpen={isIncidentDetailModalOpen}
        onClose={() => setIsIncidentDetailModalOpen(false)}
        incident={selectedIncident}
        onIncidentUpdated={handleIncidentUpdated}
      />
      
      <ActionDetailModal
        isOpen={isActionDetailModalOpen}
        onClose={() => setIsActionDetailModalOpen(false)}
        action={selectedAction}
        onActionUpdated={handleActionUpdated}
      />
    </div>
  );
}; 