import { useState, useCallback } from 'react';
import type { ToastType } from '../components/Toast';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showError = useCallback((message: string) => {
    addToast('error', message);
  }, [addToast]);

  const showSuccess = useCallback((message: string) => {
    addToast('success', message);
  }, [addToast]);

  const showWarning = useCallback((message: string) => {
    addToast('warning', message);
  }, [addToast]);

  const showInfo = useCallback((message: string) => {
    addToast('info', message);
  }, [addToast]);

  return {
    toasts,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}