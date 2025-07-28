import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Star, Pin, Trash2 } from '../../../components/Icons';
import { ClipboardItem, ViewMode, ContentType } from '../types';
import { ContentTypeIcon } from './ContentTypeIcon';
import { ItemPreview } from './ItemPreview';
import { ExpiryCountdown } from './ExpiryCountdown';

interface ClipboardItemComponentProps {
  item: ClipboardItem;
  viewMode: ViewMode;
  isActive: boolean;
  isRecentlyCopied: boolean;
  onCopy: (id: string, content: string, type: ContentType) => Promise<boolean>;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
}

export const ClipboardItemComponent: React.FC<ClipboardItemComponentProps> = ({
  item,
  viewMode,
  isActive,
  isRecentlyCopied,
  onCopy,
  onDelete,
  onTogglePin,
  onToggleFavorite,
  onClick,
}) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(item.id, item.content, item.type);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(item.id);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(item.id);
  };

  if (viewMode === "card") {
    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div
          className={`bg-gray-800/50 border rounded-lg overflow-hidden transition-all duration-200 group cursor-pointer ${
            isActive 
              ? "ring-2 ring-blue-400" 
              : "border-gray-700/50 hover:border-gray-600/50"
          }`}
          onClick={onClick}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ContentTypeIcon type={item.type} />
                <p className="text-sm font-medium text-gray-200 truncate">{item.title}</p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleToggleFavorite}
                  className={`p-1.5 rounded transition-colors ${
                    item.isFavorite 
                      ? "text-yellow-400 hover:bg-yellow-500/20" 
                      : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                  title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star size={14} className={item.isFavorite ? "fill-current" : ""} />
                </button>
                <button
                  onClick={handleTogglePin}
                  className={`p-1.5 rounded transition-colors ${
                    item.isPinned 
                      ? "text-yellow-400 hover:bg-yellow-500/20" 
                      : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                  title={item.isPinned ? "Unpin item" : "Pin item"}
                >
                  <Pin size={14} className={item.isPinned ? "fill-current" : ""} />
                </button>
              </div>
            </div>
            <div className="h-28 flex items-center justify-center p-2 bg-black/20 rounded-md overflow-hidden">
              <ItemPreview item={item} viewMode="card" />
            </div>
          </div>
          <div className="px-3 py-2 border-t border-gray-700/50 flex justify-between items-center">
            <ExpiryCountdown item={item} />
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-gray-700/50"
                title="Copy to clipboard"
              >
                {isRecentlyCopied ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded hover:bg-gray-700/50"
                title="Delete item"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div
        className={`bg-gray-800/50 border rounded-lg transition-all duration-200 group flex items-start p-3 space-x-4 cursor-pointer ${
          isActive 
            ? "ring-2 ring-blue-400" 
            : "border-gray-700/50 hover:border-gray-600/50"
        }`}
        onClick={onClick}
      >
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <ContentTypeIcon type={item.type} />
              <p className="text-sm font-medium text-gray-200 truncate">{item.title}</p>
            </div>
            <ExpiryCountdown item={item} />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-md bg-black/20 p-2">
            <ItemPreview item={item} viewMode="list" />
          </div>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-700/50"
            title="Copy to clipboard"
          >
            {isRecentlyCopied ? (
              <Check size={16} className="text-green-400" />
            ) : (
              <Copy size={16} />
            )}
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded transition-colors ${
              item.isFavorite 
                ? "text-yellow-400 hover:bg-yellow-500/20" 
                : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={16} className={item.isFavorite ? "fill-current" : ""} />
          </button>
          <button
            onClick={handleTogglePin}
            className={`p-1.5 rounded transition-colors ${
              item.isPinned 
                ? "text-yellow-400 hover:bg-yellow-500/20" 
                : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            title={item.isPinned ? "Unpin item" : "Pin item"}
          >
            <Pin size={16} className={item.isPinned ? "fill-current" : ""} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-gray-700/50"
            title="Delete item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};