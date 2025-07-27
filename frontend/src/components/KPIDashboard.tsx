import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface KPIMetrics {
  // Real incident data we actually have
  totalIncidents: number;
  openIncidents: number;
  inProgressIncidents: number;
  todayIncidents: number;
  thisWeekIncidents: number;
  thisMonthIncidents: number;
  
  // Priority distribution (real data)
  highPriorityIncidents: number;
  mediumPriorityIncidents: number;
  lowPriorityIncidents: number;
  
  // Action data (real when actions exist)
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  inProgressActions: number;
  
  // Security Officer KPI data (only what Security Officers actually input)
  unregisteredIncidents: number;
  incidentsRequiringEscalation: number;
  securityResolvedIncidents: number;
  incorrectDiagnosis: number;
  incorrectServiceParty: number;
  lateServiceParty: number;
  multipleServiceParties: number;
}

interface LocationMetrics {
  location: string;
  incidents: number;
  openIncidents: number;
}

interface CategoryMetrics {
  category: string;
  incidents: number;
  openIncidents: number;
  highPriority: number;
}

export const KPIDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [locationMetrics, setLocationMetrics] = useState<LocationMetrics[]>([]);
  const [categoryMetrics, setCategoryMetrics] = useState<CategoryMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchKPIData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchKPIData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchKPIData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Get real data from our endpoints
      const [
        incidentStatsRes,
        actionStatsRes,
        incidentsRes
      ] = await Promise.all([
        fetch(`${BACKEND_URL}/api/incidents/stats`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/actions/stats`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/incidents/archive?limit=1000`, { headers, credentials: 'include' })
      ]);

      let calculatedMetrics: KPIMetrics = {
        totalIncidents: 0,
        openIncidents: 0,
        inProgressIncidents: 0,
        todayIncidents: 0,
        thisWeekIncidents: 0,
        thisMonthIncidents: 0,
        highPriorityIncidents: 0,
        mediumPriorityIncidents: 0,
        lowPriorityIncidents: 0,
        totalActions: 0,
        pendingActions: 0,
        completedActions: 0,
        inProgressActions: 0,
        unregisteredIncidents: 0,
        incidentsRequiringEscalation: 0,
        securityResolvedIncidents: 0,
        incorrectDiagnosis: 0,
        incorrectServiceParty: 0,
        lateServiceParty: 0,
        multipleServiceParties: 0
      };

      // Process incident stats (real backend data)
      if (incidentStatsRes.ok) {
        const incidentStats = await incidentStatsRes.json();
        calculatedMetrics.todayIncidents = incidentStats.todayIncidents || 0;
        calculatedMetrics.openIncidents = incidentStats.openIncidents || 0;
        calculatedMetrics.inProgressIncidents = incidentStats.inProgressIncidents || 0;
        
        // Security Officer KPI data (always show, even if 0)
        calculatedMetrics.unregisteredIncidents = incidentStats.unregisteredIncidents || 0;
        calculatedMetrics.incidentsRequiringEscalation = incidentStats.incidentsRequiringEscalation || 0;
        calculatedMetrics.securityResolvedIncidents = incidentStats.securityResolvedIncidents || 0;
        calculatedMetrics.incorrectDiagnosis = incidentStats.incorrectDiagnosis || 0;
        calculatedMetrics.incorrectServiceParty = incidentStats.incorrectServiceParty || 0;
        calculatedMetrics.lateServiceParty = incidentStats.lateServiceParty || 0;
        calculatedMetrics.multipleServiceParties = incidentStats.multipleServiceParties || 0;
      }

      // Process action stats (real data when actions exist)
      if (actionStatsRes.ok) {
        const actionStats = await actionStatsRes.json();
        calculatedMetrics.pendingActions = actionStats.pendingActions || 0;
        calculatedMetrics.completedActions = actionStats.completedToday || 0;
        calculatedMetrics.inProgressActions = actionStats.inProgressActions || 0;
        calculatedMetrics.totalActions = calculatedMetrics.pendingActions + calculatedMetrics.completedActions + calculatedMetrics.inProgressActions;
      }

      // Process detailed incident data for analysis
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        const incidents = incidentsData.incidents || [];
        
        // Filter incidents based on selected period
        const now = new Date();
        let periodStart: Date;
        
        switch (selectedPeriod) {
          case 'week':
            periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        }
        
        const filteredIncidents = incidents.filter((i: any) => 
          new Date(i.created_at) >= periodStart
        );
        
        // Use filtered incidents for period-specific metrics
        calculatedMetrics.totalIncidents = filteredIncidents.length;
        calculatedMetrics.highPriorityIncidents = filteredIncidents.filter((i: any) => i.priority === 'High').length;
        calculatedMetrics.mediumPriorityIncidents = filteredIncidents.filter((i: any) => i.priority === 'Medium').length;
        calculatedMetrics.lowPriorityIncidents = filteredIncidents.filter((i: any) => i.priority === 'Low').length;
        
        // Calculate time-based counts
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        calculatedMetrics.thisWeekIncidents = incidents.filter((i: any) => 
          new Date(i.created_at) >= oneWeekAgo
        ).length;
        
        calculatedMetrics.thisMonthIncidents = incidents.filter((i: any) => 
          new Date(i.created_at) >= oneMonthAgo
        ).length;
        
        // Real location metrics (use filtered data)
        const locationCounts: { [key: string]: { total: number; open: number } } = {};
        filteredIncidents.forEach((incident: any) => {
          const location = incident.location_name || 'Onbekend';
          if (!locationCounts[location]) {
            locationCounts[location] = { total: 0, open: 0 };
          }
          locationCounts[location].total++;
          if (incident.status === 'Open' || incident.status === 'In Progress') {
            locationCounts[location].open++;
          }
        });
        
        const locationMetricsArray = Object.entries(locationCounts).map(([location, data]) => ({
          location,
          incidents: data.total,
          openIncidents: data.open
        }));
        setLocationMetrics(locationMetricsArray);
        
        // Real category metrics (use filtered data)
        const categoryCounts: { [key: string]: { total: number; open: number; high: number } } = {};
        filteredIncidents.forEach((incident: any) => {
          const category = incident.category_name || 'Onbekend';
          if (!categoryCounts[category]) {
            categoryCounts[category] = { total: 0, open: 0, high: 0 };
          }
          categoryCounts[category].total++;
          if (incident.status === 'Open' || incident.status === 'In Progress') {
            categoryCounts[category].open++;
          }
          if (incident.priority === 'High') {
            categoryCounts[category].high++;
          }
        });
        
        const categoryMetricsArray = Object.entries(categoryCounts).map(([category, data]) => ({
          category,
          incidents: data.total,
          openIncidents: data.open,
          highPriority: data.high
        }));
        setCategoryMetrics(categoryMetricsArray);
      }

      setMetrics(calculatedMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError('Fout bij laden van KPI gegevens');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('nl-NL').format(Math.round(num));
  };

  const formatPercentage = (total: number, part: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((part / total) * 100)}%`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'Deze Week';
      case 'month': return 'Deze Maand';
      case 'quarter': return 'Dit Kwartaal';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchKPIData} className="mt-4">
            Opnieuw proberen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 KPI Dashboard</h1>
          <p className="text-muted-foreground">
            Overzicht van incidenten en acties - {getPeriodLabel().toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {['week', 'month', 'quarter'].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period as any)}
              >
                {period === 'week' ? 'Week' :
                 period === 'month' ? 'Maand' : 'Kwartaal'}
              </Button>
            ))}
          </div>
          <Button onClick={fetchKPIData} variant="outline" size="sm">
            🔄 Vernieuwen
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-muted-foreground">
        Laatst bijgewerkt: {lastUpdated.toLocaleTimeString('nl-NL')} • Filter: {getPeriodLabel()}
      </div>

      {/* Main Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Incidenten {getPeriodLabel()}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(metrics.totalIncidents)}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    Deze maand: {formatNumber(metrics.thisMonthIncidents)}
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  📋
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Openstaand</p>
                  <p className="text-2xl font-bold text-red-600">{formatNumber(metrics.openIncidents)}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    In behandeling: {formatNumber(metrics.inProgressIncidents)}
                  </div>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  🚨
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hoge Prioriteit</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(metrics.highPriorityIncidents)}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatPercentage(metrics.totalIncidents, metrics.highPriorityIncidents)} van {getPeriodLabel().toLowerCase()}
                  </div>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  ⚡
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Acties Totaal</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(metrics.totalActions)}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metrics.totalActions === 0 ? 'Nog geen acties' : `${formatNumber(metrics.pendingActions)} openstaand`}
                  </div>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  ⚙️
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Status Overview - Only show if actions exist */}
      {metrics && metrics.totalActions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Actie Status Overzicht</CardTitle>
            <CardDescription>Status van alle acties in het systeem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{formatNumber(metrics.pendingActions)}</div>
                <div className="text-sm text-yellow-700">Openstaand</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {formatPercentage(metrics.totalActions, metrics.pendingActions)} van totaal
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(metrics.inProgressActions)}</div>
                <div className="text-sm text-blue-700">In Behandeling</div>
                <div className="text-xs text-blue-600 mt-1">
                  {formatPercentage(metrics.totalActions, metrics.inProgressActions)} van totaal
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.completedActions)}</div>
                <div className="text-sm text-green-700">Voltooid Vandaag</div>
                <div className="text-xs text-green-600 mt-1">
                  {formatPercentage(metrics.totalActions, metrics.completedActions)} van totaal
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SAC KPI Section - Always show */}
      <Card>
        <CardHeader>
                      <CardTitle>👁️ Security Officer Kwaliteitsindicatoren</CardTitle>
          <CardDescription>
                          KPI's opgegeven door Security Officers bij incident aanmaak - {getPeriodLabel().toLowerCase()}
            {metrics && (metrics.unregisteredIncidents + metrics.incidentsRequiringEscalation + metrics.securityResolvedIncidents + 
              metrics.incorrectDiagnosis + metrics.incorrectServiceParty + metrics.lateServiceParty + metrics.multipleServiceParties) === 0 && 
              " (nog geen bijzonderheden gemarkeerd)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(metrics?.unregisteredIncidents || 0)}</div>
              <div className="text-sm text-blue-700">Niet Geregistreerd</div>
              <div className="text-xs text-blue-600 mt-1">
                Incident was al bekend
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-orange-50 border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{formatNumber(metrics?.incidentsRequiringEscalation || 0)}</div>
              <div className="text-sm text-orange-700">Escalatie Nodig</div>
              <div className="text-xs text-orange-600 mt-1">
                Nabellen vereist
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-green-50 border-green-200">
                              <div className="text-2xl font-bold text-green-600">{formatNumber(metrics?.securityResolvedIncidents || 0)}</div>
                              <div className="text-sm text-green-700">Door Security Officer Opgelost</div>
              <div className="text-xs text-green-600 mt-1">
                Zelfstandig afgehandeld
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-purple-50 border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{formatNumber(metrics?.lateServiceParty || 0)}</div>
              <div className="text-sm text-purple-700">Service Party Te Laat</div>
              <div className="text-xs text-purple-600 mt-1">
                Buiten verwachte tijd
              </div>
            </div>
          </div>
          
                        {/* Second row for additional Security Officer KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 border rounded-lg bg-red-50 border-red-200">
              <div className="text-2xl font-bold text-red-600">{formatNumber(metrics?.incorrectDiagnosis || 0)}</div>
              <div className="text-sm text-red-700">Verkeerde Diagnose</div>
              <div className="text-xs text-red-600 mt-1">
                Service party fout
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{formatNumber(metrics?.incorrectServiceParty || 0)}</div>
              <div className="text-sm text-yellow-700">Verkeerde Service Party</div>
              <div className="text-xs text-yellow-600 mt-1">
                Eerste ter plaatse
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-indigo-50 border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">{formatNumber(metrics?.multipleServiceParties || 0)}</div>
              <div className="text-sm text-indigo-700">Meerdere Parties Nodig</div>
              <div className="text-xs text-indigo-600 mt-1">
                Complexe problemen
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Overview */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>📅 Periode Overzicht</CardTitle>
            <CardDescription>Incidenten per tijdsperiode (onafhankelijk van filter)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(metrics.todayIncidents)}</div>
                <div className="text-sm text-muted-foreground">Vandaag</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.thisWeekIncidents)}</div>
                <div className="text-sm text-muted-foreground">Deze Week</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatNumber(metrics.thisMonthIncidents)}</div>
                <div className="text-sm text-muted-foreground">Deze Maand</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Distribution */}
      {metrics && metrics.totalIncidents > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Prioriteit Verdeling</CardTitle>
            <CardDescription>Verdeling van incidenten per prioriteit - {getPeriodLabel().toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg bg-red-50 border-red-200">
                <div className="text-2xl font-bold text-red-600">{formatNumber(metrics.highPriorityIncidents)}</div>
                <div className="text-sm text-red-700">Hoog</div>
                <div className="text-xs text-red-600 mt-1">
                  {formatPercentage(metrics.totalIncidents, metrics.highPriorityIncidents)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{formatNumber(metrics.mediumPriorityIncidents)}</div>
                <div className="text-sm text-orange-700">Medium</div>
                <div className="text-xs text-orange-600 mt-1">
                  {formatPercentage(metrics.totalIncidents, metrics.mediumPriorityIncidents)}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="text-2xl font-bold text-green-600">{formatNumber(metrics.lowPriorityIncidents)}</div>
                <div className="text-sm text-green-700">Laag</div>
                <div className="text-xs text-green-600 mt-1">
                  {formatPercentage(metrics.totalIncidents, metrics.lowPriorityIncidents)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location and Category Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Performance */}
        <Card>
          <CardHeader>
            <CardTitle>📍 Locatie Overzicht</CardTitle>
            <CardDescription>Incidenten per locatie - {getPeriodLabel().toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationMetrics.length > 0 ? locationMetrics.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{location.location}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(location.incidents)} totaal
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      {formatNumber(location.openIncidents)} open
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPercentage(location.incidents, location.openIncidents)} open
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  Geen incidenten in {getPeriodLabel().toLowerCase()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Categorie Analyse</CardTitle>
            <CardDescription>Incidenten per categorie - {getPeriodLabel().toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryMetrics.length > 0 ? categoryMetrics.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{category.category}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(category.incidents)} totaal
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      {formatNumber(category.openIncidents)} open
                    </div>
                    <div className="text-xs text-orange-600">
                      {formatNumber(category.highPriority)} hoog prioriteit
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  Geen incidenten in {getPeriodLabel().toLowerCase()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 