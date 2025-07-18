import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Filter } from 'lucide-react';
import { ClipboardItem, ViewMode, ContentType } from '../types';
import { ClipboardItemComponent } from './ClipboardItemComponent';

interface ClipboardListProps {
  items: ClipboardItem[];
  viewMode: ViewMode;
  activeIndex: number;
  copiedItemId: string | null;
  onCopy: (id: string, content: string, type: ContentType) => Promise<boolean>;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onItemClick: (index: number) => void;
  onBackgroundClick: () => void;
  listRef: React.RefObject<HTMLDivElement>;
}

export const ClipboardList: React.FC<ClipboardListProps> = ({
  items,
  viewMode,
  activeIndex,
  copiedItemId,
  onCopy,
  onDelete,
  onTogglePin,
  onToggleFavorite,
  onItemClick,
  onBackgroundClick,
  listRef,
}) => {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <Filter size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-base">No items match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  if (viewMode === "card") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {items.map((item, index) => (
            <ClipboardItemComponent
              key={item.id}
              item={item}
              viewMode={viewMode}
              isActive={activeIndex === index}
              isRecentlyCopied={copiedItemId === item.id}
              onCopy={onCopy}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onToggleFavorite={onToggleFavorite}
              onClick={() => onItemClick(index)}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {items.map((item, index) => (
          <ClipboardItemComponent
            key={item.id}
            item={item}
            viewMode={viewMode}
            isActive={activeIndex === index}
            isRecentlyCopied={copiedItemId === item.id}
            onCopy={onCopy}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onToggleFavorite={onToggleFavorite}
            onClick={() => onItemClick(index)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};