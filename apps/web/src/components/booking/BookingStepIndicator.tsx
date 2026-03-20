'use client';

import { motion } from 'framer-motion';
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
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? 'bg-gradient-accent text-white'
                    : isActive
                    ? 'bg-primary-500/20 border-2 border-primary-500 text-primary-400'
                    : 'bg-glass-light border border-glass-border text-text-muted'
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : undefined}
                transition={{ duration: 0.3 }}
              >
                {isCompleted ? <Check size={14} /> : step}
              </motion.div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                {label}
              </span>
            </div>

            {/* Connecting line */}
            {i < totalSteps - 1 && (
              <div className="flex-1 h-[2px] mx-2 mt-[-18px]">
                <motion.div
                  className="h-full bg-gradient-accent origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isCompleted ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                <div className="h-full bg-glass-border -mt-[2px]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
