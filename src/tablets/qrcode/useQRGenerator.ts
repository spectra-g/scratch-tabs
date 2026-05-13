import { useRef, useCallback, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';
import type { Options } from 'qr-code-styling';
import type { QRStyleConfig } from './contentTypes';

function buildOptions(data: string, style: QRStyleConfig, logoDataUrl: string | null, logoSize: number): Options {
  return {
    width: style.size,
    height: style.size,
    type: 'svg',
    data: data || ' ',
    margin: style.margin,
    qrOptions: { errorCorrectionLevel: style.errorCorrection },
    dotsOptions: { type: style.dotStyle, color: style.dotColor },
    cornersSquareOptions: { type: style.cornerStyle, color: style.dotColor },
    backgroundOptions: style.transparent
      ? { color: 'rgba(0,0,0,0)' }
      : { color: style.bgColor },
    ...(logoDataUrl
      ? {
          image: logoDataUrl,
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: logoSize / 100,
            margin: 4,
            crossOrigin: 'anonymous',
          },
        }
      : {}),
  };
}

export function useQRGenerator() {
  const qrRef = useRef<QRCodeStyling | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestOptsRef = useRef<Options | null>(null);

  // Mount: create the QR instance once using the latest known options
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const opts = latestOptsRef.current ?? { width: 512, height: 512, type: 'svg', data: ' ' };
    const qr = new QRCodeStyling(opts);
    qrRef.current = qr;
    container.innerHTML = '';
    qr.append(container);

    return () => {
      container.innerHTML = '';
      qrRef.current = null;
    };
  }, []);

  const update = useCallback(
    (data: string, style: QRStyleConfig, logoDataUrl: string | null, logoSize: number) => {
      const opts = buildOptions(data, style, logoDataUrl, logoSize);
      latestOptsRef.current = opts;
      if (qrRef.current) {
        qrRef.current.update(opts);
      }
    },
    [],
  );

  const downloadPng = useCallback(async (name = 'qrcode') => {
    await qrRef.current?.download({ name, extension: 'png' });
  }, []);

  const downloadSvg = useCallback(async (name = 'qrcode') => {
    await qrRef.current?.download({ name, extension: 'svg' });
  }, []);

  const copyPng = useCallback(async (): Promise<boolean> => {
    const blob = await qrRef.current?.getRawData('png');
    if (!blob) return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob as Blob })]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const getThumbnailDataUrl = useCallback(async (): Promise<string | null> => {
    const blob = await qrRef.current?.getRawData('png');
    if (!blob) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob as Blob);
    });
  }, []);

  return { containerRef, update, downloadPng, downloadSvg, copyPng, getThumbnailDataUrl };
}
