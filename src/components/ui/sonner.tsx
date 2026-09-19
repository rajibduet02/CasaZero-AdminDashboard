"use client";

/**
 * Re-export the real Sonner toaster so `import { toast } from 'sonner'`
 * and this mounted `<Toaster />` share the same notification system.
 */
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export const toast = sonnerToast;

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand={false}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border shadow-lg',
        },
      }}
    />
  );
}
