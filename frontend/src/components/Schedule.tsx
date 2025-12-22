import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Schedule {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type TimeBlock = 'full' | 'morning' | 'afternoon' | 'evening' | 'custom';

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<TimeBlock>('full');
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [selectedScheduleForDelete, setSelectedScheduleForDelete] = useState<Schedule | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Helper function to format date consistently (moved up to be available everywhere)
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
        // Use local date methods to avoid timezone conversion
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return datePart; // Fallback
    }
    // Format as YYYY-MM-DD without timezone issues
    // Use local date methods (getFullYear, getMonth, getDate) which use local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    return formatted;
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentMonth]);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      // Use local date formatting to avoid timezone issues
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = formatDateForComparison(firstDay);
      const endDate = formatDateForComparison(lastDay);
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/schedules/my-schedules?startDate=${startDate}&endDate=${endDate}`,
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
        
        // Normalize dates from database - handle UTC timezone conversion issue
        // PostgreSQL DATE type is stored as date only, but when returned as timestamp it's converted to UTC
        // If server is in UTC+1, "2025-12-25" becomes "2025-12-24T23:00:00.000Z" in UTC
        // We need to recover the original date by checking the UTC time
        const normalizedSchedules = schedulesData.map((s: Schedule) => {
          let dateStr = s.date;
          
          if (dateStr.includes('T')) {
            // Parse the UTC timestamp
            const utcDate = new Date(dateStr);
            
            // If UTC time is 23:00 or later, it means the date was shifted back by timezone conversion
            // Example: "2025-12-25" in UTC+1 becomes "2025-12-24T23:00:00.000Z" in UTC
            // We need to add 1 day to get back to the original date
            const utcHours = utcDate.getUTCHours();
            const utcMinutes = utcDate.getUTCMinutes();
            const utcSeconds = utcDate.getUTCSeconds();
            
            // If time is 23:00:00 or later, it's likely a timezone shift (server in UTC+1 or similar)
            if (utcHours >= 23 || (utcHours === 22 && utcMinutes > 0)) {
              // Add one day to compensate for timezone conversion
              const correctedDate = new Date(utcDate);
              correctedDate.setUTCDate(correctedDate.getUTCDate() + 1);
              const year = correctedDate.getUTCFullYear();
              const month = correctedDate.getUTCMonth();
              const day = correctedDate.getUTCDate();
              dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            } else {
              // Normal case - use UTC date directly
              const year = utcDate.getUTCFullYear();
              const month = utcDate.getUTCMonth();
              const day = utcDate.getUTCDate();
              dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          } else if (dateStr.includes(' ')) {
            dateStr = dateStr.split(' ')[0];
          }
          
          return {
            ...s,
            date: dateStr
          };
        });
        
        setSchedules(normalizedSchedules);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij ophalen rooster');
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Netwerkfout bij ophalen rooster');
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeBlockTimes = (block: TimeBlock): { start: string; end: string } => {
    switch (block) {
      case 'full':
        return { start: '09:00', end: '17:00' };
      case 'morning':
        return { start: '09:00', end: '13:00' };
      case 'afternoon':
        return { start: '13:00', end: '17:00' };
      case 'evening':
        return { start: '17:00', end: '21:00' };
      case 'custom':
        return { start: customStartTime, end: customEndTime };
      default:
        return { start: '09:00', end: '17:00' };
    }
  };

  const handleDayClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get local date components directly (no timezone conversion)
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Create normalized date for comparison
    const normalizedDate = new Date(year, month, day, 0, 0, 0, 0);
    
    // Only allow clicking on future dates
    if (normalizedDate.getTime() < today.getTime()) {
      return;
    }

    // Store the normalized date
    setSelectedDate(normalizedDate);
    setSelectedTimeBlock('full');
    setCustomStartTime('09:00');
    setCustomEndTime('17:00');
    setNotes('');
    setIsQuickAddModalOpen(true);
  };

  const handleQuickAdd = async () => {
    if (!selectedDate) return;

    try {
      setError('');
      const token = localStorage.getItem('token');
      
      const times = getTimeBlockTimes(selectedTimeBlock);
      
      // Format date directly from local date components - NO Date object conversion
      // This ensures we use the exact date that was clicked, not a timezone-converted version
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      
      // Format as YYYY-MM-DD directly from components (no timezone conversion possible)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      console.log('Saving availability:', {
        selectedDate: selectedDate,
        year,
        month: month + 1,
        day,
        dateStr,
        times
      });
      
      const response = await fetch(`${BACKEND_URL}/api/schedules/availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          date: dateStr,
          startTime: times.start,
          endTime: times.end,
          notes: notes.trim() || null
        })
      });

      if (response.ok) {
        setIsQuickAddModalOpen(false);
        setSelectedDate(null);
        fetchSchedules();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij opslaan beschikbaarheid');
      }
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Netwerkfout bij opslaan beschikbaarheid');
    }
  };

  const handleScheduleClick = (schedule: Schedule, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent day click
    
    if (schedule.status === 'pending') {
      setSelectedScheduleForDelete(schedule);
      setIsDeleteModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedScheduleForDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/schedules/${selectedScheduleForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setIsDeleteModalOpen(false);
        setSelectedScheduleForDelete(null);
        fetchSchedules();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Fout bij verwijderen beschikbaarheid');
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Netwerkfout bij verwijderen beschikbaarheid');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
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
      // Create date at midnight local time to avoid timezone issues
      days.push(new Date(year, month, day, 0, 0, 0, 0));
    }
    
    return days;
  };

  const getSchedulesForDate = (date: Date) => {
    // Format calendar date directly from local components (no timezone conversion)
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Compare with schedule dates - dates are now normalized to YYYY-MM-DD format
    return schedules.filter(s => {
      // s.date is already normalized to YYYY-MM-DD format in fetchSchedules
      return s.date === dateStr;
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Rooster laden...</p>
        </div>
      </div>
    );
  }

  const calendarDays = getDaysInMonth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mijn Rooster</h1>
        <p className="text-gray-600 mt-1">Klik op een dag in de toekomst om beschikbaarheid op te geven</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span>In behandeling</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Goedgekeurd</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>Afgewezen</span>
          </div>
          <div className="text-gray-500 ml-auto">
            💡 Klik op een dag om beschikbaarheid toe te voegen, klik op een beschikbaarheid om te verwijderen
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

            const daySchedules = getSchedulesForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = date.getTime() < today.getTime();
            const isFuture = date.getTime() >= today.getTime();

            return (
              <div
                key={date.toISOString()}
                onClick={() => isFuture && handleDayClick(date)}
                className={`aspect-square border-2 rounded-lg p-2 transition-all cursor-pointer ${
                  isToday 
                    ? 'bg-blue-50 border-blue-300' 
                    : isPast 
                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                    : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5'
                } ${isFuture ? 'hover:shadow-md' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-700' : isPast ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {daySchedules.map(schedule => (
                    <div
                      key={schedule.id}
                      onClick={(e) => handleScheduleClick(schedule, e)}
                      className={`text-xs p-1.5 rounded border-2 ${
                        schedule.status === 'pending' 
                          ? 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200 cursor-pointer' 
                          : schedule.status === 'approved'
                          ? 'bg-green-100 border-green-400'
                          : 'bg-red-100 border-red-400'
                      } transition-colors`}
                      title={`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}: ${getStatusLabel(schedule.status)}${schedule.status === 'pending' ? ' (klik om te verwijderen)' : ''}`}
                    >
                      <div className="font-medium truncate flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(schedule.status)}`}></div>
                        {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                      </div>
                      {schedule.status === 'pending' && (
                        <div className="text-[10px] text-yellow-700 mt-0.5">
                          Klik om te verwijderen
                        </div>
                      )}
                    </div>
                  ))}
                  {isFuture && daySchedules.length === 0 && (
                    <div className="text-[10px] text-gray-400 text-center mt-1">
                      Klik om toe te voegen
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alle Beschikbaarheden</h3>
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Geen beschikbaarheden voor deze maand</p>
        ) : (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">
                      {new Date(schedule.date).toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      schedule.status === 'approved' 
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : schedule.status === 'rejected'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {getStatusLabel(schedule.status)}
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
                {schedule.status === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedScheduleForDelete(schedule);
                      setIsDeleteModalOpen(true);
                    }}
                    className="mt-3 sm:mt-0 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {isQuickAddModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Beschikbaarheid Opgeven
            </h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Datum</div>
              <div className="font-semibold text-gray-900">
                {selectedDate.toLocaleDateString('nl-NL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Tijdblok</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedTimeBlock('full')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    selectedTimeBlock === 'full'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="font-medium">Hele Dag</div>
                  <div className="text-xs opacity-80">09:00 - 17:00</div>
                </button>
                <button
                  onClick={() => setSelectedTimeBlock('morning')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    selectedTimeBlock === 'morning'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="font-medium">Ochtend</div>
                  <div className="text-xs opacity-80">09:00 - 13:00</div>
                </button>
                <button
                  onClick={() => setSelectedTimeBlock('afternoon')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    selectedTimeBlock === 'afternoon'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="font-medium">Middag</div>
                  <div className="text-xs opacity-80">13:00 - 17:00</div>
                </button>
                <button
                  onClick={() => setSelectedTimeBlock('evening')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    selectedTimeBlock === 'evening'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <div className="font-medium">Avond</div>
                  <div className="text-xs opacity-80">17:00 - 21:00</div>
                </button>
              </div>
              
              <button
                onClick={() => setSelectedTimeBlock('custom')}
                className={`w-full mt-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  selectedTimeBlock === 'custom'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <div className="font-medium">Aangepast</div>
              </button>
            </div>

            {selectedTimeBlock === 'custom' && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Starttijd
                  </label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eindtijd
                  </label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opmerkingen (optioneel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Voeg opmerkingen toe over je beschikbaarheid..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleQuickAdd}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Toevoegen
              </button>
              <button
                onClick={() => {
                  setIsQuickAddModalOpen(false);
                  setSelectedDate(null);
                  setNotes('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedScheduleForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Beschikbaarheid Verwijderen
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Weet je zeker dat je deze beschikbaarheid wilt verwijderen?
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-1">
                  {new Date(selectedScheduleForDelete.date).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {formatTime(selectedScheduleForDelete.start_time)} - {formatTime(selectedScheduleForDelete.end_time)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Verwijderen
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedScheduleForDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
