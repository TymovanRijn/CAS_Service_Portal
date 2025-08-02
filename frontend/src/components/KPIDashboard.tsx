import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { api } from '../lib/api';

interface KPIData {
  totalIncidents: number;
  totalActions: number;
  sacActivities: { activity: string; count: number }[];
  actionsByStatus: { status: string; count: number }[];
  incidentsByPriority: { priority: string; count: number }[];
  incidentsByCategory: { category: string; count: number }[];
  incidentsByLocation: { location: string; count: number }[];
  sacPerformance: {
    totalActions: number;
    completedActions: number;
    completionRate: string;
    avgCompletionHours: string;
    highPriorityActions: number;
  };
  incidentsByMonth: { month: string; count: number }[];
  actionsByMonth: { month: string; count: number }[];
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  success: '#22C55E',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280'
};

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#22C55E', '#6B7280'
];

export const KPIDashboard: React.FC = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: 'Laatste 30 dagen',
    value: '30',
    days: 30
  });

  const timeRanges: TimeRange[] = [
    { label: 'Vandaag', value: '1', days: 1 },
    { label: 'Laatste 7 dagen', value: '7', days: 7 },
    { label: 'Laatste 30 dagen', value: '30', days: 30 },
    { label: 'Laatste 90 dagen', value: '90', days: 90 },
    { label: 'Dit jaar', value: '365', days: 365 }
  ];

  const fetchKPIData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await api.get(`/api/kpi/dashboard?days=${selectedTimeRange.days}`);
      setKpiData(data);
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError('Fout bij het laden van KPI data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIData();
  }, [selectedTimeRange]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">KPI Dashboard laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fout bij laden</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchKPIData} className="bg-blue-600 hover:bg-blue-700">
            Opnieuw proberen
          </Button>
        </div>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Geen data beschikbaar</h2>
          <p className="text-gray-600">Er is nog geen KPI data beschikbaar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 KPI Dashboard
            </h1>
            <p className="text-gray-600">
              Uitgebreide inzichten en analyses van security operaties
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border p-2">
            <span className="text-sm font-medium text-gray-700">Tijdsperiode:</span>
            <select
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = timeRanges.find(r => r.value === e.target.value);
                if (range) setSelectedTimeRange(range);
              }}
              className="text-sm border-0 bg-transparent focus:ring-0 focus:outline-none"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Totaal Incidenten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpiData.totalIncidents}</div>
            <p className="text-blue-100 text-sm mt-1">
              In {selectedTimeRange.label.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <span className="text-2xl mr-2">✅</span>
              Zelf Opgelost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {kpiData.sacPerformance.completionRate}%
            </div>
            <p className="text-green-100 text-sm mt-1">
              Door SAC opgelost
            </p>
          </CardContent>
        </Card>


      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Incident Trends */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Incident Trends
            </CardTitle>
            <CardDescription>
              Incidenten over tijd per maand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={kpiData.incidentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  fill={COLORS.primary} 
                  fillOpacity={0.3} 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                />
                <Bar dataKey="count" fill={COLORS.secondary} opacity={0.7} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Trends */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">⚡</span>
              Actie Trends
            </CardTitle>
            <CardDescription>
              Acties over tijd per maand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpiData.actionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={COLORS.accent} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.accent, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SAC Activities Distribution */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">👮</span>
              SAC Werkzaamheden
            </CardTitle>
            <CardDescription>
              Wat hebben de SAC officieren gedaan?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kpiData.sacActivities}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {kpiData.sacActivities.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              Prioriteit Verdeling
            </CardTitle>
            <CardDescription>
              Incidenten per prioriteitsniveau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpiData.incidentsByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>


      </div>

      {/* SAC Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <span className="text-2xl mr-2">⏱️</span>
              Gem. Response Tijd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {kpiData.sacPerformance.avgCompletionHours}min
            </div>
            <p className="text-blue-600 text-sm mt-1">
              Gemiddelde response tijd
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <span className="text-2xl mr-2">🚨</span>
              Late Aankomsten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {kpiData.sacPerformance.highPriorityActions}
            </div>
            <p className="text-orange-600 text-sm mt-1">
              Service party te laat
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <span className="text-2xl mr-2">📊</span>
              Totaal Incidenten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {kpiData.sacPerformance.totalActions}
            </div>
            <p className="text-green-600 text-sm mt-1">
              Alle incidenten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 gap-6">
        {/* Location Analysis */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">📍</span>
              Locatie Analyse
            </CardTitle>
            <CardDescription>
              Incidenten per locatie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={kpiData.incidentsByLocation} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="location" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.info} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>


      </div>

      {/* Export Section */}
      <div className="mt-8 text-center">
        <Button 
          onClick={() => {
            // TODO: Implement export functionality
            alert('Export functionaliteit komt binnenkort!');
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
        >
          📊 Export KPI Rapport
        </Button>
      </div>
    </div>
  );
}; 