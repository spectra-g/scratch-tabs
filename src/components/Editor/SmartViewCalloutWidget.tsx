import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from '../Icons';
import { SmartView } from '../../views/registry';

const AUTO_DISMISS_TIMEOUT_MS = 15000;

interface SmartViewCalloutWidgetProps {
  view: SmartView;
  onSwitch: () => void;
  onDismiss: () => void;
}

export const SmartViewCalloutWidget: React.FC<SmartViewCalloutWidgetProps> = ({
  view,
  onSwitch,
  onDismiss,
}) => {
  // Auto-dismiss after configured timeout
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-between p-2 bg-gray-800 border border-blue-500/30 text-blue-200 rounded-lg shadow-lg max-w-sm"
      style={{
        position: 'relative',
        zIndex: 1000,
      }}
    >
      <div className="flex items-center space-x-3">
        <Sparkles size={18} className="text-blue-400 flex-shrink-0" />
        <div className="text-sm">
          A <span className="font-semibold text-white">{view.label}</span> is available.
        </div>
      </div>
      <div className="flex items-center space-x-1 ml-3">
        <button
          onClick={onSwitch}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
        >
          Switch
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-white hover:bg-blue-800/50 rounded"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};
