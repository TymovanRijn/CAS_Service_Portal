import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CreateIncidentModal } from './CreateIncidentModal';
import { CreateActionModal } from './CreateActionModal';
import { IncidentDetailModal } from './IncidentDetailModal';
import { ActionDetailModal } from './ActionDetailModal';
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

      // Set the fetched data
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
    // Refresh dashboard data after incident creation
    fetchDashboardData();
    setIsCreateIncidentModalOpen(false);
  };

  const handleActionCreated = () => {
    // Refresh dashboard data after action creation
    fetchDashboardData();
  };

  const handleTakeAction = async (actionId: number) => {
    try {
      await api.put(`/api/actions/${actionId}/take`);
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error('Error taking action:', err);
    }
  };

  const handleCompleteAction = async (actionId: number) => {
    try {
      await api.put(`/api/actions/${actionId}/status`, { status: 'Completed' });
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error('Error completing action:', err);
    }
  };

  const handleReleaseAction = async (actionId: number) => {
    try {
      await api.put(`/api/actions/${actionId}/release`);
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error('Error releasing action:', err);
    }
  };



  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsIncidentDetailModalOpen(true);
  };

  const handleIncidentUpdated = () => {
    // Refresh dashboard data after incident update
    fetchDashboardData();
    setIsIncidentDetailModalOpen(false);
    setSelectedIncident(null);
  };

  const handleActionClick = (action: Action) => {
    setSelectedAction(action);
    setIsActionDetailModalOpen(true);
  };

  const handleActionUpdated = () => {
    fetchDashboardData();
    setIsActionDetailModalOpen(false);
    setSelectedAction(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'Security Officer':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'Dashboard Viewer':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  const getRoleActions = (role: string) => {
    switch (role) {
      case 'Admin':
        return [
          { title: 'User Management', description: 'Manage users and permissions', href: '/admin/users' },
          { title: 'System Settings', description: 'Configure system settings', href: '/admin/settings' },
          { title: 'Audit Logs', description: 'View system audit logs', href: '/admin/logs' },
          { title: 'Incident Management', description: 'Manage all incidents', href: '/incidents' },
        ];
      case 'Dashboard Viewer':
        return [
          { title: 'Reports', description: 'View management reports', href: '/reports' },
          { title: 'Knowledge Base', description: 'Browse incident solutions', href: '/knowledge-base' },
        ];
      default:
        return [];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'closed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Dashboard laden...</p>
        </div>
      </div>
    );
  }

      // Permission-based Dashboard - Show operational data for users with dashboard access
    if (hasPermission(['dashboard:read', 'incidents:read', 'actions:read'])) {
    return (
      <div className="space-y-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                {getRoleIcon(user.role_name || 'User')}
              </div>
              <div>
                <h2 className="text-xl font-bold">Welkom terug, {user.username}!</h2>
                <p className="text-muted-foreground">{user.role_description || user.role_name}</p>
              </div>
            </div>
          </div>



          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Today's Incidents */}
            {hasPermission(['incidents:read']) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Incidenten van Vandaag</CardTitle>
                    <CardDescription>Alle incidenten die vandaag zijn gemeld</CardDescription>
                  </div>
                  {hasPermission(['incidents:create']) && (
                  <Button size="sm" onClick={() => setIsCreateIncidentModalOpen(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nieuw Incident
                  </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {todaysIncidents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>Geen incidenten vandaag gemeld</p>
                    </div>
                  ) : (
                    todaysIncidents.map((incident) => (
                      <div 
                        key={incident.id} 
                        className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer hover:bg-muted/10"
                        onClick={() => handleIncidentClick(incident)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm line-clamp-1">{incident.title}</h4>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(incident.priority)}`}>
                              {incident.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{incident.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            {incident.location_name && (
                              <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {incident.location_name}
                              </span>
                            )}
                            {incident.category_name && (
                              <span className="flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                {incident.category_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>{incident.created_by_name}</span>
                            <span>•</span>
                            <span>{formatTime(incident.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Right Column - Pending Actions */}
            {hasPermission(['actions:read']) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Openstaande Acties</CardTitle>
                    <CardDescription>Acties die nog uitgevoerd moeten worden</CardDescription>
                  </div>
                  {hasPermission(['actions:create']) && (
                  <Button variant="outline" size="sm" onClick={() => setIsCreateActionModalOpen(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nieuwe Actie
                  </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {pendingActions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p>Geen openstaande acties</p>
                    </div>
                  ) : (
                    pendingActions.map((action) => (
                      <div 
                        key={action.id} 
                        className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1 line-clamp-1">{action.incident_title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">{action.action_description}</p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(action.incident_priority)}`}>
                              {action.incident_priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(action.status)}`}>
                              {action.status === 'Pending' ? 'Openstaand' : 
                               action.status === 'In Progress' ? 'In Behandeling' : 'Voltooid'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {!action.assigned_to && action.status === 'Pending' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTakeAction(action.id);
                                }}
                                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Oppakken
                              </Button>
                            )}
                            
                            {action.assigned_to === user?.id && action.status === 'In Progress' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteAction(action.id);
                                  }}
                                  className="h-7 px-2 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Voltooien
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReleaseAction(action.id);
                                  }}
                                  className="h-7 px-2 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Loslaten
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{action.assigned_to_name || 'Niet toegewezen'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>{action.created_by_name}</span>
                            <span>•</span>
                            <span>{formatDate(action.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        {/* Create Incident Modal */}
        <CreateIncidentModal
          isOpen={isCreateIncidentModalOpen}
          onClose={() => setIsCreateIncidentModalOpen(false)}
          onIncidentCreated={handleIncidentCreated}
        />

        {/* Create Action Modal */}
        <CreateActionModal
          isOpen={isCreateActionModalOpen}
          onClose={() => setIsCreateActionModalOpen(false)}
          onSuccess={handleActionCreated}
          availableUsers={availableUsers}
        />

        {/* Incident Detail Modal */}
        <IncidentDetailModal
          incident={selectedIncident}
          isOpen={isIncidentDetailModalOpen}
          onClose={() => {
            setIsIncidentDetailModalOpen(false);
            setSelectedIncident(null);
          }}
          onIncidentUpdated={handleIncidentUpdated}
        />

        {/* Action Detail Modal */}
        <ActionDetailModal
          isOpen={isActionDetailModalOpen}
          onClose={() => {
            setIsActionDetailModalOpen(false);
            setSelectedAction(null);
          }}
          action={selectedAction}
          onActionUpdated={handleActionUpdated}
          onSuccess={() => {
            setIsActionDetailModalOpen(false);
            setSelectedAction(null);
          }}
        />
      </div>
    );
  }

  // Other roles - Simple action-based interface
  const actions = getRoleActions(user.role_name || 'Dashboard Viewer');

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            {getRoleIcon(user.role_name || 'Dashboard Viewer')}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welkom terug, {user.username}!</h2>
            <p className="text-muted-foreground">{user.role_description}</p>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">{action.title}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Dashboard Viewer Experience */}
      {user.role_name === 'Dashboard Viewer' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">📊 KPI Dashboard Beschikbaar</h3>
                <p className="text-blue-700 mt-1">Bekijk uitgebreide prestatie-indicatoren en analytics</p>
              </div>
              <Button 
                onClick={() => window.location.hash = '#kpi-dashboard'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Open KPI Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}; 