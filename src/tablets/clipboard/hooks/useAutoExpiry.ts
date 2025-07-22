import { useEffect, useRef } from 'react';
import { ClipboardData } from '../types';
import { removeExpiredItems } from '../utils/clipboardUtils';
import { EXPIRY_CHECK_INTERVAL_MS } from '../utils/contentUtils';

export const useAutoExpiry = (
  data: ClipboardData,
  updateData: (updates: Partial<ClipboardData>) => void
) => {
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  useEffect(() => {
    const interval = setInterval(() => {
      const currentData = latestDataRef.current;
      const unexpiredItems = removeExpiredItems(currentData.items);
      
      if (unexpiredItems.length < currentData.items.length) {
        updateData({ items: unexpiredItems });
      }
    }, EXPIRY_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [updateData]);
};