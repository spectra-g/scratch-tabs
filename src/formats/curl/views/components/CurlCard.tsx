import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ExternalLink, Globe, Clock, Code, Copy, Trash2, Check, X } from '../../../../components/Icons';
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
}

export const CurlCard: React.FC<CurlCardProps> = ({
  request,
  isExpanded,
  onClick,
  onRequestChange,
  onOpenInRestClient,
  onDelete,
}) => {
  // Generate live curl command
  const generatedCurlCommand = useMemo(() => {
    return compileCurlCommand(request);
  }, [request]);

  // State for feedback animations
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'success'>('idle');
  const [deleteFeedback, setDeleteFeedback] = useState<'idle' | 'confirm' | 'success' | 'error'>('idle');
  
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
  // Get method color
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-400 bg-green-500/20';
      case 'POST': return 'text-blue-400 bg-blue-500/20';
      case 'PUT': return 'text-yellow-400 bg-yellow-500/20';
      case 'DELETE': return 'text-red-400 bg-red-500/20';
      case 'PATCH': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
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
      className={`border rounded-lg overflow-hidden transition-all duration-200 ${
        isExpanded 
          ? 'border-blue-500 bg-gray-800/80 shadow-lg shadow-blue-500/10' 
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/70'
      }`}
      data-testid="curl-card"
    >
      {/* Card header - always visible */}
      <div
        className={`p-4 cursor-pointer ${isExpanded ? '' : 'hover:bg-gray-700/30'}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Expand/collapse icon */}
            <button
              onClick={onClick}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>

            {/* Method badge */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(request.method)}`}>
              {request.method}
            </span>

            {/* URL */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Globe size={14} className="text-gray-500 flex-shrink-0" />
                <span className="text-gray-300 truncate" title={request.url}>
                  {getDomain(request.url)}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5" title={request.url}>
                {request.url}
              </div>
            </div>
          </div>

          {/* Quick stats and actions */}
          <div className="flex items-center space-x-4">
            {/* Quick stats */}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
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
            
            {/* Delete button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className={`p-1 rounded transition-colors ${
                  deleteFeedback === 'confirm'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : deleteFeedback === 'success'
                    ? 'bg-green-500/20 text-green-400'
                    : deleteFeedback === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-gray-500 hover:text-red-400 hover:bg-red-500/20'
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

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-t border-gray-700"
          >
            <div className="p-4">
              {/* Action buttons */}
              <div className="flex items-center justify-between mb-4">
                {request.url && request.url.trim() && (
                  <div className="flex items-center space-x-2">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-500">Ready to execute</span>
                  </div>
                )}
                <button
                  onClick={onOpenInRestClient}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Open in Rest Client</span>
                </button>
              </div>

              {/* Live curl command preview */}
              <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Code size={16} className="text-blue-400" />
                    <h4 className="text-sm font-medium text-gray-200">Generated Curl Command</h4>
                  </div>
                  <button
                    onClick={handleCopyCommand}
                    className={`flex items-center space-x-1 px-3 py-1 rounded border transition-colors ${
                      copyFeedback === 'success'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
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
                <pre className="text-xs text-gray-300 font-mono overflow-x-auto custom-scrollbar p-3 bg-gray-950 rounded border border-gray-800">
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