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
  // Holds the most-recent options so the mount effect can initialise with real
  // content instead of a blank placeholder (avoids a visible flash on load).
  const latestOptsRef = useRef<Options>({ width: 512, height: 512, type: 'svg', data: ' ' });

  // Mount: create the QR instance once; use latestOptsRef so the very first
  // render has real data if update() was called before the effect ran.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const qr = new QRCodeStyling(latestOptsRef.current);
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
      qrRef.current?.update(opts);
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
    if (!qrRef.current) return false;
    try {
      // Pass the Promise directly so ClipboardItem is constructed synchronously
      // within the user-gesture call stack — required by Safari.
      const blobPromise = qrRef.current.getRawData('png').then((b) => b as Blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
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
