import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ExternalLink, Globe, Clock } from '../../../../components/Icons';
import { CurlRequest } from '../../utils/parser';
import { CurlRequestBuilder } from './CurlRequestBuilder';

interface CurlCardProps {
  request: CurlRequest;
  isExpanded: boolean;
  onClick: () => void;
  onRequestChange: (newRequest: CurlRequest) => void;
  onOpenInRestClient: () => void;
}

export const CurlCard: React.FC<CurlCardProps> = ({
  request,
  isExpanded,
  onClick,
  onRequestChange,
  onOpenInRestClient,
}) => {
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