import { useCallback, useRef } from 'react';
import { ClipboardItem, ContentType, ClipboardData } from '../types';
import { createClipboardItem, updateItemById, removeItemById } from '../utils/clipboardUtils';
import { TWENTY_FOUR_HOURS_MS } from '../utils/contentUtils';

export const useClipboardOperations = (
  data: ClipboardData,
  updateData: (updates: Partial<ClipboardData>) => void
) => {
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = () => {
              const imageDataUrl = reader.result as string;
              if (!latestDataRef.current.items.some((i) => i.content === imageDataUrl)) {
                const newItem = createClipboardItem(imageDataUrl, "image");
                updateData({ items: [newItem, ...latestDataRef.current.items] });
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
        if (item.types.includes("text/plain")) {
          const text = await item.getType("text/plain");
          const textContent = await text.text();
          const trimmedText = textContent.trim();
          if (!trimmedText || latestDataRef.current.items.some((i) => i.content === trimmedText)) return;
          const newItem = createClipboardItem(trimmedText);
          updateData({ items: [newItem, ...latestDataRef.current.items] });
          return;
        }
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      try {
        const text = await navigator.clipboard.readText();
        const trimmedText = text.trim();
        if (!trimmedText || latestDataRef.current.items.some((i) => i.content === trimmedText)) return;
        const newItem = createClipboardItem(trimmedText);
        updateData({ items: [newItem, ...latestDataRef.current.items] });
      } catch (textError) {
        console.error("Failed to read clipboard text:", textError);
      }
    }
  }, [updateData]);

  const handleCopy = useCallback(
    async (id: string, content: string, type: ContentType): Promise<boolean> => {
      try {
        if (type === "image" && content.startsWith("data:image/")) {
          const response = await fetch(content);
          const blob = await response.blob();
          const clipboardItem = new (window as any).ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([clipboardItem]);
        } else {
          await navigator.clipboard.writeText(content);
        }
        const now = Date.now();
        const updatedItems = updateItemById(latestDataRef.current.items, id, {
          timestamp: now,
          expiresAt: now + TWENTY_FOUR_HOURS_MS,
        });
        updateData({ items: updatedItems });
        return true;
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        return false;
      }
    },
    [updateData]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updatedItems = removeItemById(latestDataRef.current.items, id);
      updateData({ items: updatedItems });
    },
    [updateData]
  );

  const handleTogglePin = useCallback(
    (id: string) => {
      const item = latestDataRef.current.items.find(i => i.id === id);
      if (!item) return;
      
      const now = Date.now();
      const updatedItems = updateItemById(latestDataRef.current.items, id, {
        isPinned: !item.isPinned,
        expiresAt: now + TWENTY_FOUR_HOURS_MS,
      });
      updateData({ items: updatedItems });
    },
    [updateData]
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      const item = latestDataRef.current.items.find(i => i.id === id);
      if (!item) return;
      
      const updatedItems = updateItemById(latestDataRef.current.items, id, {
        isFavorite: !item.isFavorite,
      });
      updateData({ items: updatedItems });
    },
    [updateData]
  );

  return {
    handlePaste,
    handleCopy,
    handleDelete,
    handleTogglePin,
    handleToggleFavorite,
  };
};