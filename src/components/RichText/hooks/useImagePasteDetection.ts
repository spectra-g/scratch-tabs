import { useCallback } from 'react';

interface UseImagePasteDetectionProps {
  onImagePasted: () => void;
  isRichMode: boolean;
}

export const useImagePasteDetection = ({
  onImagePasted,
  isRichMode,
}: UseImagePasteDetectionProps) => {
  const handlePaste = useCallback((event: ClipboardEvent) => {
    // Only detect image pastes in plain text mode
    if (isRichMode) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        onImagePasted();
        break;
      }
    }
  }, [onImagePasted, isRichMode]);

  return { handlePaste };
};