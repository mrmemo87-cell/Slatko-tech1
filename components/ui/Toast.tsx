
import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from '../../types';
import { CloseIcon } from './Icons';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4700);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };
  
  const baseClasses = 'w-full max-w-sm p-4 rounded-lg shadow-lg flex items-center justify-between text-white transform transition-all duration-300 ease-in-out';
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
  };
  const animationClasses = isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0';

  return (
    <div className={`${baseClasses} ${typeClasses[toast.type]} ${animationClasses}`}>
      <span>{toast.message}</span>
      <button onClick={handleDismiss} className="ml-4 p-1 rounded-full hover:bg-black/20">
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
};


interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
