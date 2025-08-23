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
    console.log('🔍 Image paste detection triggered, isRichMode:', isRichMode);
    // Only detect image pastes in plain text mode
    if (isRichMode) {
      console.log('📝 In rich mode, skipping image detection');
      return;
    }

    const items = event.clipboardData?.items;
    if (!items) {
      console.log('📋 No clipboard items found');
      return;
    }

    console.log('📋 Checking clipboard items:', items.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log('📋 Item', i, ':', item.type);
      if (item.type.startsWith('image/')) {
        console.log('🖼️ Image detected in plain text mode! Triggering upgrade modal');
        event.preventDefault();
        onImagePasted();
        break;
      }
    }
  }, [onImagePasted, isRichMode]);

  return { handlePaste };
};