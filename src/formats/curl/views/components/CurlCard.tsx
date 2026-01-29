import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ExternalLink, Globe, Clock, Code, Copy, Trash2, Check, X, Plus } from '../../../../components/Icons';
import { CurlRequest } from '../../utils/parser';
import { CurlRequestBuilder } from './CurlRequestBuilder';
import { compileCurlCommand } from '../../utils/compiler';

interface CurlCardProps {
  request: CurlRequest;
  isExpanded: boolean;
  onClick: () => void;
  onRequestChange: (newRequest: CurlRequest) => void;
  onOpenInRestClient: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  index?: number;
}

export const CurlCard: React.FC<CurlCardProps> = ({
  request,
  isExpanded,
  onClick,
  onRequestChange,
  onOpenInRestClient,
  onDelete,
  onDuplicate,
  index,
}) => {
  // Generate live curl command
  const generatedCurlCommand = useMemo(() => {
    return compileCurlCommand(request);
  }, [request]);

  // State for feedback animations
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'success'>('idle');
  const [deleteFeedback, setDeleteFeedback] = useState<'idle' | 'confirm' | 'success' | 'error'>('idle');
  const [duplicateFeedback, setDuplicateFeedback] = useState<'idle' | 'success' | 'error'>('idle');

  // Copy curl command to clipboard
  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(generatedCurlCommand);
      setCopyFeedback('success');
      setTimeout(() => setCopyFeedback('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy curl command:', error);
    }
  };

  // Handle delete with confirmation
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteFeedback === 'idle') {
      setDeleteFeedback('confirm');
      setTimeout(() => {
        setDeleteFeedback(current => current === 'confirm' ? 'idle' : current);
      }, 3000); // Reset after 3 seconds if not confirmed
    } else if (deleteFeedback === 'confirm') {
      if (onDelete) {
        onDelete();
        setDeleteFeedback('success');
      } else {
        setDeleteFeedback('error');
      }
      setTimeout(() => setDeleteFeedback('idle'), 2000);
    }
  };

  // Handle duplicate
  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate();
      setDuplicateFeedback('success');
      setTimeout(() => setDuplicateFeedback('idle'), 2000);
    } else {
      setDuplicateFeedback('error');
      setTimeout(() => setDuplicateFeedback('idle'), 2000);
    }
  };
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-success bg-success/20';
      case 'POST': return 'text-info bg-info/20';
      case 'PUT': return 'text-warning bg-warning/20';
      case 'DELETE': return 'text-danger bg-danger/20';
      case 'PATCH': return 'text-primary bg-primary/20';
      default: return 'text-secondary bg-element';
    }
  };

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  };

  return (
    <motion.div
      layout
      className={`border rounded-lg overflow-hidden transition-all duration-200 max-w-full ${isExpanded
        ? 'border-info bg-surface shadow-lg shadow-info/10'
        : 'border-base bg-surface/50 hover:border-base/70 hover:bg-surface/70'
        }`}
      data-testid="curl-card"
    >
      {/* Card header - always visible */}
      <div
        className={`px-3 py-2.5 cursor-pointer ${isExpanded ? '' : 'hover:bg-element-hover'}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Expand/collapse icon */}
            <button
              onClick={onClick}
              className="p-1 hover:bg-element-hover rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-secondary" />
              ) : (
                <ChevronRight size={16} className="text-secondary" />
              )}
            </button>

            {/* Card index */}
            {typeof index === 'number' && (
              <span className="text-xs text-muted/50 font-mono mr-1.5">#{index + 1}</span>
            )}

            {/* Method badge */}
            <span className={`px-2.5 py-1 rounded text-sm font-semibold tracking-wide ${getMethodColor(request.method)}`}>
              {request.method}
            </span>

            {/* URL */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <Globe size={12} className="text-secondary flex-shrink-0" />
                <span className="text-main font-medium truncate" title={request.url}>
                  {getDomain(request.url)}
                </span>
              </div>
              <div className="text-xs text-muted truncate mt-px pl-[18px]" title={request.url}>
                {request.url}
              </div>
            </div>
          </div>

          {/* Quick stats and actions */}
          <div className="flex items-center space-x-3">
            {/* Quick stats */}
            <div className="flex items-center space-x-3 text-xs text-muted">
              {request.headers.length > 0 && (
                <span>{request.headers.length} headers</span>
              )}
              {request.body && (
                <span>body</span>
              )}
              {request.otherOptions.length > 0 && (
                <span>{request.otherOptions.length} options</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
              {/* Duplicate button */}
              {onDuplicate && (
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className={`p-1 rounded transition-colors ${duplicateFeedback === 'success'
                    ? 'bg-success/20 text-success'
                    : duplicateFeedback === 'error'
                      ? 'bg-danger/20 text-danger'
                      : 'text-muted hover:text-info hover:bg-info/20'
                    }`}
                  title="Duplicate this request"
                >
                  {duplicateFeedback === 'success' ? (
                    <Check size={14} />
                  ) : duplicateFeedback === 'error' ? (
                    <X size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                </button>
              )}

              {/* Delete button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`p-1 rounded transition-colors ${deleteFeedback === 'confirm'
                    ? 'bg-danger/20 text-danger hover:bg-danger/30'
                    : deleteFeedback === 'success'
                      ? 'bg-success/20 text-success'
                      : deleteFeedback === 'error'
                        ? 'bg-danger/20 text-danger'
                        : 'text-muted hover:text-danger hover:bg-danger/20'
                    }`}
                  title={deleteFeedback === 'confirm' ? 'Click again to confirm delete' : 'Delete this request'}
                >
                  {deleteFeedback === 'confirm' ? (
                    <X size={14} />
                  ) : deleteFeedback === 'success' ? (
                    <Check size={14} />
                  ) : deleteFeedback === 'error' ? (
                    <X size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-t border-base overflow-hidden"
          >
            <div className="px-3 py-3 max-w-full">
              {/* Action buttons */}
              <div className="flex items-center justify-between mb-3">
                {request.url && request.url.trim() && (
                  <div className="flex items-center space-x-2">
                    <Clock size={14} className="text-muted" />
                    <span className="text-xs text-muted">Ready to execute</span>
                  </div>
                )}
                <button
                  onClick={onOpenInRestClient}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Open in Rest Client</span>
                </button>
              </div>

              {/* Live curl command preview */}
              <div className="mb-4 p-3 bg-canvas border border-base rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Code size={16} className="text-info" />
                    <h4 className="text-sm font-medium text-main">Generated Curl Command</h4>
                  </div>
                  <button
                    onClick={handleCopyCommand}
                    className={`flex items-center space-x-1 px-3 py-1 rounded border transition-colors ${copyFeedback === 'success'
                      ? 'bg-success text-white border-transparent'
                      : 'bg-element hover:bg-element-hover text-main border-base'
                      }`}
                    title="Copy to clipboard"
                  >
                    {copyFeedback === 'success' ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span className="text-xs">
                      {copyFeedback === 'success' ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                </div>
                <pre className="text-xs text-main font-mono p-3 bg-canvas rounded border border-base max-w-full whitespace-pre-wrap break-all">
                  {generatedCurlCommand}
                </pre>
              </div>

              {/* Request builder */}
              <CurlRequestBuilder
                request={request}
                onRequestChange={onRequestChange}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};