import { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardItem, ContentType } from '../types';

export const useKeyboardNavigation = (
  filteredItems: ClipboardItem[],
  onCopy: (id: string, content: string, type: ContentType) => Promise<boolean>
) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0 && filteredItems[activeIndex]) {
        e.preventDefault();
        const item = filteredItems[activeIndex];
        onCopy(item.id, item.content, item.type);
      }
    },
    [activeIndex, filteredItems, onCopy]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (activeIndex === -1 || !listRef.current) return;
    const activeElement = listRef.current.children[activeIndex] as HTMLElement;
    activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  const resetActiveIndex = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    listRef,
    resetActiveIndex,
  };
};