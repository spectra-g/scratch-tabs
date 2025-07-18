import React, { useState, useEffect } from 'react';
import { Pin, Clock } from 'lucide-react';
import { ClipboardItem } from '../types';
import { formatDuration } from '../utils/contentUtils';

interface ExpiryCountdownProps {
  item: ClipboardItem;
  size?: number;
}

export const ExpiryCountdown: React.FC<ExpiryCountdownProps> = ({ item, size = 12 }) => {
  const [remaining, setRemaining] = useState(item.expiresAt - Date.now());

  useEffect(() => {
    if (item.isPinned) return;

    const timer = setInterval(() => {
      const newRemaining = item.expiresAt - Date.now();
      if (newRemaining > 0) {
        setRemaining(newRemaining);
      } else {
        setRemaining(0);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [item.expiresAt, item.isPinned]);

  if (item.isPinned) {
    return (
      <div 
        className="flex items-center space-x-1 text-xs text-yellow-500"
        title="This item is pinned and will not expire"
      >
        <Pin size={size} />
        <span>Pinned</span>
      </div>
    );
  }

  const isExpired = remaining <= 0;
  const tooltipText = isExpired 
    ? "This item has expired and will be removed"
    : "This item will expire when the timer finishes. Pin to keep it permanently.";

  return (
    <div 
      className="flex items-center space-x-1 text-xs text-gray-500"
      title={tooltipText}
    >
      <Clock size={size} />
      <span>{formatDuration(remaining)}</span>
    </div>
  );
};