import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { api } from '../lib/api';

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
}

interface User {
  id: number;
  username: string;
  email: string;
  role_name: string;
}

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableUsers: User[];
  preselectedIncidentId?: number;
}

export const CreateActionModal: React.FC<CreateActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableUsers,
  preselectedIncidentId
}) => {
  const [formData, setFormData] = useState({
    incident_id: preselectedIncidentId?.toString() || '',
    action_description: '',
    assigned_to: ''
  });
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch incidents when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchIncidents();
      // Reset form when modal opens
      setFormData({
        incident_id: preselectedIncidentId?.toString() || '',
        action_description: '',
        assigned_to: ''
      });
      setError('');
    }
  }, [isOpen, preselectedIncidentId]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Filter for open incidents only
        const openIncidents = data.incidents?.filter((incident: Incident) => 
          incident.status !== 'Closed'
        ) || [];
        setIncidents(openIncidents);
      } else {
        console.error('Failed to fetch incidents');
        setError('Fout bij het laden van incidenten');
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Fout bij het laden van incidenten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validation
    if (!formData.incident_id) {
      setError('Incident is verplicht');
      setIsSubmitting(false);
      return;
    }
    if (!formData.action_description.trim()) {
      setError('Actie beschrijving is verplicht');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/api/actions', {
        incident_id: parseInt(formData.incident_id),
        action_description: formData.action_description,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null
      });

      console.log('Action created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating action:', err);
      setError(err.response?.data?.message || err.message || 'Netwerkfout. Probeer het opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'text-blue-600';
      case 'in progress': return 'text-yellow-600';
      case 'closed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Nieuwe Actie Aanmaken</CardTitle>
                <CardDescription>
                  Maak een nieuwe actie aan en wijs deze toe aan een incident
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-6 w-6 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Formulier laden...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                {/* Incident Selection - Required */}
                <div className="space-y-2">
                  <label htmlFor="incident_id" className="text-sm font-medium">
                    Incident <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="incident_id"
                    name="incident_id"
                    value={formData.incident_id}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting || !!preselectedIncidentId}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecteer incident...</option>
                    {incidents.map(incident => (
                      <option key={incident.id} value={incident.id}>
                        #{incident.id} - {incident.title} 
                        ({incident.priority} - {incident.status})
                      </option>
                    ))}
                  </select>
                  {formData.incident_id && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      {(() => {
                        const selectedIncident = incidents.find(i => i.id.toString() === formData.incident_id);
                        if (selectedIncident) {
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${getPriorityColor(selectedIncident.priority)}`}>
                                  {selectedIncident.priority} Prioriteit
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className={`text-sm font-medium ${getStatusColor(selectedIncident.status)}`}>
                                  {selectedIncident.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{selectedIncident.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                {selectedIncident.location_name && (
                                  <span>{selectedIncident.location_name}</span>
                                )}
                                {selectedIncident.category_name && (
                                  <span>{selectedIncident.category_name}</span>
                                )}
                                <span>Door {selectedIncident.created_by_name}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Action Description - Required */}
                <div className="space-y-2">
                  <label htmlFor="action_description" className="text-sm font-medium">
                    Actie Beschrijving <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="action_description"
                    name="action_description"
                    placeholder="Beschrijf de actie die ondernomen moet worden..."
                    value={formData.action_description}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>

                {/* Assign To - Optional */}
                <div className="space-y-2">
                  <label htmlFor="assigned_to" className="text-sm font-medium">
                    Toewijzen aan <span className="text-muted-foreground">(optioneel)</span>
                  </label>
                  <select
                    id="assigned_to"
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Niet toegewezen (iedereen kan oppakken)</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.role_name})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    Als je geen persoon selecteert, kan elke Security Officer de actie oppakken
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Actie aanmaken...
                      </>
                    ) : (
                      'Actie Aanmaken'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 