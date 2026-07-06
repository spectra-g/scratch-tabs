import { useEffect, useState } from "react";
import { ParsedImageDataUri, parseImageDataUri } from "../utils/dataUri";

export interface DecodedImageState {
  parsed: ParsedImageDataUri | null;
  image: HTMLImageElement | null;
  width: number;
  height: number;
  isLoading: boolean;
  error: string | null;
}

export function useImageDecode(content: string): DecodedImageState {
  const [state, setState] = useState<DecodedImageState>({
    parsed: null,
    image: null,
    width: 0,
    height: 0,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const parsed = parseImageDataUri(content);
    if (!parsed) {
      setState({
        parsed: null,
        image: null,
        width: 0,
        height: 0,
        isLoading: false,
        error: "This tab does not contain a supported base64 image data URI.",
      });
      return;
    }

    let cancelled = false;
    const img = new Image();
    setState((current) => ({ ...current, parsed, isLoading: true, error: null }));

    img.onload = () => {
      if (cancelled) return;
      setState({
        parsed,
        image: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        isLoading: false,
        error: null,
      });
    };
    img.onerror = () => {
      if (cancelled) return;
      setState({
        parsed,
        image: null,
        width: 0,
        height: 0,
        isLoading: false,
        error: "The browser could not decode this image.",
      });
    };
    img.src = content.trim();

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [content]);

  return state;
}
