'use client';

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  inquiry: { label: 'Inquiry', color: 'bg-blue-500' },
  shortlisted: { label: 'Shortlisted', color: 'bg-blue-400' },
  quoted: { label: 'Quoted', color: 'bg-yellow-500' },
  negotiating: { label: 'Negotiating', color: 'bg-yellow-600' },
  confirmed: { label: 'Confirmed', color: 'bg-green-500' },
  pre_event: { label: 'Pre-Event', color: 'bg-green-600' },
  event_day: { label: 'Event Day', color: 'bg-purple-500' },
  completed: { label: 'Completed', color: 'bg-purple-600' },
  settled: { label: 'Settled', color: 'bg-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
  expired: { label: 'Expired', color: 'bg-gray-400' },
  disputed: { label: 'Disputed', color: 'bg-red-600' },
};

interface BookingEvent {
  from_status: string;
  to_status: string;
  triggered_by: string;
  created_at: string;
}

interface StateTimelineProps {
  currentStatus: string;
  events: BookingEvent[];
}

export function StateTimeline({ currentStatus, events }: StateTimelineProps) {
  const config = STATE_CONFIG[currentStatus] ?? { label: currentStatus, color: 'bg-gray-500' };

  return (
    <div>
      {/* Current Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-3 h-3 rounded-full ${config.color}`} />
        <span className="font-semibold text-gray-900">{config.label}</span>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {events.map((event, i) => {
          const toConfig = STATE_CONFIG[event.to_status] ?? { label: event.to_status, color: 'bg-gray-400' };
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-2.5 h-2.5 rounded-full ${toConfig.color} mt-1.5`} />
                {i < events.length - 1 && <div className="w-px h-8 bg-gray-200" />}
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium text-gray-900">{toConfig.label}</p>
                <p className="text-xs text-gray-400">
                  {new Date(event.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
