import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface AIInsight {
  type: 'alert' | 'trend' | 'workflow' | 'location';
  priority: 'high' | 'medium' | 'low';
  message: string;
  actionRequired: boolean;
}

interface AIInsightsData {
  insights: AIInsight[];
  generatedAt: string;
  month: string;
  aiPowered?: boolean;
  fallback?: boolean;
  cached?: boolean;
  cacheAge?: number;
  generating?: boolean;
  message?: string;
}

interface MonthlySummary {
  id: number;
  report_month: string;
  summary_data: {
    overview: {
      totalIncidents: number;
      totalActions: number;
      completionRate: number;
      avgIncidentsPerDay: number;
    };
    keyInsights: string[];
    trends: {
      incidentTrend: string;
      incidentChange: number;
      actionCompletionTrend: string;
      actionCompletionChange: number;
    };
    recommendations: string[];
    actionPoints: string[];
    generatedAt: string;
    month: string;
    pdfUrl?: string;
  };
  generated_at: string;
}

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AIInsightsData | null>(null);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAIData();
  }, []);

  const fetchAIData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch cached AI insights (FAST!)
      const insightsResponse = await fetch(`${BACKEND_URL}/api/ai/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.data);
        
        // If AI is generating in background, show message
        if (insightsData.data.generating) {
          console.log('🤖 AI insights being generated in background...');
        }
      }
      
      // Fetch recent summaries
      const summariesResponse = await fetch(`${BACKEND_URL}/api/ai/summaries?limit=6`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (summariesResponse.ok) {
        const summariesData = await summariesResponse.json();
        setSummaries(summariesData.data.summaries);
      }
      
    } catch (err) {
      console.error('Error fetching AI data:', err);
      setError('Fout bij laden van AI insights');
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefreshInsights = async () => {
    setIsRefreshing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Trigger background AI generation
      const refreshResponse = await fetch(`${BACKEND_URL}/api/ai/insights/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        console.log('🔄 AI insights refresh triggered:', result);
        
        // Show success message temporarily
        setError(''); // Clear any errors
        
        // Refresh the data after a short delay to get updated status
        setTimeout(() => {
          fetchAIData();
        }, 2000);
        
      } else {
        setError('Fout bij vernieuwen van AI insights');
      }
      
    } catch (err) {
      console.error('Error refreshing AI insights:', err);
      setError('Netwerkfout bij vernieuwen van AI insights');
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateMonthlySummary = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const response = await fetch(`${BACKEND_URL}/api/ai/summaries/generate?month=${currentMonth}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('AI summary generated:', result);
        // Refresh data to show new summary
        await fetchAIData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij genereren van AI samenvatting');
      }
      
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setError('Netwerkfout bij genereren van AI samenvatting');
    } finally {
      setIsGenerating(false);
    }
  };

  const viewPDF = async (month: string) => {
    try {
      const token = localStorage.getItem('token');
      const pdfUrl = `${BACKEND_URL}/api/ai/summaries/${month}/pdf`;
      
      // Open PDF in new tab
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // Clean up the object URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        setError('PDF niet beschikbaar. Genereer eerst een nieuw rapport.');
      }
      
    } catch (err) {
      console.error('Error viewing PDF:', err);
      setError('Fout bij openen van PDF');
    }
  };

  const downloadPDF = async (month: string) => {
    try {
      const token = localStorage.getItem('token');
      const pdfUrl = `${BACKEND_URL}/api/ai/summaries/${month}/pdf`;
      
      const response = await fetch(pdfUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AI_Rapport_${formatMonth(month)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        setError('PDF niet beschikbaar. Genereer eerst een nieuw rapport.');
      }
      
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Fout bij downloaden van PDF');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return '🚨';
      case 'trend':
        return '📈';
      case 'workflow':
        return '⚡';
      case 'location':
        return '📍';
      default:
        return '🤖';
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

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const monthNames = [
      'januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🤖 AI Insights
                {insights?.aiPowered && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                    🧠 Echte AI
                  </span>
                )}
                {insights?.fallback && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                    ⚡ Fallback
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {insights?.aiPowered 
                  ? 'Ollama AI-gegenereerde inzichten en aanbevelingen'
                  : 'Real-time inzichten en aanbevelingen'
                }
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAIData}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Vernieuwen
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={forceRefreshInsights}
                disabled={isRefreshing || insights?.generating}
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Genereren...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    🤖 AI Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md mb-4">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {insights?.message && (
            <div className="p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md mb-4">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {insights.message}
                {insights.generating && (
                  <svg className="animate-spin w-4 h-4 ml-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
            </div>
          )}

          {insights && insights.insights.length > 0 ? (
            <div className="space-y-3">
              {insights.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.priority === 'high' 
                      ? 'border-red-500 bg-red-50' 
                      : insight.priority === 'medium'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getTypeIcon(insight.type)}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getPriorityIcon(insight.priority)}
                          <span className="text-sm font-medium text-gray-600 capitalize">
                            {insight.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{insight.message}</p>
                      </div>
                    </div>
                    {insight.actionRequired && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                        Actie vereist
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-4 flex items-center justify-between">
                <span>
                  Laatste update: {formatDate(insights.generatedAt)}
                  {insights.cached && insights.cacheAge && (
                    <span className="ml-2 text-blue-600">
                      (cached: {insights.cacheAge}m geleden)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {insights.aiPowered && (
                    <span className="flex items-center gap-1 text-green-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI-powered
                    </span>
                  )}
                  {insights.cached && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Cached
                    </span>
                  )}
                  {insights.fallback && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Fallback
                    </span>
                  )}
                  {insights.generating && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p>Geen AI insights beschikbaar op dit moment</p>
              <p className="text-xs mt-1">AI analyseert uw data voor inzichten</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summaries Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📊 AI Maandrapportages
              </CardTitle>
              <CardDescription>
                AI-gegenereerde maandelijkse samenvattingen
              </CardDescription>
            </div>
            <Button
              onClick={generateMonthlySummary}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Genereren...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Genereer Rapport
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summaries.length > 0 ? (
            <div className="space-y-4">
              {summaries.map((summary) => (
                <div key={summary.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-lg">
                        Rapport {formatMonth(summary.report_month)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Gegenereerd op {formatDate(summary.generated_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">
                          {summary.summary_data.overview.totalIncidents}
                        </div>
                        <div className="text-gray-500">Incidenten</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">
                          {summary.summary_data.overview.completionRate}%
                        </div>
                        <div className="text-gray-500">Voltooid</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium mb-2">📋 Belangrijkste Inzichten:</h5>
                      <ul className="space-y-1">
                        {summary.summary_data.keyInsights.slice(0, 3).map((insight, idx) => (
                          <li key={idx} className="text-gray-600">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">💡 Aanbevelingen:</h5>
                      <ul className="space-y-1">
                        {summary.summary_data.recommendations.slice(0, 2).map((rec, idx) => (
                          <li key={idx} className="text-gray-600">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        📈 Trend: {summary.summary_data.trends.incidentChange > 0 ? '+' : ''}{summary.summary_data.trends.incidentChange}% incidenten
                      </span>
                      <span className="flex items-center gap-1">
                        ⚡ Voltooiing: {summary.summary_data.trends.actionCompletionChange > 0 ? '+' : ''}{summary.summary_data.trends.actionCompletionChange}% 
                      </span>
                    </div>
                    
                    {/* PDF Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewPDF(summary.report_month)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Bekijk PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPDF(summary.report_month)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Geen AI rapporten beschikbaar</p>
              <p className="text-xs mt-1">Genereer uw eerste AI maandrapport</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 