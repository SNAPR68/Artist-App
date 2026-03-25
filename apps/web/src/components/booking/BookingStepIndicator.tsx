'use client';

import { Check } from 'lucide-react';

interface BookingStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function BookingStepIndicator({ currentStep, totalSteps, labels }: BookingStepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {labels.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-nocturne text-nocturne-text-primary'
                    : isActive
                    ? 'bg-nocturne-primary/20 border-2 border-nocturne-primary text-nocturne-primary scale-110'
                    : 'bg-nocturne-surface border border-nocturne-border text-nocturne-text-secondary'
                }`}
              >
                {isCompleted ? <Check size={14} /> : step}
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-nocturne-text-primary' : 'text-nocturne-text-secondary'}`}>
                {label}
              </span>
            </div>

            {/* Connecting line */}
            {i < totalSteps - 1 && (
              <div className="flex-1 h-[2px] mx-2 mt-[-18px] relative">
                <div
                  className="absolute inset-0 h-full bg-gradient-nocturne origin-left transition-transform duration-300"
                  style={{ transform: isCompleted ? 'scaleX(1)' : 'scaleX(0)' }}
                />
                <div className="h-full bg-nocturne-border" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
