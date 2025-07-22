import React from 'react';
import { Link2 } from 'lucide-react';
import { ClipboardItem, ViewMode } from '../types';

interface ItemPreviewProps {
  item: ClipboardItem;
  viewMode: ViewMode;
}

export const ItemPreview: React.FC<ItemPreviewProps> = React.memo(({ item, viewMode }) => {
  const className =
    viewMode === "card"
      ? "max-h-24 w-auto object-contain rounded-md mx-auto"
      : "max-h-48 w-auto object-contain rounded-md";

  switch (item.type) {
    case "image":
      return (
        <img 
          src={item.content} 
          alt={item.title} 
          className={className}
          onError={(e) => {
            console.error('Failed to load image:', item.content);
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    case "color":
      return (
        <div
          className="w-full h-full rounded-md"
          style={{ backgroundColor: item.content }}
          title={item.content}
        />
      );
    case "link":
      return (
        <div className="flex items-center space-x-2 p-2">
          <Link2 size={16} className="text-blue-400 flex-shrink-0" />
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {item.content}
          </a>
        </div>
      );
    case "text":
    default:
      return (
        <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all p-2">
          {item.content}
        </pre>
      );
  }
});

ItemPreview.displayName = 'ItemPreview';