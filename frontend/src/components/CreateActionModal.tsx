import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { SelectField } from './ui/select-field';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const FIELD_LABEL =
  'mb-1.5 ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500';
const TEXTAREA_FIELD =
  'w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50';

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
  preselectedIncidentId,
}) => {
  const [formData, setFormData] = useState({
    incident_id: preselectedIncidentId?.toString() || '',
    action_description: '',
    assigned_to: '',
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchIncidents();
      setFormData({
        incident_id: preselectedIncidentId?.toString() || '',
        action_description: '',
        assigned_to: '',
      });
      setError('');
    }
  }, [isOpen, preselectedIncidentId]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const openIncidents =
          data.incidents?.filter((incident: Incident) => incident.status !== 'Closed') ||
          [];
        setIncidents(openIncidents);
      } else {
        setError('Fout bij het laden van incidenten');
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Fout bij het laden van incidenten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

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
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/actions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          incident_id: parseInt(formData.incident_id, 10),
          action_description: formData.action_description,
          assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.message || 'Fout bij het aanmaken van actie');
      }
    } catch (err) {
      console.error('Error creating action:', err);
      setError('Netwerkfout. Probeer het opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const prioClass = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'high':
        return 'text-red-700';
      case 'medium':
        return 'text-orange-700';
      case 'low':
        return 'text-emerald-700';
      default:
        return 'text-slate-700';
    }
  };

  const statusNl = (s: string) => {
    const x = String(s || '').toLowerCase();
    if (x === 'open') return 'Open';
    if (x === 'in progress') return 'In behandeling';
    if (x === 'closed') return 'Gesloten';
    return s || '—';
  };

  if (!isOpen) return null;

  const selectedIncident = incidents.find((i) => i.id.toString() === formData.incident_id);

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
                <svg
                  className="h-5 w-5 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-semibold tracking-tight">Nieuwe actie</CardTitle>
                <CardDescription className="mt-1 hidden text-sm sm:block">
                  Koppel een concrete actie aan een openstaand incident.
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
                  Openstaande incidenten laden…
                </div>
              ) : null}

              <div className="space-y-5">
                <div>
                  <label htmlFor="action-incident" className={FIELD_LABEL}>
                    Incident <span className="font-semibold lowercase text-red-500">*</span>
                  </label>
                  <SelectField
                    id="action-incident"
                    name="incident_id"
                    value={formData.incident_id}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting || !!preselectedIncidentId || isLoading}
                  >
                    <option value="">Kies incident…</option>
                    {incidents.map((incident) => (
                      <option key={incident.id} value={incident.id}>
                        #{incident.id} — {incident.title} ({incident.priority} · {statusNl(incident.status)})
                      </option>
                    ))}
                  </SelectField>
                </div>

                {selectedIncident ? (
                  <div className="rounded-xl border border-border bg-muted/25 p-4 sm:p-5">
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Geselecteerd dossier</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className={`font-semibold ${prioClass(selectedIncident.priority)}`}>{selectedIncident.priority}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-medium text-slate-900">{statusNl(selectedIncident.status)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedIncident.description || 'Geen beschrijving.'}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {selectedIncident.location_name ? <span>{selectedIncident.location_name}</span> : null}
                      {selectedIncident.category_name ? <span>{selectedIncident.category_name}</span> : null}
                      {selectedIncident.created_by_name ? <span>Door {selectedIncident.created_by_name}</span> : null}
                    </div>
                  </div>
                ) : null}

                <div>
                  <label htmlFor="action-description" className={FIELD_LABEL}>
                    Concrete actiestap{' '}
                    <span className="font-semibold lowercase text-red-500">*</span>
                  </label>
                  <textarea
                    id="action-description"
                    name="action_description"
                    placeholder="Wat moet er gebeuren en wanneer? Bijv. service party nabellen voor vervanging, terugmelding tegen 14:00."
                    value={formData.action_description}
                    onChange={handleInputChange}
                    autoFocus={!!preselectedIncidentId}
                    required
                    disabled={isSubmitting}
                    rows={5}
                    className={TEXTAREA_FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="action-assign" className={FIELD_LABEL}>
                    Toewijzen aan{' '}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground">(optioneel)</span>
                  </label>
                  <SelectField
                    id="action-assign"
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleInputChange}
                    disabled={isSubmitting || isLoading}
                  >
                    <option value="">Open pool — elk teamlid kan oppakken</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.role_name})
                      </option>
                    ))}
                  </SelectField>
                  <p className="mt-1.5 ml-1 text-[11px] text-muted-foreground">
                    Zonder toewijzing blijft de actie voor iedereen zichtbaar in de werklijst.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-border bg-muted/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
                className="min-h-11 flex-1 touch-manipulation"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || isLoading}
                className="min-h-11 flex-[2] touch-manipulation"
              >
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
                  'Actie aanmaken'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
