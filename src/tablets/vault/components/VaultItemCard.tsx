import React, { useState } from 'react';
import { Pin, Copy, ExternalLink, Trash2, Edit, Check, Tag, Clock, Hash, Globe, X, CopyPlus } from 'lucide-react';
import { VaultItem } from '../types';
import { getContentTypeIcon } from '../utils/contentTypeUtils';
import { formatRelativeTime } from '../utils/dateUtils';

interface VaultItemCardProps {
  item: VaultItem;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onCopy: () => void;
  onOpenInNewTab: () => void;
  onOpenUrl: () => void;
  onDuplicate: () => void;
  isCopied: boolean;
  isOpened: boolean;
}

export const VaultItemCard: React.FC<VaultItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onTogglePin,
  onCopy,
  onOpenInNewTab,
  onOpenUrl,
  onDuplicate,
  isCopied,
  isOpened
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const ContentTypeIcon = getContentTypeIcon(item.contentType);
  
  // Determine what action button to show based on content type
  const renderActionButton = () => {
    if (item.contentType === 'url') {
      return (
        <button
          onClick={onOpenUrl}
          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
          title="Open URL"
        >
          <Globe size={16} />
        </button>
      );
    }
    
    return (
      <button
        onClick={onOpenInNewTab}
        className={`p-1.5 transition-colors ${
          isOpened 
            ? 'text-green-400' 
            : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50'
        }`}
        title="Open in new tab"
      >
        {isOpened ? <Check size={16} /> : <ExternalLink size={16} />}
      </button>
    );
  };
  
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden hover:border-gray-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700/50">
        <div className="flex items-center space-x-2 min-w-0">
          <ContentTypeIcon size={16} className="text-gray-400 flex-shrink-0" />
          <h3 className="font-medium text-gray-200 truncate">{item.title}</h3>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded transition-colors ${
              item.isPinned 
                ? 'text-yellow-400 hover:bg-yellow-500/20' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
            title={item.isPinned ? "Unpin item" : "Pin item"}
          >
            <Pin size={16} />
          </button>
        </div>
      </div>
      
      {/* Content Preview */}
      <div 
        className="px-3 py-2 text-sm text-gray-300 font-mono whitespace-pre-wrap overflow-hidden"
        style={{ maxHeight: '100px' }}
      >
        {item.content.length > 200 
          ? `${item.content.substring(0, 200)}...` 
          : item.content}
      </div>
      
      {/* Labels */}
      {item.labels.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-700/50 flex flex-wrap gap-1.5">
          {item.labels.map(label => (
            <span 
              key={label} 
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300"
            >
              <Tag size={10} className="mr-1" />
              {label}
            </span>
          ))}
        </div>
      )}
      
      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <Clock size={12} className="mr-1" />
            {formatRelativeTime(item.lastUsedTimestamp)}
          </span>
          <span className="flex items-center">
            <Hash size={12} className="mr-1" />
            {item.usageCount}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {renderActionButton()}
          
          <button
            onClick={onCopy}
            className={`p-1.5 transition-colors ${
              isCopied 
                ? 'text-green-400' 
                : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50'
            }`}
            title="Copy content"
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          
          <button
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
            title="Duplicate item"
          >
            <CopyPlus size={16} />
          </button>
          
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
            title="Edit item"
          >
            <Edit size={16} />
          </button>
          
          {showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                title="Confirm delete"
              >
                <Check size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
              title="Delete item"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};