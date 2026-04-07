import { useState } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    // Simple alert-based toast for now
    // Can be replaced with a proper toast library like sonner or react-hot-toast
    if (variant === 'destructive') {
      alert(`Error: ${title}\n${description || ''}`);
    } else {
      alert(`${title}\n${description || ''}`);
    }
  };

  return { toast };
}
