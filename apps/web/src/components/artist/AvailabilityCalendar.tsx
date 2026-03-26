'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';

interface AvailabilityEntry {
  date: string;
  status: 'available' | 'unavailable';
}

interface AvailabilityCalendarProps {
  availability: AvailabilityEntry[];
}

export function AvailabilityCalendar({ availability }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!availability.length) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const availMap = new Map(availability.map((e) => [e.date, e.status]));

  const getStatus = (day: Date) => availMap.get(format(day, 'yyyy-MM-dd'));

  return (
    <div className="mb-8">
      <h2 className="text-lg font-display font-semibold text-nocturne-text-primary mb-4">Availability</h2>

      <div className="glass-card p-4">
        {/* Month Nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-nocturne-surface text-nocturne-text-secondary transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-sm font-semibold text-nocturne-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-nocturne-surface text-nocturne-text-secondary transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-nocturne-text-secondary uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const status = getStatus(day);
            const inMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={day.toISOString()}
                className={`h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                  !inMonth
                    ? 'text-surface-overlay/30'
                    : status === 'available'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : status === 'unavailable'
                    ? 'bg-red-500/10 text-red-400/60'
                    : 'text-nocturne-text-secondary'
                } ${isToday(day) ? 'ring-1 ring-primary-500/50' : ''}`}
                title={status ? `${format(day, 'MMM d')}: ${status}` : undefined}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-nocturne-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500/15 border border-green-500/20" />
            <span className="text-[10px] text-nocturne-text-secondary">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/10" />
            <span className="text-[10px] text-nocturne-text-secondary">Booked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
