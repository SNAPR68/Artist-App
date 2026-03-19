'use client';

import { useEffect, useState } from 'react';
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

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-300',
  held: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  booked: 'bg-red-100 text-red-800 border-red-300',
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
      <h1 className="text-2xl font-bold text-gray-900">Availability Calendar</h1>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
          <span className="text-gray-600">Blocked</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-gray-600">Booked</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="text-gray-500 hover:text-gray-700 px-3 py-1">&larr;</button>
        <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
        <button onClick={nextMonth} className="text-gray-500 hover:text-gray-700 px-3 py-1">&rarr;</button>
      </div>

      {/* Calendar Grid */}
      <div className={`${saving ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
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
            const statusClass = entry ? STATUS_COLORS[entry.status] : 'bg-white border-gray-200';

            return (
              <button
                key={day}
                onClick={() => !isPast && toggleDate(day)}
                disabled={isPast || isBooked || loading}
                className={`aspect-square flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${statusClass} ${
                  isPast ? 'opacity-40 cursor-not-allowed' : isBooked ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-primary-300'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">Tap a date to toggle between available and blocked. Booked dates cannot be changed.</p>
    </div>
  );
}
