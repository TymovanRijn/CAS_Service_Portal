import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated?: () => void;
  onSuccess?: () => void;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    category_id: '',
    location_id: '',
    possible_solution: '',
    // SAC KPI Tracking Fields
    was_unregistered_incident: false,
    requires_escalation: false,
    escalation_reason: '',
    incorrect_diagnosis: false,
    incorrect_service_party: false,
    self_resolved_by_sac: false,
    self_resolution_description: '',
    estimated_downtime_minutes: '',
    actual_response_time_minutes: '',
    service_party_arrived_late: false,
    multiple_service_parties_needed: false
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Fetch categories and locations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
      // Reset form when modal opens
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        category_id: '',
        location_id: '',
        possible_solution: '',
        // SAC KPI Tracking Fields
        was_unregistered_incident: false,
        requires_escalation: false,
        escalation_reason: '',
        incorrect_diagnosis: false,
        incorrect_service_party: false,
        self_resolved_by_sac: false,
        self_resolution_description: '',
        estimated_downtime_minutes: '',
        actual_response_time_minutes: '',
        service_party_arrived_late: false,
        multiple_service_parties_needed: false
      });
      setError('');
      setSelectedFiles([]);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchDropdownData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Fetch categories and locations from API
      const [categoriesRes, locationsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/categories`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/locations`, { headers, credentials: 'include' })
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      } else {
        console.error('Failed to fetch categories');
        // Fallback to hardcoded data
        setCategories([
          { id: 1, name: 'Technical', description: 'Technische storingen en problemen' },
          { id: 2, name: 'Security', description: 'Beveiligingsgerelateerde incidenten' },
          { id: 3, name: 'Maintenance', description: 'Onderhoud en reparaties' },
          { id: 4, name: 'Operational', description: 'Operationele verstoringen' }
        ]);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setLocations(locationsData.locations || []);
      } else {
        console.error('Failed to fetch locations');
        // Fallback to hardcoded data
        setLocations([
          { id: 1, name: 'Terminal 1', description: 'Hoofdterminal voor binnenlandse vluchten' },
          { id: 2, name: 'Terminal 2', description: 'Internationale vertrekhal' },
          { id: 3, name: 'Gate A1', description: 'Gate A1 - Security Lane 1' },
          { id: 4, name: 'Gate A2', description: 'Gate A2 - Security Lane 2' },
          { id: 5, name: 'Gate B1', description: 'Gate B1 - Security Lane 3' },
          { id: 6, name: 'Central Security', description: 'Centrale beveiligingspost' },
          { id: 7, name: 'Baggage Hall', description: 'Bagagehal' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      setError('Fout bij het laden van categorieën en locaties');
      // Fallback to hardcoded data
      setCategories([
        { id: 1, name: 'Technical', description: 'Technische storingen en problemen' },
        { id: 2, name: 'Security', description: 'Beveiligingsgerelateerde incidenten' },
        { id: 3, name: 'Maintenance', description: 'Onderhoud en reparaties' },
        { id: 4, name: 'Operational', description: 'Operationele verstoringen' }
      ]);
      setLocations([
        { id: 1, name: 'Terminal 1', description: 'Hoofdterminal voor binnenlandse vluchten' },
        { id: 2, name: 'Terminal 2', description: 'Internationale vertrekhal' },
        { id: 3, name: 'Gate A1', description: 'Gate A1 - Security Lane 1' },
        { id: 4, name: 'Gate A2', description: 'Gate A2 - Security Lane 2' },
        { id: 5, name: 'Gate B1', description: 'Gate B1 - Security Lane 3' },
        { id: 6, name: 'Central Security', description: 'Centrale beveiligingspost' },
        { id: 7, name: 'Baggage Hall', description: 'Bagagehal' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`Bestand "${file.name}" heeft een niet-toegestaan bestandstype.`);
        return false;
      }
      if (file.size > maxSize) {
        setError(`Bestand "${file.name}" is te groot (max 10MB).`);
        return false;
      }
      return true;
    });

    if (validFiles.length !== files.length) {
      return; // Error message already set above
    }

    if (selectedFiles.length + validFiles.length > 5) {
      setError('Maximaal 5 bestanden toegestaan.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(''); // Clear any previous errors
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validation
    if (!formData.title.trim()) {
      setError('Titel is verplicht');
      setIsSubmitting(false);
      return;
    }
    if (!formData.description.trim()) {
      setError('Beschrijving is verplicht');
      setIsSubmitting(false);
      return;
    }
    if (!formData.category_id) {
      setError('Categorie is verplicht');
      setIsSubmitting(false);
      return;
    }
    if (!formData.location_id) {
      setError('Locatie is verplicht');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('priority', formData.priority);
      submitData.append('category_id', formData.category_id);
      submitData.append('location_id', formData.location_id);
      submitData.append('possible_solution', formData.possible_solution);
      
      // Add SAC KPI tracking fields
      submitData.append('was_unregistered_incident', formData.was_unregistered_incident.toString());
      submitData.append('requires_escalation', formData.requires_escalation.toString());
      submitData.append('escalation_reason', formData.escalation_reason || '');
      submitData.append('incorrect_diagnosis', formData.incorrect_diagnosis.toString());
      submitData.append('incorrect_service_party', formData.incorrect_service_party.toString());
      submitData.append('self_resolved_by_sac', formData.self_resolved_by_sac.toString());
      submitData.append('self_resolution_description', formData.self_resolution_description || '');
      submitData.append('estimated_downtime_minutes', formData.estimated_downtime_minutes.toString());
      submitData.append('actual_response_time_minutes', formData.actual_response_time_minutes.toString());
      submitData.append('service_party_arrived_late', formData.service_party_arrived_late.toString());
      submitData.append('multiple_service_parties_needed', formData.multiple_service_parties_needed.toString());
      
      // Add files to FormData
      selectedFiles.forEach((file, index) => {
        submitData.append('attachments', file);
      });

      const response = await fetch(`${BACKEND_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: submitData
      });

      if (response.ok) {
        onIncidentCreated?.();
        onSuccess?.();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Er is een fout opgetreden bij het aanmaken van het incident');
      }
    } catch (err) {
      console.error('Error creating incident:', err);
      setError('Er is een fout opgetreden bij het aanmaken van het incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      {/* Mobile-first responsive modal */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Nieuw Incident</h2>
              <p className="text-sm text-gray-600 hidden sm:block">Meld een nieuw incident of probleem</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="touch-manipulation min-w-[44px] min-h-[44px] p-2 hover:bg-gray-200"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content - Scrollable with mobile-first layout */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-blue-700">Gegevens laden...</p>
                </div>
              </div>
            )}

            {/* Form fields - Mobile responsive grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Left Column */}
              <div className="space-y-4 sm:space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Titel <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Korte beschrijving van het incident"
                    required
                    disabled={isSubmitting}
                    className="w-full text-base sm:text-sm"
                  />
                </div>

                {/* Priority and Category - Mobile: Stack, Desktop: Side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Prioriteit <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                    >
                      <option value="Low">Laag</option>
                      <option value="Medium">Gemiddeld</option>
                      <option value="High">Hoog</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Categorie <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting || isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                    >
                      <option value="">Selecteer categorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Locatie <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="location_id"
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting || isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-sm touch-manipulation"
                  >
                    <option value="">Selecteer locatie</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Gedetailleerde beschrijving van het incident..."
                    required
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                  />
                </div>

                {/* Possible Solution */}
                <div>
                  <label htmlFor="possible_solution" className="block text-sm font-medium text-gray-700 mb-2">
                    Mogelijke Oplossing
                  </label>
                  <textarea
                    id="possible_solution"
                    name="possible_solution"
                    value={formData.possible_solution}
                    onChange={handleInputChange}
                    placeholder="Eventuele suggesties voor oplossing..."
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base sm:text-sm"
                  />
                </div>
              </div>

              {/* Right Column - KPI Tracking & File Upload */}
              <div className="space-y-4 sm:space-y-6">
                {/* SAC KPI Tracking - Simplified */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📊 SAC Tracking (optioneel)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Selecteer wat van toepassing is voor rapportage</p>
                    
                                        {/* Ultra Simple Dropdown - Always Works */}
                    <div>
                      <select
                        name="sac_kpi_selection"
                        onChange={(e) => {
                          const value = e.target.value;
                          // Reset all to false first
                          setFormData(prev => ({
                            ...prev,
                            was_unregistered_incident: false,
                            self_resolved_by_sac: false,
                            requires_escalation: false,
                            service_party_arrived_late: false,
                            incorrect_diagnosis: false
                          }));
                          
                          // Set the selected one to true
                          if (value !== '') {
                            setFormData(prev => ({
                              ...prev,
                              [value]: true
                            }));
                          }
                        }}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Geen bijzonderheden</option>
                        <option value="was_unregistered_incident">Niet geregistreerd incident</option>
                        <option value="self_resolved_by_sac">Zelf opgelost door SAC</option>
                        <option value="requires_escalation">Escalatie/nabellen nodig</option>
                        <option value="service_party_arrived_late">Service party te laat</option>
                        <option value="incorrect_diagnosis">Verkeerde diagnose door service party</option>
                      </select>
                      
                      {/* Show selected value */}
                      <div className="mt-2 text-xs text-gray-500">
                        Geselecteerd: {
                          formData.was_unregistered_incident ? 'Niet geregistreerd incident' :
                          formData.self_resolved_by_sac ? 'Zelf opgelost door SAC' :
                          formData.requires_escalation ? 'Escalatie/nabellen nodig' :
                          formData.service_party_arrived_late ? 'Service party te laat' :
                          formData.incorrect_diagnosis ? 'Verkeerde diagnose door service party' :
                          'Geen'
                        }
                      </div>
                    </div>

                    {/* Quick time input */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Downtime (min)</label>
                          <Input
                            type="number"
                            name="estimated_downtime_minutes"
                            value={formData.estimated_downtime_minutes}
                            onChange={handleInputChange}
                            placeholder="0"
                            disabled={isSubmitting}
                            min="0"
                            className="text-sm h-8"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Reactietijd (min)</label>
                          <Input
                            type="number"
                            name="actual_response_time_minutes"
                            value={formData.actual_response_time_minutes}
                            onChange={handleInputChange}
                            placeholder="0"
                            disabled={isSubmitting}
                            min="0"
                            className="text-sm h-8"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bijlagen
                  </label>
                  
                  {/* File Upload Area - Mobile optimized */}
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className="upload-area h-24 sm:h-28 border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100 transition-all duration-300 flex flex-col items-center justify-center text-center p-3 touch-manipulation">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Sleep bestanden hierheen
                      </p>
                      <p className="text-xs text-gray-500">
                        of <span className="text-blue-600 font-medium">klik om te selecteren</span>
                      </p>
                    </div>
                  </div>

                  {/* File Preview - Mobile optimized */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Geselecteerde bestanden:</h4>
                      <div className="space-y-2 max-h-24 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                {file.type.startsWith('image/') ? (
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              disabled={isSubmitting}
                              className="touch-manipulation min-w-[32px] min-h-[32px] p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Mobile optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto order-2 sm:order-1 touch-manipulation"
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="w-full sm:w-auto order-1 sm:order-2 touch-manipulation"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Incident aanmaken...</span>
              </div>
            ) : (
              'Incident Aanmaken'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 