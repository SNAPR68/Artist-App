'use client';

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  inquiry: { label: 'Inquiry', color: 'bg-nocturne-info/15 text-nocturne-info' },
  shortlisted: { label: 'Shortlisted', color: 'bg-nocturne-info/15 text-nocturne-info' },
  quoted: { label: 'Quoted', color: 'bg-nocturne-warning/15 text-nocturne-warning' },
  negotiating: { label: 'Negotiating', color: 'bg-nocturne-warning/15 text-nocturne-warning' },
  confirmed: { label: 'Confirmed', color: 'bg-nocturne-success/15 text-nocturne-success' },
  pre_event: { label: 'Pre-Event', color: 'bg-nocturne-success/15 text-nocturne-success' },
  event_day: { label: 'Event Day', color: 'bg-nocturne-primary/15 text-nocturne-primary' },
  completed: { label: 'Completed', color: 'bg-nocturne-success/15 text-nocturne-success' },
  settled: { label: 'Settled', color: 'bg-nocturne-success/15 text-nocturne-success' },
  cancelled: { label: 'Cancelled', color: 'bg-nocturne-error/15 text-nocturne-error' },
  expired: { label: 'Expired', color: 'bg-nocturne-text-tertiary/15 text-nocturne-text-secondary' },
  disputed: { label: 'Disputed', color: 'bg-nocturne-error/15 text-nocturne-error' },
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
  const config = STATE_CONFIG[currentStatus] ?? { label: currentStatus, color: 'bg-white/10 text-white/40' };

  return (
    <div>
      {/* Current Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-3 h-3 rounded-full ${config.color}`} />
        <span className="font-semibold text-nocturne-text-primary">{config.label}</span>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {events.map((event, i) => {
          const toConfig = STATE_CONFIG[event.to_status] ?? { label: event.to_status, color: 'bg-white/10 text-white/40' };
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-2.5 h-2.5 rounded-full ${toConfig.color} mt-1.5`} />
                {i < events.length - 1 && <div className="w-px h-8 bg-nocturne-border" />}
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium text-nocturne-text-primary">{toConfig.label}</p>
                <p className="text-xs text-nocturne-text-secondary">
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
