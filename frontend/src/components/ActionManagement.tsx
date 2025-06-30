import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CreateActionModal } from './CreateActionModal';
import { ActionDetailModal } from './ActionDetailModal';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Action {
  id: number;
  incident_id: number;
  action_description: string;
  status: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  incident_title: string;
  incident_priority: string;
  incident_status: string;
  category_name?: string;
  location_name?: string;
  notes?: string;
}

interface ActionStats {
  pendingActions: number;
  inProgressActions: number;
  completedToday: number;
  myActions: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role_name: string;
}

export const ActionManagement: React.FC = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [stats, setStats] = useState<ActionStats>({
    pendingActions: 0,
    inProgressActions: 0,
    completedToday: 0,
    myActions: 0
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<'pending' | 'all' | 'archive'>('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isActionDetailModalOpen, setIsActionDetailModalOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    incident_id: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  useEffect(() => {
    fetchActionStats();
    fetchAvailableUsers();
    fetchActions();
  }, []);

  useEffect(() => {
    fetchActions();
  }, [currentView, pagination.page, filters]);

  const fetchActionStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching action stats:', err);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching available users:', err);
    }
  };

  const fetchActions = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      // Add filters
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.incident_id) params.append('incident_id', filters.incident_id);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      switch (currentView) {
        case 'pending':
          endpoint = `${BACKEND_URL}/api/actions/pending`;
          break;
        case 'archive':
          endpoint = `${BACKEND_URL}/api/actions/archive?${params}`;
          break;
        default:
          endpoint = `${BACKEND_URL}/api/actions?${params}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        let filteredActions = data.actions || [];

        // Client-side search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredActions = filteredActions.filter((action: Action) =>
            action.action_description.toLowerCase().includes(searchLower) ||
            action.incident_title.toLowerCase().includes(searchLower)
          );
        }

        setActions(filteredActions);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError('Fout bij het laden van acties');
      }
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError('Netwerkfout bij het laden van acties');
    } finally {
      setIsLoading(false);
    }
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
        fetchActions();
        fetchActionStats();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij het oppakken van actie');
      }
    } catch (err) {
      console.error('Error taking action:', err);
      setError('Netwerkfout bij het oppakken van actie');
    }
  };

  const handleUpdateStatus = async (actionId: number, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${actionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        fetchActions();
        fetchActionStats();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij het bijwerken van actie status');
      }
    } catch (err) {
      console.error('Error updating action status:', err);
      setError('Netwerkfout bij het bijwerken van actie status');
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
        fetchActions();
        fetchActionStats();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij het loslaten van actie');
      }
    } catch (err) {
      console.error('Error releasing action:', err);
      setError('Netwerkfout bij het loslaten van actie');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      assigned_to: '',
      incident_id: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleActionCreated = () => {
    fetchActions();
    fetchActionStats();
  };

  const handleActionClick = (action: Action) => {
    setSelectedAction(action);
    setIsActionDetailModalOpen(true);
  };

  const handleActionUpdated = () => {
    fetchActions();
    fetchActionStats();
    setIsActionDetailModalOpen(false);
    setSelectedAction(null);
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
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canTakeAction = (action: Action) => {
    return !action.assigned_to && action.status === 'Pending';
  };

  const canUpdateAction = (action: Action) => {
    return (
      action.assigned_to === user?.id || 
      action.created_by === user?.id || 
      user?.role_name === 'Admin'
    ) && action.status !== 'Completed';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-first Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="px-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Actie Beheer</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Beheer en volg alle acties</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto touch-manipulation"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nieuwe Actie
        </Button>
      </div>

      {/* Mobile-optimized Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="card-interactive">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Openstaand</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.pendingActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">In Behandeling</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.inProgressActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Vandaag Voltooid</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Mijn Acties</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{stats.myActions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-optimized View Tabs */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setCurrentView('pending')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm font-medium transition-colors touch-manipulation ${
            currentView === 'pending'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="block sm:hidden">Openstaand</span>
          <span className="hidden sm:block">Openstaande Acties</span>
        </button>
        <button
          onClick={() => setCurrentView('all')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm font-medium transition-colors touch-manipulation ${
            currentView === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="block sm:hidden">Alle</span>
          <span className="hidden sm:block">Alle Acties</span>
        </button>
        <button
          onClick={() => setCurrentView('archive')}
          className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm font-medium transition-colors touch-manipulation ${
            currentView === 'archive'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Archief
        </button>
      </div>

      {/* Mobile-optimized Filters */}
      {currentView !== 'pending' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
                <CardDescription className="hidden sm:block">Filter acties op basis van verschillende criteria</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden touch-manipulation"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters ? 'Verbergen' : 'Tonen'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className={`${showFilters ? 'block' : 'hidden sm:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
              {/* Search */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium mb-2 block">Zoeken</label>
                <Input
                  placeholder="Zoek in beschrijving..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="text-base sm:text-sm"
                />
              </div>

              {/* Status */}
              {currentView !== 'archive' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    <option value="">Alle statussen</option>
                    <option value="Pending">Openstaand</option>
                    <option value="In Progress">In Behandeling</option>
                    <option value="Completed">Voltooid</option>
                  </select>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="text-sm font-medium mb-2 block">Prioriteit</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                >
                  <option value="">Alle prioriteiten</option>
                  <option value="Low">Laag</option>
                  <option value="Medium">Gemiddeld</option>
                  <option value="High">Hoog</option>
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label className="text-sm font-medium mb-2 block">Toegewezen aan</label>
                <select
                  value={filters.assigned_to}
                  onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                >
                  <option value="">Iedereen</option>
                  <option value="unassigned">Niet toegewezen</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>

              {/* Date Range - Mobile: Stack, Desktop: Side by side */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Van datum</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tot datum</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="text-base sm:text-sm"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end col-span-1 sm:col-span-2 lg:col-span-1">
                <Button 
                  variant="outline" 
                  onClick={clearFilters} 
                  className="w-full touch-manipulation"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Wis filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile-optimized Actions List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-base sm:text-lg">
                {currentView === 'pending' && 'Openstaande Acties'}
                {currentView === 'all' && 'Alle Acties'}
                {currentView === 'archive' && 'Actie Archief'}
              </CardTitle>
              <CardDescription className="text-sm">
                {actions.length} acties gevonden
                {pagination.total > 0 && currentView !== 'pending' && (
                  <span className="hidden sm:inline"> • Pagina {pagination.page} van {pagination.totalPages}</span>
                )}
              </CardDescription>
            </div>
            {pagination.total > 0 && currentView !== 'pending' && (
              <div className="text-xs text-gray-500 sm:hidden">
                Pagina {pagination.page} van {pagination.totalPages}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md mb-4">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <svg className="animate-spin h-6 w-6 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm sm:text-base">Acties laden...</span>
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500 px-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-base sm:text-lg font-medium mb-2">Geen acties gevonden</h3>
              <p className="text-sm sm:text-base mb-4">Er zijn geen acties die voldoen aan de huidige criteria.</p>
              {currentView !== 'pending' && (
                <Button variant="outline" onClick={clearFilters} className="touch-manipulation">
                  Wis alle filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="p-3 sm:p-4 border rounded-lg hover:shadow-sm transition-all duration-200 card-interactive cursor-pointer"
                  onClick={() => handleActionClick(action)}
                >
                  {/* Mobile-first Action Header */}
                  <div className="flex flex-col space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm sm:text-base line-clamp-1">
                            #{action.id} - {action.incident_title}
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(action.incident_priority)}`}>
                              {action.incident_priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(action.status)}`}>
                              {action.status === 'Pending' ? 'Openstaand' : 
                               action.status === 'In Progress' ? 'In Behandeling' : 'Voltooid'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 mb-2">
                          {action.action_description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Mobile-optimized Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {canTakeAction(action) && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeAction(action.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm touch-manipulation"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Oppakken
                        </Button>
                      )}
                      
                      {canUpdateAction(action) && action.status === 'In Progress' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(action.id, 'Completed');
                            }}
                            className="border-green-200 text-green-700 hover:bg-green-50 text-xs sm:text-sm touch-manipulation"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Voltooien
                          </Button>
                          
                          {action.assigned_to === user?.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReleaseAction(action.id);
                              }}
                              className="border-orange-200 text-orange-700 hover:bg-orange-50 text-xs sm:text-sm touch-manipulation"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Loslaten
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Mobile-optimized Metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0 pt-2 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {action.location_name && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="truncate">{action.location_name}</span>
                          </span>
                        )}
                        {action.category_name && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="truncate">{action.category_name}</span>
                          </span>
                        )}
                        {action.assigned_to_name && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="truncate">{action.assigned_to_name}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-right">
                        <span className="truncate">{action.created_by_name}</span>
                        <span>•</span>
                        <span className="hidden sm:inline">{formatDate(action.created_at)}</span>
                        <span className="sm:hidden">{formatDateShort(action.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile-optimized Pagination */}
      {pagination.totalPages > 1 && currentView !== 'pending' && (
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-2">
          {/* Mobile: Simplified pagination */}
          <div className="flex items-center space-x-2 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <span className="text-sm text-gray-600 px-3">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>

          {/* Desktop: Full pagination */}
          <div className="hidden sm:flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1}
              className="touch-manipulation"
            >
              Eerste
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum <= pagination.totalPages) {
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "default" : "outline"}
                    onClick={() => handlePageChange(pageNum)}
                    className="w-10 touch-manipulation"
                  >
                    {pageNum}
                  </Button>
                );
              }
              return null;
            })}
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              className="touch-manipulation"
            >
              Laatste
            </Button>
          </div>
        </div>
      )}

      {/* Create Action Modal */}
      <CreateActionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleActionCreated}
        availableUsers={availableUsers}
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
}; 