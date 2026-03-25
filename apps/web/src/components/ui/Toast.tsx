'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'glass-card border-l-4 border-nocturne-success text-nocturne-text-primary',
  error: 'glass-card border-l-4 border-nocturne-error text-nocturne-text-primary',
  info: 'glass-card border-l-4 border-nocturne-info text-nocturne-text-primary',
  warning: 'glass-card border-l-4 border-nocturne-warning text-nocturne-text-primary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${TOAST_COLORS[toast.type]} px-4 py-3 rounded-lg shadow-lg animate-slide-in-right max-w-sm text-sm`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
