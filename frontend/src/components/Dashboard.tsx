import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CreateIncidentModal } from './CreateIncidentModal';
import { CreateActionModal } from './CreateActionModal';
import { IncidentDetailModal } from './IncidentDetailModal';
import { ActionDetailModal } from './ActionDetailModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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

interface IncidentStats {
  todayIncidents: number;
  openIncidents: number;
  inProgressIncidents: number;
  resolvedToday: number;
}

interface ActionStats {
  pendingActions: number;
  inProgressActions: number;
  completedToday: number;
  myActions: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role_name: string;
}

type SacStatVariant = 'blue' | 'red' | 'orange' | 'green';

const sacStatStyles: Record<SacStatVariant, { gradient: string; value: string; label: string }> = {
  blue: {
    gradient: 'from-sky-50/90 to-white',
    value: 'text-sky-700',
    label: 'text-sky-800/70',
  },
  red: {
    gradient: 'from-rose-50/90 to-white',
    value: 'text-rose-700',
    label: 'text-rose-900/70',
  },
  orange: {
    gradient: 'from-amber-50/90 to-white',
    value: 'text-amber-800',
    label: 'text-amber-900/70',
  },
  green: {
    gradient: 'from-emerald-50/90 to-white',
    value: 'text-emerald-700',
    label: 'text-emerald-900/70',
  },
};

function SacStatTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: SacStatVariant;
}) {
  const s = sacStatStyles[variant];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-br ${s.gradient} p-3.5 shadow-sm ring-1 ring-black/[0.03] transition-transform active:scale-[0.98] md:p-4`}
    >
      <p className={`text-[0.875rem] font-semibold uppercase tracking-wide ${s.label}`}>{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums tracking-tight md:text-4xl ${s.value}`}>{value}</p>
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [todaysIncidents, setTodaysIncidents] = useState<Incident[]>([]);
  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  const [stats, setStats] = useState<IncidentStats>({
    todayIncidents: 0,
    openIncidents: 0,
    inProgressIncidents: 0,
    resolvedToday: 0
  });
  const [actionStats, setActionStats] = useState<ActionStats>({
    pendingActions: 0,
    inProgressActions: 0,
    completedToday: 0,
    myActions: 0
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateIncidentModalOpen, setIsCreateIncidentModalOpen] = useState(false);
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isIncidentDetailModalOpen, setIsIncidentDetailModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isActionDetailModalOpen, setIsActionDetailModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch data for SAC users
  useEffect(() => {
    if (!user) return;
    
    if (user.role_name === 'SAC' || user.role_name === 'Admin') {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (!user) return null;

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Fetch data in parallel
      const [incidentsRes, actionsRes, statsRes, actionStatsRes, usersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/incidents/today`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/actions/pending`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/incidents/stats`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/actions/stats`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/actions/users`, { headers, credentials: 'include' })
      ]);

      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        setTodaysIncidents(incidentsData.incidents || []);
      }

      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        setPendingActions(actionsData.actions || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (actionStatsRes.ok) {
        const actionStatsData = await actionStatsRes.json();
        setActionStats(actionStatsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAvailableUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Er is een fout opgetreden bij het laden van de dashboard gegevens.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncidentCreated = () => {
    fetchDashboardData(true);
    setIsCreateIncidentModalOpen(false);
  };

  const handleActionCreated = () => {
    fetchDashboardData(true);
  };

  const handleTakeAction = async (actionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${actionId}/take`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Error taking action:', err);
    }
  };

  const handleCompleteAction = async (actionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${actionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'Completed' })
      });

      if (response.ok) {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Error completing action:', err);
    }
  };

  const handleReleaseAction = async (actionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${actionId}/release`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Error releasing action:', err);
    }
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsIncidentDetailModalOpen(true);
  };

  const handleIncidentUpdated = () => {
    fetchDashboardData(true);
    setIsIncidentDetailModalOpen(false);
    setSelectedIncident(null);
  };

  const handleActionClick = (action: Action) => {
    setSelectedAction(action);
    setIsActionDetailModalOpen(true);
  };

  const handleActionUpdated = () => {
    fetchDashboardData(true);
    setIsActionDetailModalOpen(false);
    setSelectedAction(null);
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
      case 'Stakeholder':
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

  // SAC Dashboard - Show operational data
  if (user.role_name === 'SAC' || user.role_name === 'Admin') {
    return (
      <div className="space-y-4 md:space-y-6">
          {/* Stats — 2×2 on mobile, row of 4 on md+ */}
          <section aria-label="Incident statistieken">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <SacStatTile label="Vandaag gemeld" value={stats.todayIncidents} variant="blue" />
              <SacStatTile label="Open incidenten" value={stats.openIncidents} variant="red" />
              <SacStatTile label="In behandeling" value={stats.inProgressIncidents} variant="orange" />
              <SacStatTile label="Vandaag opgelost" value={stats.resolvedToday} variant="green" />
            </div>
          </section>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {/* Left Column - Today's Incidents */}
            <Card className="overflow-hidden border-border/80 shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="space-y-1 p-4 pb-3 sm:p-6 sm:pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold md:text-lg">Incidenten van vandaag</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Alles wat vandaag is gemeld</CardDescription>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="inline-flex shrink-0"
                    onClick={() => setIsCreateIncidentModalOpen(true)}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nieuw incident
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                <div className="max-h-[min(24rem,55vh)] space-y-2 overflow-y-auto overscroll-contain sm:max-h-96 sm:space-y-3">
                  {todaysIncidents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 text-center text-muted-foreground">
                      <svg className="mx-auto mb-3 h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Geen incidenten vandaag</p>
                    </div>
                  ) : (
                    todaysIncidents.map((incident) => (
                      <div 
                        key={incident.id} 
                        className="cursor-pointer rounded-xl border border-border/60 bg-card p-3 transition hover:border-border hover:shadow-sm active:scale-[0.995]"
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
                        <p className="mb-2 line-clamp-2 text-sm text-slate-600">{incident.description}</p>
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
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

            {/* Right Column - Pending Actions */}
            <Card className="overflow-hidden border-border/80 shadow-md ring-1 ring-black/[0.04]">
              <CardHeader className="space-y-1 p-4 pb-3 sm:p-6 sm:pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold md:text-lg">Openstaande acties</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Nog uit te voeren</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => setIsCreateActionModalOpen(true)}>
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nieuwe actie
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                <div className="max-h-[min(24rem,55vh)] space-y-2 overflow-y-auto overscroll-contain sm:max-h-96 sm:space-y-3">
                  {pendingActions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 text-center text-muted-foreground">
                      <svg className="mx-auto mb-3 h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className="text-sm">Geen openstaande acties</p>
                    </div>
                  ) : (
                    pendingActions.map((action) => (
                      <div 
                        key={action.id} 
                        className="cursor-pointer rounded-xl border border-border/60 bg-card p-3 transition hover:border-border hover:shadow-sm active:scale-[0.995]"
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1 line-clamp-1">{action.incident_title}</h4>
                            <p className="line-clamp-2 text-sm text-slate-600">{action.action_description}</p>
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
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTakeAction(action.id);
                                }}
                                className="h-7 px-2 text-xs"
                              >
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
                        
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                          <div className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
  const actions = getRoleActions(user.role_name);

  return (
    <div className="space-y-6">
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
      {user.role_name === 'Stakeholder' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">📊 KPI Dashboard Beschikbaar</h3>
                <p className="text-blue-700 mt-1">Bekijk uitgebreide prestatie-indicatoren en analytics</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.hash = '#kpi-dashboard'}
                className="border-blue-300 text-blue-900 hover:bg-blue-50"
              >
                Open KPI Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats for non-SAC users */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Snel Overzicht</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.openIncidents}</p>
                <p className="text-sm text-muted-foreground">Open Incidenten</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
                <p className="text-sm text-muted-foreground">Vandaag Opgelost</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.inProgressIncidents}</p>
                <p className="text-sm text-muted-foreground">In Behandeling</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{actionStats.completedToday}</p>
                <p className="text-sm text-muted-foreground">Acties Voltooid</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 