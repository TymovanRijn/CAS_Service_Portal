import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { api } from '../lib/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface ReportData {
  selectedDate: string;
  isGenerating: boolean;
}

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData>({
    selectedDate: new Date().toISOString().split('T')[0], // Today's date
    isGenerating: false
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user has permission to view reports
  const hasReportAccess = user?.permissions?.includes('all') || 
                          user?.permissions?.includes('reports') || 
                          user?.permissions?.includes('reports:read');

  useEffect(() => {
    if (hasReportAccess) {
      fetchAvailableDates();
    } else {
      setIsLoading(false);
    }
  }, [hasReportAccess]);

  const fetchAvailableDates = async () => {
    try {
      const data = await api.get('/api/reports/dates');
      setAvailableDates(data.dates || []);
    } catch (err) {
      console.error('Error fetching available dates:', err);
      setError('Netwerkfout bij het ophalen van datums');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReportData(prev => ({
      ...prev,
      selectedDate: e.target.value
    }));
    setError('');
  };

  const generateReport = async () => {
    if (!reportData.selectedDate) {
      setError('Selecteer eerst een datum');
      return;
    }

    setReportData(prev => ({ ...prev, isGenerating: true }));
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/reports/daily?date=${reportData.selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CAS_Dagrapport_${reportData.selectedDate.replace(/-/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Show success message briefly
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij het genereren van rapport');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Netwerkfout bij het genereren van rapport');
    } finally {
      setReportData(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
          <p className="text-muted-foreground">Rapporten laden...</p>
        </div>
      </div>
    );
  }

  if (!hasReportAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapporten & Analytics</h1>
          <p className="text-gray-600">Genereer en download dagelijkse rapporten</p>
        </div>
        
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen Toegang</h3>
              <p className="text-gray-600">
                Je hebt geen toegang tot de rapportfunctionaliteit. Neem contact op met een beheerder als je toegang nodig hebt.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapporten & Analytics</h1>
        <p className="text-gray-600">Genereer en download dagelijkse rapporten van incidenten en acties</p>
      </div>

      {/* Report Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Dagrapport Genereren
              </CardTitle>
              <CardDescription>
                Selecteer een datum om een gedetailleerd PDF-rapport te genereren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {/* Date Selection */}
              <div className="space-y-2">
                <label htmlFor="reportDate" className="text-sm font-medium">
                  Rapportdatum
                </label>
                <Input
                  id="reportDate"
                  type="date"
                  value={reportData.selectedDate}
                  onChange={handleDateChange}
                  disabled={reportData.isGenerating}
                  max={new Date().toISOString().split('T')[0]} // Don't allow future dates
                />
                {reportData.selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    Rapport voor {formatDate(reportData.selectedDate)}
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateReport}
                disabled={reportData.isGenerating || !reportData.selectedDate}
                className="w-full"
              >
                {reportData.isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    PDF Genereren...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF Rapport Downloaden
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Available Dates */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Snelle Acties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setReportData(prev => ({ 
                  ...prev, 
                  selectedDate: new Date().toISOString().split('T')[0] 
                }))}
                disabled={reportData.isGenerating}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Vandaag
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setReportData(prev => ({ 
                    ...prev, 
                    selectedDate: yesterday.toISOString().split('T')[0] 
                  }));
                }}
                disabled={reportData.isGenerating}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Gisteren
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  setReportData(prev => ({ 
                    ...prev, 
                    selectedDate: lastWeek.toISOString().split('T')[0] 
                  }));
                }}
                disabled={reportData.isGenerating}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Vorige Week
              </Button>
            </CardContent>
          </Card>

          {/* Available Dates */}
          {availableDates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recente Datums</CardTitle>
                <CardDescription>
                  Datums met geregistreerde activiteit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableDates.slice(0, 10).map((date) => (
                    <Button
                      key={date}
                      variant={reportData.selectedDate === date ? "default" : "ghost"}
                      className="w-full justify-start text-sm"
                      onClick={() => setReportData(prev => ({ ...prev, selectedDate: date }))}
                      disabled={reportData.isGenerating}
                    >
                      <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {formatDate(date)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Report Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rapport Informatie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">📊 Rapport Inhoud</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Dagstatistieken (nieuwe/gesloten incidenten, acties)</li>
                <li>• Prioriteitsverdeling van incidenten</li>
                <li>• Verdeling per categorie en locatie</li>
                <li>• Gedetailleerde lijst van alle incidenten</li>
                <li>• Gedetailleerde lijst van alle acties</li>
                <li>• Tijdstempel van rapportgeneratie</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">📋 Gebruiksinstructies</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Selecteer een datum uit de kalendar of gebruik snelle acties</li>
                <li>• Klik op "PDF Rapport Downloaden" om het rapport te genereren</li>
                <li>• Het PDF-bestand wordt automatisch gedownload</li>
                <li>• Rapporten bevatten alleen data van de geselecteerde dag</li>
                <li>• Alleen Admin en Dashboard Viewer rollen hebben toegang</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 