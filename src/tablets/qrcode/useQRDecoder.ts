import { useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { autoDetectContentType, type ContentTypeId } from './contentTypes';

export interface DecodeResult {
  data: string;
  detectedType: ContentTypeId | null;
}

export function useQRDecoder() {
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const decode = useCallback(async (source: File | Blob) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const bitmap = await createImageBitmap(source);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (!decoded) {
        setError('No QR code detected in this image.');
      } else {
        setResult({ data: decoded.data, detectedType: autoDetectContentType(decoded.data) });
      }
    } catch {
      setError('Failed to process image. Please try a clearer photo.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, error, loading, decode, reset };
}
