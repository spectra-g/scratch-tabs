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

  // Get the format name from the registry (same as status bar)
  const formatName = useMemo(() => {
    const formatModule = formatRegistry.getById(languageId);
    return formatModule?.name || languageId.toUpperCase();
  }, [languageId]);

  return (
    <motion.div
      data-testid="smart-view-callout"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-between p-2 bg-surface border border-info/30 text-info rounded-lg shadow-lg max-w-sm"
      style={{
        position: 'relative',
        zIndex: 1000,
      }}
    >
      <div className="flex items-center space-x-3">
        <Sparkles size={18} className="text-info flex-shrink-0" />
        <div className="text-sm" data-testid="smart-view-callout-message">
          Smart View for <span className="font-semibold text-main">{formatName}</span> is available.
        </div>
      </div>
      <div className="flex items-center space-x-1 ml-3">
        <button
          data-testid="smart-view-callout-switch"
          onClick={onSwitch}
          className="px-3 py-1 bg-primary text-xs font-medium rounded transition-colors"
        >
          Switch
        </button>
        <button
          data-testid="smart-view-callout-dismiss"
          onClick={onDismiss}
          className="p-1 text-muted hover:text-main hover:bg-element-hover rounded"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};
