// Global toast utility
interface ToastType {
  id: string;
  message: string;
  type: 'success' | 'error';
}

// Global toast state
let toasts: ToastType[] = [];
let toastListeners: ((toasts: ToastType[]) => void)[] = [];

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Show toast function
export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const id = generateId();
  const newToast: ToastType = { id, message, type };
  
  toasts = [...toasts, newToast];
  
  // Notify all listeners
  toastListeners.forEach(listener => listener([...toasts]));
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toasts = toasts.filter(toast => toast.id !== id);
    toastListeners.forEach(listener => listener([...toasts]));
  }, 5000);
};

// Subscribe to toast changes
export const subscribeToToasts = (listener: (toasts: ToastType[]) => void) => {
  toastListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
};

// Remove specific toast
export const removeToast = (id: string) => {
  toasts = toasts.filter(toast => toast.id !== id);
  toastListeners.forEach(listener => listener([...toasts]));
};

// Get current toasts
export const getCurrentToasts = () => [...toasts];