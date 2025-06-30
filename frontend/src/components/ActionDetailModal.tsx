import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
  incident_status?: string;
  category_name?: string;
  location_name?: string;
  notes?: string;
  due_date?: string;
}

interface ActionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: Action | null;
  onActionUpdated?: () => void;
  onSuccess?: () => void;
}

export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({
  isOpen,
  onClose,
  action,
  onActionUpdated,
  onSuccess
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState({
    action_description: '',
    status: '',
    notes: ''
  });

  useEffect(() => {
    if (action) {
      setEditData({
        action_description: action.action_description,
        status: action.status,
        notes: action.notes || ''
      });
    }
  }, [action]);

  if (!isOpen || !action) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!action) return;
    
    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${action.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setIsEditing(false);
        onActionUpdated?.();
        onSuccess?.();
      } else {
        const errorText = await response.text();
        console.error('Save action error:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${errorText}` };
        }
        setError(errorData.message || `Er is een fout opgetreden bij het opslaan (${response.status})`);
      }
    } catch (err) {
      console.error('Error saving action:', err);
      setError(`Netwerk fout: ${err instanceof Error ? err.message : 'Er is een fout opgetreden bij het opslaan'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTakeAction = async () => {
    if (!action) return;
    
    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${action.id}/take`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        onActionUpdated?.();
        onSuccess?.();
      } else {
        const errorText = await response.text();
        console.error('Take action error:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${errorText}` };
        }
        setError(errorData.message || `Er is een fout opgetreden (${response.status})`);
      }
    } catch (err) {
      console.error('Error taking action:', err);
      setError(`Netwerk fout: ${err instanceof Error ? err.message : 'Er is een fout opgetreden'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteAction = async () => {
    if (!action) return;
    
    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${action.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'Completed' })
      });

      if (response.ok) {
        onActionUpdated?.();
        onSuccess?.();
      } else {
        const errorText = await response.text();
        console.error('Complete action error:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${errorText}` };
        }
        setError(errorData.message || `Er is een fout opgetreden (${response.status})`);
      }
    } catch (err) {
      console.error('Error completing action:', err);
      setError(`Netwerk fout: ${err instanceof Error ? err.message : 'Er is een fout opgetreden'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReleaseAction = async () => {
    if (!action) return;
    
    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions/${action.id}/release`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        onActionUpdated?.();
        onSuccess?.();
      } else {
        const errorText = await response.text();
        console.error('Release action error:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${errorText}` };
        }
        setError(errorData.message || `Er is een fout opgetreden (${response.status})`);
      }
    } catch (err) {
      console.error('Error releasing action:', err);
      setError(`Netwerk fout: ${err instanceof Error ? err.message : 'Er is een fout opgetreden'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Completed':
        return 'bg-green-50 text-green-800 border-green-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Low':
        return 'bg-green-50 text-green-800 border-green-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canTakeAction = () => {
    return action.status === 'Pending' && (!action.assigned_to || action.assigned_to !== user?.id);
  };

  const canUpdateAction = () => {
    return action.assigned_to === user?.id || user?.role_name === 'Admin';
  };

  const canEditAction = () => {
    return action.assigned_to === user?.id || user?.role_name === 'Admin';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      {/* Mobile-first responsive modal */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                {isEditing ? 'Actie Bewerken' : 'Actie Details'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                ID: {action.id} • {formatDateTime(action.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {!isEditing && canEditAction() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isSaving || isLoading}
                className="touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] p-1 sm:p-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline ml-1">Bewerken</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] p-1 sm:p-2 hover:bg-gray-200"
              disabled={isSaving}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
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

          <div className="space-y-4 sm:space-y-6">
            {/* Status and Priority badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(action.status)}`}>
                Status: {action.status === 'Pending' ? 'Openstaand' : 
                         action.status === 'In Progress' ? 'In Behandeling' : 'Voltooid'}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(action.incident_priority)}`}>
                Prioriteit: {action.incident_priority}
              </span>
            </div>

            {/* Related Incident */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gerelateerd Incident
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">#{action.incident_id} - {action.incident_title}</h4>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {action.location_name && <span>📍 {action.location_name}</span>}
                  {action.category_name && <span>🏷️ {action.category_name}</span>}
                </div>
              </div>
            </div>

            {/* Action Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actie Beschrijving
              </label>
              {isEditing ? (
                <textarea
                  name="action_description"
                  value={editData.action_description}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                />
              ) : (
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {action.action_description}
                </p>
              )}
            </div>

            {/* Status (if editing) */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={editData.status}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                >
                  <option value="Pending">Openstaand</option>
                  <option value="In Progress">In Behandeling</option>
                  <option value="Completed">Voltooid</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notities
              </label>
              {isEditing ? (
                <textarea
                  name="notes"
                  value={editData.notes}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  rows={3}
                  placeholder="Voeg notities toe..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                />
              ) : (
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {action.notes || 'Geen notities toegevoegd'}
                </p>
              )}
            </div>

            {/* Assignment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Toegewezen aan
                </label>
                <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">
                  {action.assigned_to_name || 'Niet toegewezen'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aangemaakt door
                </label>
                <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">
                  {action.created_by_name}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {!isEditing && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                {canTakeAction() && (
                  <Button
                    onClick={handleTakeAction}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 touch-manipulation"
                  >
                    {isSaving ? 'Bezig...' : 'Actie Oppakken'}
                  </Button>
                )}
                
                {canUpdateAction() && action.status === 'In Progress' && (
                  <>
                    <Button
                      onClick={handleCompleteAction}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 touch-manipulation"
                    >
                      {isSaving ? 'Bezig...' : 'Voltooien'}
                    </Button>
                    
                    {action.assigned_to === user?.id && (
                      <Button
                        variant="outline"
                        onClick={handleReleaseAction}
                        disabled={isSaving}
                        className="border-orange-200 text-orange-700 hover:bg-orange-50 touch-manipulation"
                      >
                        {isSaving ? 'Bezig...' : 'Loslaten'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer (if editing) */}
        {isEditing && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 p-3 sm:p-4 lg:p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setError('');
                // Reset edit data
                setEditData({
                  action_description: action.action_description,
                  status: action.status,
                  notes: action.notes || ''
                });
              }}
              disabled={isSaving}
              className="w-full sm:w-auto order-2 sm:order-1 touch-manipulation"
            >
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto order-1 sm:order-2 touch-manipulation"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Opslaan...</span>
                </div>
              ) : (
                'Opslaan'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 