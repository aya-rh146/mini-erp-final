import { toast as toastFunction } from './toast';

export const useToast = () => {
  return {
    toast: (options: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      const message = options.description || options.title || 'Notification';
      const type = options.variant === 'destructive' ? 'error' : 'success';
      toastFunction(message, type);
    },
  };
};

