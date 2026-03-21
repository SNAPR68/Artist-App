'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Lock, Calendar } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';

interface CalendarEntry {
  id: string;
  date: string;
  status: 'available' | 'held' | 'booked';
  notes?: string;
}

interface BookingRecord {
  id: string;
  status: string;
  event_date: string;
  event_type?: string;
  client_name?: string;
}

const STATUS_CONFIG: Record<string, { icon: any; bgGlass: string; textColor: string; label: string }> = {
  available: {
    icon: Check,
    bgGlass: 'glass-medium bg-gradient-to-br from-green-500/10 to-transparent border-green-400/30',
    textColor: 'text-green-300',
    label: 'Available',
  },
  held: {
    icon: Lock,
    bgGlass: 'glass-medium bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-400/30',
    textColor: 'text-yellow-300',
    label: 'Blocked',
  },
  booked: {
    icon: Calendar,
    bgGlass: 'glass-medium bg-gradient-to-br from-primary-500/10 to-transparent border-primary-400/30',
    textColor: 'text-primary-300',
    label: 'Booked',
  },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  const loadCalendar = async () => {
    setLoading(true);
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Fetch calendar entries AND bookings in parallel
    const [calRes, bookingsRes] = await Promise.all([
      apiClient<CalendarEntry[]>(`/v1/calendar?start_date=${startDate}&end_date=${endDate}`),
      apiClient<BookingRecord[]>('/v1/bookings?role=artist&per_page=200'),
    ]);

    const calEntries = calRes.success ? calRes.data : [];

    // Overlay bookings onto calendar — mark booked dates from active bookings
    if (bookingsRes.success) {
      const bookingDates = new Map<string, BookingRecord>();
      const bookingsData = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      for (const b of bookingsData) {
        if (b.event_date && ['confirmed', 'pre_event', 'event_day', 'completed', 'inquiry', 'quoted', 'negotiating'].includes(b.status)) {
          const dateStr = b.event_date.split('T')[0];
          bookingDates.set(dateStr, b);
        }
      }

      // Add booking dates not already in calendar entries
      const existingDates = new Set(calEntries.map((e) => e.date));
      for (const [dateStr, booking] of bookingDates) {
        if (!existingDates.has(dateStr)) {
          const isConfirmed = ['confirmed', 'pre_event', 'event_day', 'completed'].includes(booking.status);
          calEntries.push({
            id: booking.id,
            date: dateStr,
            status: isConfirmed ? 'booked' : 'held',
            notes: `${booking.event_type ?? 'Event'} - ${booking.client_name ?? 'Booking'}`,
          });
        }
      }
    }

    setEntries(calEntries);
    setLoading(false);
  };

  const getEntryForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries.find((e) => e.date === dateStr);
  };

  const toggleDate = async (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = getEntryForDate(day);

    // Can't modify booked dates
    if (entry?.status === 'booked') return;

    const newStatus = entry?.status === 'held' ? 'available' : 'held';

    setSaving(true);
    const res = await apiClient('/v1/calendar', {
      method: 'PUT',
      body: JSON.stringify({
        dates: [{ date: dateStr, status: newStatus }],
      }),
    });

    if (res.success) {
      await loadCalendar();
    }
    setSaving(false);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Availability Calendar</h1>
          <p className="text-text-muted text-sm mt-1">Manage your booking availability</p>
        </div>
        <Calendar className="text-primary-400 opacity-50" size={32} />
      </div>

      {/* Legend */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-heading font-semibold text-text-primary">Calendar Legend</p>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.bgGlass} flex items-center justify-center`}>
                  <Icon size={16} className={config.textColor} />
                </div>
                <span className="text-text-secondary text-sm">{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Card */}
      <div className="glass-card p-6 space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg glass-medium border border-glass-border hover:bg-glass-heavy transition-all duration-300 hover-glow text-text-primary"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-heading font-bold text-gradient">{monthName}</h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg glass-medium border border-glass-border hover:bg-glass-heavy transition-all duration-300 hover-glow text-text-primary"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className={`${saving ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300`}>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-heading font-semibold text-text-muted py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const entry = getEntryForDate(day);
              const isPast = new Date(year, month, day) < new Date(new Date().setHours(0, 0, 0, 0));
              const isBooked = entry?.status === 'booked';
              const config = entry ? STATUS_CONFIG[entry.status] : null;

              return (
                <button
                  key={day}
                  onClick={() => !isPast && toggleDate(day)}
                  disabled={isPast || isBooked || loading}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all duration-300 text-sm font-heading font-bold group ${
                    config
                      ? `${config.bgGlass} ${config.textColor}`
                      : 'glass-medium border-glass-border text-text-secondary hover:bg-glass-heavy'
                  } ${
                    isPast
                      ? 'opacity-30 cursor-not-allowed'
                      : isBooked
                        ? 'cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-glow-sm hover-glow'
                  }`}
                  title={entry?.notes || (isPast ? 'Past date' : 'Click to toggle')}
                >
                  <span>{day}</span>
                  {config && (
                    <div className="text-xs opacity-75 mt-0.5">
                      {config.icon === Check && '✓'}
                      {config.icon === Lock && '⊗'}
                      {config.icon === Calendar && '●'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Helper Text */}
        <div className="border-t border-glass-border pt-4">
          <p className="text-xs text-text-muted text-center">
            Tap a date to toggle between available and blocked. Booked dates cannot be changed.
          </p>
        </div>
      </div>
    </div>
  );
}
