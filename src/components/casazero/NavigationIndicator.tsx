import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface NavigationIndicatorProps {
  direction: 'back' | 'forward' | null;
}

export function NavigationIndicator({ direction }: NavigationIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (direction) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timer);
    }
  }, [direction]);

  return (
    <AnimatePresence>
      {show && direction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-surface-white border border-neutral-line-200 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            {direction === 'back' ? (
              <>
                <ArrowLeft className="w-4 h-4 text-brand-sage-600" />
                <span className="text-sm text-neutral-ink-700">Back</span>
              </>
            ) : (
              <>
                <span className="text-sm text-neutral-ink-700">Forward</span>
                <ArrowRight className="w-4 h-4 text-brand-sage-600" />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
