"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = { id: number; message: string };

const ToastContext = createContext({
  show: (msg: string) => {}
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<any> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="bg-zinc-900/90 text-white px-4 py-2 rounded-md shadow-md">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
