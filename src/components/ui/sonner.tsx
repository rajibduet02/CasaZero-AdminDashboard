"use client";

import * as React from "react";

// Simple toast implementation without sonner dependency
// This maintains the Toaster component API but uses a basic implementation

let toastCallbacks: Array<(message: string, type: string) => void> = [];

export const toast = {
  success: (message: string) => {
    toastCallbacks.forEach(cb => cb(message, 'success'));
  },
  error: (message: string) => {
    toastCallbacks.forEach(cb => cb(message, 'error'));
  },
  info: (message: string) => {
    toastCallbacks.forEach(cb => cb(message, 'info'));
  },
  warning: (message: string) => {
    toastCallbacks.forEach(cb => cb(message, 'warning'));
  },
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; type: string }>>([]);
  const nextId = React.useRef(0);

  React.useEffect(() => {
    const callback = (message: string, type: string) => {
      const id = nextId.current++;
      setToasts(prev => [...prev, { id, message, type }]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    toastCallbacks.push(callback);
    return () => {
      toastCallbacks = toastCallbacks.filter(cb => cb !== callback);
    };
  }, []);

  return (
    <div className="fixed top-0 right-0 z-50 p-4 pointer-events-none">
      <div className="flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-white animate-in slide-in-from-top-5 ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' :
              toast.type === 'warning' ? 'bg-yellow-600' :
              'bg-blue-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
