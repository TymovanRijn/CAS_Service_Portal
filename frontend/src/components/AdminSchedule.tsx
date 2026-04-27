import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Schedule {
  id: number;
  user_id: number;
  username: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  approved_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface SACUser {
  id: number;
  username: string;
  email: string;
}

export const AdminSchedule: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sacUsers, setSacUsers] = useState<SACUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState({
    userId: '',
    status: ''
  });
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  useEffect(() => {
    fetchSACUsers();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth, filters]);

  const fetchSACUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/schedules/sac-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSacUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching SAC users:', err);
    }
  };

  const fetchSchedules = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError('');
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.status) params.append('status', filters.status);
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/schedules/all?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        const schedulesData = data.schedules || [];
        // Debug: log schedules to see what we're getting
        if (schedulesData.length > 0) {
          console.log('Total schedules loaded:', schedulesData.length);
          console.log('Sample schedules:', schedulesData.slice(0, 3).map((s: Schedule) => ({
            id: s.id,
            date: s.date,
            dateType: typeof s.date,
            username: s.username,
            status: s.status
          })));
        } else {
          console.log('No schedules found for month:', currentMonth.getMonth() + 1, currentMonth.getFullYear());
        }
        setSchedules(schedulesData);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij ophalen roosters');
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Netwerkfout bij ophalen roosters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveReject = async (status: 'approved' | 'rejected') => {
    if (!selectedSchedule) return;

    try {
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/schedules/${selectedSchedule.id}/approve-reject`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            status,
            notes: actionNotes || null
          })
        }
      );

      if (response.ok) {
        setSuccess(`Beschikbaarheid ${status === 'approved' ? 'goedgekeurd' : 'afgewezen'}`);
        setIsModalOpen(false);
        setSelectedSchedule(null);
        setActionNotes('');
        fetchSchedules(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Fout bij ${status === 'approved' ? 'goedkeuren' : 'afwijzen'}`);
      }
    } catch (err) {
      console.error('Error approving/rejecting schedule:', err);
      setError('Netwerkfout bij bijwerken beschikbaarheid');
    }
  };

  const openActionModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setActionNotes('');
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Goedgekeurd';
      case 'rejected':
        return 'Afgewezen';
      case 'pending':
        return 'In behandeling';
      default:
        return status;
    }
  };

  // Calendar generation
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Helper function to format date consistently
  const formatDateForComparison = (date: Date | string): string => {
    if (typeof date === 'string') {
      // If it's already a string, extract just the date part (YYYY-MM-DD)
      // Handle various formats: "2025-12-22", "2025-12-22T00:00:00.000Z", etc.
      const datePart = date.split('T')[0].split(' ')[0];
      // Validate it's in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
      }
      // If not, try to parse it
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return datePart; // Fallback
    }
    // Format as YYYY-MM-DD without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDateForComparison(date);
    // Also normalize the schedule dates for comparison
    const matchingSchedules = schedules.filter(s => {
      if (!s.date) return false;
      const scheduleDateStr = formatDateForComparison(s.date);
      const matches = scheduleDateStr === dateStr;
      // Debug for first few matches
      if (matches && schedules.length > 0 && schedules.indexOf(s) < 3) {
        console.log('Date match found:', {
          calendarDate: dateStr,
          scheduleDate: scheduleDateStr,
          scheduleId: s.id,
          username: s.username
        });
      }
      return matches;
    });
    return matchingSchedules;
  };

  const getApprovedSchedulesForDate = (date: Date) => {
    const dateStr = formatDateForComparison(date);
    return schedules.filter(s => {
      if (!s.date) return false;
      const scheduleDateStr = formatDateForComparison(s.date);
      return scheduleDateStr === dateStr && s.status === 'approved';
    });
  };

  const getPendingCountForDate = (date: Date) => {
    const dateStr = formatDateForComparison(date);
    return schedules.filter(s => {
      if (!s.date) return false;
      const scheduleDateStr = formatDateForComparison(s.date);
      return scheduleDateStr === dateStr && s.status === 'pending';
    }).length;
  };

  const getRejectedCountForDate = (date: Date) => {
    const dateStr = formatDateForComparison(date);
    return schedules.filter(s => {
      if (!s.date) return false;
      const scheduleDateStr = formatDateForComparison(s.date);
      return scheduleDateStr === dateStr && s.status === 'rejected';
    }).length;
  };

  const getRejectedSchedulesForDate = (date: Date) => {
    const dateStr = formatDateForComparison(date);
    return schedules.filter(s => {
      if (!s.date) return false;
      const scheduleDateStr = formatDateForComparison(s.date);
      return scheduleDateStr === dateStr && s.status === 'rejected';
    });
  };

  const handleDayClick = (date: Date) => {
    const allSchedules = getSchedulesForDate(date);
    if (allSchedules.length > 0) {
      setSelectedDate(date);
      setIsDayModalOpen(true);
    }
  };

  const handleRejectedBadgeClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const rejectedSchedules = getRejectedSchedulesForDate(date);
    if (rejectedSchedules.length > 0) {
      setSelectedDate(date);
      setIsDayModalOpen(true);
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const monthNames = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ];

  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const pendingCount = schedules.filter(s => s.status === 'pending').length;
  const approvedCount = schedules.filter(s => s.status === 'approved').length;
  const rejectedCount = schedules.filter(s => s.status === 'rejected').length;

  if (isLoading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Roosters laden...</p>
        </div>
      </div>
    );
  }

  const calendarDays = getDaysInMonth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Roosterbeheer</h1>
        <p className="text-gray-600 mt-1">Beheer alle SAC beschikbaarheden en roosters</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700 font-medium">In behandeling</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium">Goedgekeurd</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{approvedCount}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700 font-medium">Afgewezen</div>
          <div className="text-2xl font-bold text-red-900 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SAC Gebruiker
            </label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Alle gebruikers</option>
              {sacUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Alle statussen</option>
              <option value="pending">In behandeling</option>
              <option value="approved">Goedgekeurd</option>
              <option value="rejected">Afgewezen</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ userId: '', status: '' })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Filters Resetten
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const approvedSchedules = getApprovedSchedulesForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const pendingCount = getPendingCountForDate(date);
            const rejectedCount = getRejectedCountForDate(date);
            const hasApprovedSchedules = approvedSchedules.length > 0;
            const hasAnySchedules = approvedSchedules.length > 0 || pendingCount > 0 || rejectedCount > 0;

            return (
              <div
                key={date.toISOString()}
                onClick={() => hasAnySchedules && handleDayClick(date)}
                className={`aspect-square border-2 rounded-lg p-2 relative transition-all ${
                  isToday 
                    ? 'bg-blue-50 border-blue-300' 
                    : hasApprovedSchedules
                    ? 'bg-gray-50 border-gray-300 hover:border-primary hover:bg-primary/5 cursor-pointer'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Counter badges - small in corner */}
                {(pendingCount > 0 || rejectedCount > 0) && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5">
                    {pendingCount > 0 && (
                      <div 
                        className="bg-yellow-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-yellow-600 transition-colors" 
                        title={`${pendingCount} in behandeling`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(date);
                        }}
                      >
                        {pendingCount}
                      </div>
                    )}
                    {rejectedCount > 0 && (
                      <div 
                        className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors" 
                        title={`${rejectedCount} afgewezen (klik om te bekijken)`}
                        onClick={(e) => handleRejectedBadgeClick(date, e)}
                      >
                        {rejectedCount}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {/* Only show approved schedules in the calendar */}
                  {approvedSchedules.map(schedule => (
                    <div
                      key={schedule.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionModal(schedule);
                      }}
                      className="text-xs p-1.5 rounded border-2 bg-green-100 border-green-400 hover:bg-green-200 cursor-pointer transition-colors"
                      title={`${schedule.username}: ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)} - Ingeroosterd`}
                    >
                      <div className="font-medium truncate flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {schedule.username}
                      </div>
                      <div className="text-[10px] truncate">
                        {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                      </div>
                      <div className="text-[9px] text-green-700 font-medium mt-0.5">
                        ✓ Ingeroosterd
                      </div>
                    </div>
                  ))}
                  {!hasApprovedSchedules && (
                    <div className="text-[10px] text-gray-400 text-center mt-1">
                      Geen rooster
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule List - Only Pending Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Openstaande Aanvragen</h3>
        {schedules.filter(s => s.status === 'pending').length === 0 ? (
          <p className="text-gray-500 text-center py-8">Geen openstaande aanvragen voor deze maand</p>
        ) : (
          <div className="space-y-3">
            {schedules
              .filter(schedule => schedule.status === 'pending')
              .map(schedule => (
                <div
                  key={schedule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors bg-yellow-50/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">{schedule.username}</span>
                      <span className="text-sm text-gray-500">({schedule.email})</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                        In behandeling
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">
                        {new Date(schedule.date).toLocaleDateString('nl-NL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {' • '}
                      <span className="font-medium">{formatTime(schedule.start_time)}</span> -{' '}
                      <span className="font-medium">{formatTime(schedule.end_time)}</span>
                      {schedule.notes && (
                        <span className="ml-3 text-gray-500">• {schedule.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <button
                      onClick={() => openActionModal(schedule)}
                      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Beoordelen
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {isModalOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Beschikbaarheid Beoordelen</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-gray-600">SAC Gebruiker</div>
                <div className="font-semibold text-gray-900">
                  {selectedSchedule.username} ({selectedSchedule.email})
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Datum</div>
                <div className="font-semibold text-gray-900">
                  {new Date(selectedSchedule.date).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Tijd</div>
                <div className="font-semibold text-gray-900">
                  {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
                </div>
              </div>
              {selectedSchedule.notes && (
                <div>
                  <div className="text-sm text-gray-600">Opmerkingen</div>
                  <div className="text-gray-900">{selectedSchedule.notes}</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opmerkingen bij beslissing (optioneel)
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Voeg opmerkingen toe bij goedkeuring of afwijzing..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApproveReject('approved')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Goedkeuren
              </button>
              <button
                onClick={() => handleApproveReject('rejected')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Afwijzen
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedSchedule(null);
                  setActionNotes('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {isDayModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Beschikbaarheden voor {selectedDate.toLocaleDateString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            
            {getSchedulesForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geen beschikbaarheden voor deze dag</p>
            ) : (
              <div className="space-y-3">
                {/* Approved schedules first */}
                {getApprovedSchedulesForDate(selectedDate).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingeroosterd</h4>
                    {getApprovedSchedulesForDate(selectedDate).map(schedule => (
                      <div
                        key={schedule.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors mb-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">{schedule.username}</span>
                            <span className="text-sm text-gray-500">({schedule.email})</span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                              Goedgekeurd
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{formatTime(schedule.start_time)}</span> -{' '}
                            <span className="font-medium">{formatTime(schedule.end_time)}</span>
                            {schedule.notes && (
                              <span className="ml-3 text-gray-500">• {schedule.notes}</span>
                            )}
                            {schedule.approved_by_name && (
                              <span className="ml-3 text-gray-500">
                                • Goedgekeurd door: {schedule.approved_by_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-0">
                          <div className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded-lg font-medium">
                            ✓ Ingeroosterd
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending schedules */}
                {getSchedulesForDate(selectedDate).filter(s => s.status === 'pending').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">In behandeling</h4>
                    {getSchedulesForDate(selectedDate)
                      .filter(schedule => schedule.status === 'pending')
                      .map(schedule => (
                        <div
                          key={schedule.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50/50 hover:bg-yellow-50 transition-colors mb-2"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-gray-900">{schedule.username}</span>
                              <span className="text-sm text-gray-500">({schedule.email})</span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                                In behandeling
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">{formatTime(schedule.start_time)}</span> -{' '}
                              <span className="font-medium">{formatTime(schedule.end_time)}</span>
                              {schedule.notes && (
                                <span className="ml-3 text-gray-500">• {schedule.notes}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 sm:mt-0">
                            <button
                              onClick={() => {
                                setIsDayModalOpen(false);
                                openActionModal(schedule);
                              }}
                              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                              Beoordelen
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Rejected schedules */}
                {getRejectedSchedulesForDate(selectedDate).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Afgewezen</h4>
                    {getRejectedSchedulesForDate(selectedDate).map(schedule => (
                      <div
                        key={schedule.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors mb-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">{schedule.username}</span>
                            <span className="text-sm text-gray-500">({schedule.email})</span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                              Afgewezen
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{formatTime(schedule.start_time)}</span> -{' '}
                            <span className="font-medium">{formatTime(schedule.end_time)}</span>
                            {schedule.notes && (
                              <span className="ml-3 text-gray-500">• {schedule.notes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setIsDayModalOpen(false);
                  setSelectedDate(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

