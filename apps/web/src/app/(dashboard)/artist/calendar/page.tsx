'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Lock, Calendar, type LucideIcon } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { icon: LucideIcon; bgGlass: string; textColor: string; label: string }> = {
  available: {
    icon: Check,
    bgGlass: 'bg-gradient-to-br from-green-500/20 to-transparent border border-green-400/30',
    textColor: 'text-green-300',
    label: 'Available',
  },
  held: {
    icon: Lock,
    bgGlass: 'bg-gradient-to-br from-[#ffbf00]/20 to-transparent border border-[#ffbf00]/30',
    textColor: 'text-[#ffbf00]',
    label: 'Blocked',
  },
  booked: {
    icon: Calendar,
    bgGlass: 'bg-gradient-to-br from-[#c39bff]/20 to-transparent border border-[#c39bff]/30',
    textColor: 'text-[#c39bff]',
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

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [calRes, bookingsRes] = await Promise.all([
      apiClient<CalendarEntry[]>(`/v1/calendar?start_date=${startDate}&end_date=${endDate}`),
      apiClient<BookingRecord[]>('/v1/bookings?role=artist&per_page=200'),
    ]);

    const calEntries = calRes.success ? calRes.data : [];

    if (bookingsRes.success) {
      const bookingDates = new Map<string, BookingRecord>();
      const bookingsData = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      for (const b of bookingsData) {
        if (b.event_date && ['confirmed', 'pre_event', 'event_day', 'completed', 'inquiry', 'quoted', 'negotiating'].includes(b.status)) {
          const dateStr = b.event_date.split('T')[0];
          bookingDates.set(dateStr, b);
        }
      }

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
  }, [year, month, daysInMonth]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const getEntryForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries.find((e) => e.date === dateStr);
  };

  const toggleDate = async (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = getEntryForDate(day);

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
      {/* ─── Ambient Glows ─── */}
      <div className="fixed -top-40 -right-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 w-80 h-80 bg-[#a1faff]/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ─── Hero Section ─── */}
      <section className="relative z-10">
        <div className="absolute -top-40 -left-20 w-96 h-96 bg-[#c39bff]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[#a1faff] font-bold text-xs tracking-widest uppercase mb-2 block">Schedule</span>
            <h1 className="text-3xl font-display font-extrabold tracking-tighter text-white">Availability Calendar</h1>
            <p className="text-white/40 text-sm mt-1">Block dates, set availability, manage your schedule</p>
          </div>
          <Calendar className="text-[#c39bff] opacity-50" size={32} />
        </div>
      </section>

      {/* ─── Legend ─── */}
      <div className="glass-card p-4 space-y-3 rounded-xl border border-white/5 relative z-10">
        <p className="text-sm font-bold uppercase tracking-widest text-white">Calendar Legend</p>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.bgGlass} flex items-center justify-center`}>
                  <Icon size={16} className={config.textColor} />
                </div>
                <span className="text-white/60 text-sm">{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Calendar Card ─── */}
      <div className="glass-card p-6 space-y-6 rounded-xl border border-white/5 relative z-10">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-white hover:text-[#c39bff]"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-display font-black text-white">{monthName.toUpperCase()}</h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-white hover:text-[#c39bff]"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className={`${saving ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300`}>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-bold uppercase tracking-widest text-white/60 py-2">
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
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all duration-300 text-sm font-bold group ${
                    config
                      ? `${config.bgGlass} ${config.textColor}`
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  } ${
                    isPast
                      ? 'opacity-30 cursor-not-allowed'
                      : isBooked
                        ? 'cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-[0_0_20px_rgba(195,155,255,0.2)]'
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
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/50 text-center">
            Tap a date to toggle between available and blocked. Booked dates cannot be changed.
          </p>
        </div>
      </div>
    </div>
  );
}
