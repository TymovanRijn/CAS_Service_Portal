import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

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
}

interface Attachment {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Location {
  id: number;
  name: string;
  description: string;
}

interface IncidentDetailModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onIncidentUpdated?: () => void;
  onSuccess?: () => void;
}

// Component for loading images with authentication - Mobile optimized
const AuthenticatedImage: React.FC<{ 
  attachmentId: number; 
  originalName: string; 
  onError: () => void;
  className?: string;
}> = ({ attachmentId, originalName, onError, className }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/incidents/attachments/${attachmentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading image:', error);
        setHasError(true);
        setIsLoading(false);
        onError();
      }
    };

    loadImage();

    // Cleanup function to revoke object URL
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [attachmentId, onError]);

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(true);
    // Prevent body scroll when zoomed
    document.body.style.overflow = 'hidden';
  };

  const handleZoomClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsZoomed(false);
    // Re-enable body scroll
    document.body.style.overflow = 'unset';
  };

  // Handle escape key to close zoom
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomed) {
        handleZoomClose();
      }
    };

    if (isZoomed) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isZoomed]);

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="flex flex-col items-center space-y-2 text-gray-500">
          <svg className="animate-spin w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs sm:text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${className} bg-red-50 border-2 border-dashed border-red-200 rounded-lg flex items-center justify-center`}>
        <div className="text-center text-red-600 p-2 sm:p-4">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs sm:text-sm font-medium">Kan afbeelding niet laden</p>
          <p className="text-xs mt-1 hidden sm:block">Mogelijk geen toegang of bestand beschadigd</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <img
        src={imageSrc}
        alt={originalName}
        className={`${className} cursor-pointer touch-manipulation`}
        onClick={handleImageClick}
      />
      
      {/* Mobile-optimized Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-2 sm:p-4"
          onClick={handleZoomClose}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageSrc}
              alt={originalName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={handleZoomClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 sm:p-3 text-white transition-all duration-200 z-10 touch-manipulation min-w-[44px] min-h-[44px]"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-white text-xs sm:text-sm max-w-[calc(100%-4rem)] sm:max-w-md">
              <p className="truncate">{originalName}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose,
  onIncidentUpdated,
  onSuccess
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: '',
    category_id: '',
    location_id: '',
    possible_solution: ''
  });

  // Handle body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fetch incident details when modal opens or incident changes
  useEffect(() => {
    if (isOpen && incident) {
      fetchIncidentDetails();
      fetchDropdownData();
          setEditData({
      title: incident.title,
      description: incident.description,
      priority: incident.priority,
      category_id: incident.category_id.toString(),
      location_id: incident.location_id.toString(),
      possible_solution: incident.possible_solution || ''
    });
      setError('');
      setIsEditing(false);
    }
  }, [isOpen, incident]);

  const fetchIncidentDetails = async () => {
    if (!incident) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/incidents/${incident.id}/attachments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      } else {
        console.error('Failed to fetch attachments');
        setAttachments([]);
      }
    } catch (err) {
      console.error('Error fetching incident details:', err);
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const [categoriesRes, locationsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/categories`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/locations`, { headers, credentials: 'include' })
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData.locations || []);
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!incident) return;
    
    setIsSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/incidents/${incident.id}`, {
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
        onIncidentUpdated?.();
        onSuccess?.();
        // Optionally refresh the incident data
        // fetchIncidentDetails();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Er is een fout opgetreden bij het opslaan');
      }
    } catch (err) {
      console.error('Error saving incident:', err);
      setError('Er is een fout opgetreden bij het opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAttachment = (attachmentId: number, filename: string) => {
    const token = localStorage.getItem('token');
    
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}/api/incidents/attachments/${attachmentId}?download=true`;
    link.download = filename;
    
    // Add authorization header by creating a fetch request and converting to blob
    fetch(`${BACKEND_URL}/api/incidents/attachments/${attachmentId}?download=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Download error:', error);
      setError('Fout bij het downloaden van het bestand');
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('nl-NL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    // Incidents don't have status - they are just notifications
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!isOpen || !incident) return null;

  // Separate image and document attachments
  const imageAttachments = attachments.filter(att => att.mime_type.startsWith('image/'));
  const documentAttachments = attachments.filter(att => !att.mime_type.startsWith('image/'));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      {/* Mobile-first responsive modal - Smaller and more compact */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                {isEditing ? 'Incident Bewerken' : 'Incident Details'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                ID: {incident.id} • {formatDateTime(incident.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {!isEditing && (
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

        {/* Content - Mobile-first scrollable layout */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] sm:max-h-[calc(85vh-140px)]">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-blue-700">Gegevens laden...</p>
                </div>
              </div>
            )}

            {/* Mobile: Stack layout, Desktop: Two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Left Column - Incident Details */}
              <div className="space-y-4 sm:space-y-6">
                {/* Status and Priority badges - Mobile: Stack, Desktop: Side by side */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                      Status: {incident.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(incident.priority)}`}>
                      Prioriteit: {incident.priority}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    Door: {incident.created_by_name}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel
                  </label>
                  {isEditing ? (
                    <Input
                      name="title"
                      value={editData.title}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      className="w-full text-base sm:text-sm"
                    />
                  ) : (
                    <p className="text-base sm:text-lg font-semibold text-gray-900 p-2 bg-gray-50 rounded-lg">
                      {incident.title}
                    </p>
                  )}
                </div>

                {/* Category and Location - Mobile: Stack, Desktop: Side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categorie
                    </label>
                    {isEditing ? (
                      <select
                        name="category_id"
                        value={editData.category_id}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">
                        {incident.category_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Locatie
                    </label>
                    {isEditing ? (
                      <select
                        name="location_id"
                        value={editData.location_id}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                      >
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">
                        {incident.location_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Priority and Status - Only show in edit mode */}
                {isEditing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prioriteit
                      </label>
                      <select
                        name="priority"
                        value={editData.priority}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                      >
                        <option value="Low">Laag</option>
                        <option value="Medium">Gemiddeld</option>
                        <option value="High">Hoog</option>
                      </select>
                    </div>


                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving
                  </label>
                  {isEditing ? (
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {incident.description}
                    </p>
                  )}
                </div>

                {/* Possible Solution */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mogelijke Oplossing
                  </label>
                  {isEditing ? (
                    <textarea
                      name="possible_solution"
                      value={editData.possible_solution}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {incident.possible_solution || 'Geen oplossing opgegeven'}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Attachments */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Bijlagen ({attachments.length})
                  </h3>

                  {attachments.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
                      <svg className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-2 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">Geen bijlagen beschikbaar</p>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Images Section */}
                      {imageAttachments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Afbeeldingen ({imageAttachments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {imageAttachments.map((attachment) => (
                              <div key={attachment.id} className="relative group">
                                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                                  <AuthenticatedImage
                                    attachmentId={attachment.id}
                                    originalName={attachment.original_name}
                                    onError={() => {}}
                                    className="w-full h-32 sm:h-40 object-cover bg-gray-100"
                                  />
                                  <div className="p-2 sm:p-3 bg-gradient-to-t from-white to-gray-50">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                      {attachment.original_name}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-xs text-gray-500">
                                        {formatFileSize(attachment.file_size)}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadAttachment(attachment.id, attachment.original_name)}
                                        className="touch-manipulation min-w-[32px] min-h-[32px] p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documents Section */}
                      {documentAttachments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Documenten ({documentAttachments.length})
                          </h4>
                          <div className="space-y-2 sm:space-y-3">
                            {documentAttachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                      {attachment.original_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(attachment.file_size)} • {formatDateTime(attachment.uploaded_at)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadAttachment(attachment.id, attachment.original_name)}
                                  className="touch-manipulation min-w-[36px] min-h-[36px] p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Mobile optimized with sticky positioning */}
        {isEditing && (
          <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 p-3 sm:p-4 lg:p-6 border-t border-gray-200 bg-gray-50 shadow-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setError('');
                // Reset edit data
                setEditData({
                  title: incident.title,
                  description: incident.description,
                  priority: incident.priority,
                  category_id: incident.category_id.toString(),
                  location_id: incident.location_id.toString(),
                  possible_solution: incident.possible_solution || ''
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
              className="w-full sm:w-auto order-1 sm:order-2 touch-manipulation bg-blue-600 hover:bg-blue-700 text-white"
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