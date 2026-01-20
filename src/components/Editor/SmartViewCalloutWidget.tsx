import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from '../Icons';
import { SmartView } from '../../views/registry';
import { formatRegistry } from '../../formats';

const AUTO_DISMISS_TIMEOUT_MS = 15000;

interface SmartViewCalloutWidgetProps {
  view: SmartView;
  languageId: string;
  onSwitch: () => void;
  onDismiss: () => void;
}

export const SmartViewCalloutWidget: React.FC<SmartViewCalloutWidgetProps> = ({
  view,
  languageId,
  onSwitch,
  onDismiss,
}) => {
  // Auto-dismiss after configured timeout
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Get the format name from the registry
  const formatName = useMemo(() => {
    const formatModule = formatRegistry.getById(languageId);
    return formatModule?.name || languageId.toUpperCase();
  }, [languageId]);

  return (
    <motion.div
      data-testid="smart-view-callout"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-between p-3 bg-surface border border-base border-l-4 border-l-primary text-main rounded shadow-xl max-w-sm backdrop-blur-sm"
      style={{
        position: 'relative',
        zIndex: 1000,
        minWidth: '300px'
      }}
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="p-1.5 bg-primary/10 rounded-full flex-shrink-0">
           <Sparkles size={16} className="text-primary animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-main">{formatName} Detected</span>
          <span className="text-[10px] text-muted truncate">Smart View available</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
        <button
          data-testid="smart-view-callout-switch"
          onClick={onSwitch}
          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded transition-colors shadow-sm"
        >
          Open View
        </button>
        <button
          data-testid="smart-view-callout-dismiss"
          onClick={onDismiss}
          className="p-1.5 text-muted hover:text-main hover:bg-element-hover rounded transition-colors"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};