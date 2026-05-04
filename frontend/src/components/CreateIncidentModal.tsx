import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { SelectField } from './ui/select-field';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const FIELD_LABEL =
  'mb-1.5 ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500';
const TEXTAREA_FIELD =
  'w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50';

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
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Sluiten"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />
      <div className="relative mx-auto flex min-h-full justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
        <Card
          className="relative my-auto flex w-full max-w-2xl max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] flex-col overflow-hidden rounded-2xl border-border shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader className="shrink-0 flex flex-row items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-primary p-2 shadow-sm">
                <svg className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-semibold tracking-tight">Nieuw incident</CardTitle>
                <CardDescription className="mt-1 hidden text-sm sm:block">
                  Meld een nieuw incident of probleem.
                </CardDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Sluiten"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </CardHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 pb-10 sm:px-6 sm:py-6 sm:pb-12">
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
              ) : null}

              {isLoading ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                  <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Categorieën en locaties laden…
                </div>
              ) : null}

              <div className="space-y-5">
                <div>
                  <label htmlFor="incident-title" className={FIELD_LABEL}>
                    Titel <span className="font-semibold lowercase text-red-500">*</span>
                  </label>
                  <Input
                    id="incident-title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Bijv. Storing toegangscontrole gate B"
                    autoFocus
                    required
                    disabled={isSubmitting}
                    className="h-11 rounded-xl text-base sm:h-10 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="incident-priority" className={FIELD_LABEL}>
                      Prioriteit <span className="font-semibold lowercase text-red-500">*</span>
                    </label>
                    <SelectField
                      id="incident-priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                    >
                      <option value="Low">Laag</option>
                      <option value="Medium">Gemiddeld</option>
                      <option value="High">Hoog</option>
                    </SelectField>
                  </div>
                  <div>
                    <label htmlFor="incident-category" className={FIELD_LABEL}>
                      Categorie <span className="font-semibold lowercase text-red-500">*</span>
                    </label>
                    <SelectField
                      id="incident-category"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting || isLoading}
                    >
                      <option value="">Kies categorie…</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </div>

                <div>
                  <label htmlFor="incident-location" className={FIELD_LABEL}>
                    Locatie <span className="font-semibold lowercase text-red-500">*</span>
                  </label>
                  <SelectField
                    id="incident-location"
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting || isLoading}
                  >
                    <option value="">Kies locatie…</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div>
                  <label htmlFor="incident-description" className={FIELD_LABEL}>
                    Beschrijving <span className="font-semibold lowercase text-red-500">*</span>
                  </label>
                  <textarea
                    id="incident-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Wat is er gebeurd, waar, en wat is de impact?"
                    required
                    disabled={isSubmitting}
                    rows={5}
                    className={TEXTAREA_FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="incident-possible-solution" className={FIELD_LABEL}>
                    Mogelijke oplossing <span className="font-normal normal-case tracking-normal text-muted-foreground">(optioneel)</span>
                  </label>
                  <textarea
                    id="incident-possible-solution"
                    name="possible_solution"
                    value={formData.possible_solution}
                    onChange={handleInputChange}
                    placeholder="Wat heeft al geholpen of wat zou een volgende stap kunnen zijn?"
                    disabled={isSubmitting}
                    rows={3}
                    className={TEXTAREA_FIELD}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/25 p-4 sm:p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">SAC-rapportage (optioneel)</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="sac-kpi" className="sr-only">
                      Bijzonderheid voor KPI&apos;s
                    </label>
                    <SelectField
                      id="sac-kpi"
                      name="sac_kpi_selection"
                      aria-label="Bijzonderheid voor KPI-rapportage"
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          was_unregistered_incident: false,
                          self_resolved_by_sac: false,
                          requires_escalation: false,
                          service_party_arrived_late: false,
                          incorrect_diagnosis: false,
                          ...(value !== '' ? { [value]: true } : {}),
                        }));
                      }}
                      disabled={isSubmitting}
                    >
                      <option value="">Geen bijzonderheden</option>
                      <option value="was_unregistered_incident">Niet geregistreerd incident</option>
                      <option value="self_resolved_by_sac">Zelf opgelost door SAC</option>
                      <option value="requires_escalation">Escalatie / nabellen nodig</option>
                      <option value="service_party_arrived_late">Service party te laat</option>
                      <option value="incorrect_diagnosis">Verkeerde diagnose (service party)</option>
                    </SelectField>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Geselecteerd:{' '}
                      <span className="font-medium text-slate-700">
                        {formData.was_unregistered_incident
                          ? 'Niet geregistreerd incident'
                          : formData.self_resolved_by_sac
                            ? 'Zelf opgelost door SAC'
                            : formData.requires_escalation
                              ? 'Escalatie / nabellen nodig'
                              : formData.service_party_arrived_late
                                ? 'Service party te laat'
                                : formData.incorrect_diagnosis
                                  ? 'Verkeerde diagnose (service party)'
                                  : 'Geen'}
                      </span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <div>
                      <label htmlFor="downtime" className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Downtime (min)
                      </label>
                      <Input
                        id="downtime"
                        type="number"
                        name="estimated_downtime_minutes"
                        value={formData.estimated_downtime_minutes}
                        onChange={handleInputChange}
                        placeholder="0"
                        disabled={isSubmitting}
                        min={0}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <label htmlFor="reactietijd" className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Reactietijd (min)
                      </label>
                      <Input
                        id="reactietijd"
                        type="number"
                        name="actual_response_time_minutes"
                        value={formData.actual_response_time_minutes}
                        onChange={handleInputChange}
                        placeholder="0"
                        disabled={isSubmitting}
                        min={0}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="incident-files" className={FIELD_LABEL}>
                  Bijlagen <span className="font-normal normal-case tracking-normal text-muted-foreground">(optioneel)</span>
                </label>
                <input
                  id="incident-files"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-50 disabled:opacity-60"
                />
                <p className="mt-1.5 ml-1 text-[11px] text-muted-foreground">
                  Afbeelding of document, tot 10&nbsp;MB per bestand, max. 5 bestanden.
                </p>

                {selectedFiles.length > 0 ? (
                  <ul className="mt-4 max-h-32 space-y-2 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          className="h-9 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Verwijderen
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-border bg-muted/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose} className="min-h-11 flex-1 touch-manipulation">
                Annuleren
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || isLoading} className="min-h-11 flex-[2] touch-manipulation">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Aanmaken…
                  </span>
                ) : (
                  'Incident aanmaken'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}; 