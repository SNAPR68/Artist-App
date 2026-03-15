'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { clsx } from 'clsx';
import { X, CheckCircle, WarningCircle, XCircle, Info } from '@phosphor-icons/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...msg, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, toast.duration ?? 4000);
    return () => clearTimeout(timeout);
  }, [toast.duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" weight="fill" />,
    error: <XCircle className="h-5 w-5 text-red-500" weight="fill" />,
    warning: <WarningCircle className="h-5 w-5 text-amber-500" weight="fill" />,
    info: <Info className="h-5 w-5 text-blue-500" weight="fill" />,
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-white',
        'animate-in slide-in-from-right-full fade-in duration-300',
      )}
      role="alert"
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-neutral-800">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-neutral-400 hover:text-neutral-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
