import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ColorInfo } from '../types';
import { extractColorsFromImageData, extractColorsFromRegion, loadImageFromFile } from '../utils/colourUtils';
import { Target, RefreshCw, Upload } from '../../../components/Icons';

interface ImageColourExtractorProps {
  imageData?: ImageData | null;
  imageUrl: string | null;
  onColorsExtracted: (colors: ColorInfo[]) => void;
  onRegionExtracted: (colors: ColorInfo[], region: { x: number; y: number; width: number; height: number }) => void;
}

export const ImageColourExtractor: React.FC<ImageColourExtractorProps> = ({
  imageData: initialImageData,
  imageUrl: initialImageUrl,
  onColorsExtracted,
  onRegionExtracted,
}) => {
  const [localImageData, setLocalImageData] = useState<ImageData | null>(initialImageData || null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(initialImageUrl);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastExtractionPoint, setLastExtractionPoint] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with props
  useEffect(() => {
    if (initialImageUrl !== localImageUrl) {
      setLocalImageUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

  useEffect(() => {
    if (initialImageData !== localImageData) {
      setLocalImageData(initialImageData || null);
    }
  }, [initialImageData]);

  // Load image data if we have a URL but no data
  useEffect(() => {
    const loadData = async () => {
      if (localImageUrl && !localImageData) {
        try {
          // We can't use loadImageFromFile directly on a URL string, 
          // but we can fetch it and create a File-like object or just create a new Image
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              const data = ctx.getImageData(0, 0, img.width, img.height);
              setLocalImageData(data);
            }
          };
          img.src = localImageUrl;
        } catch (err) {
          console.error("Failed to load image data from URL", err);
        }
      }
    };
    loadData();
  }, [localImageUrl, localImageData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await loadImageFromFile(file);
        const url = URL.createObjectURL(file);
        setLocalImageData(data);
        setLocalImageUrl(url);
      } catch (err) {
        console.error("Failed to load image file", err);
      }
    }
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!localImageData || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = localImageData.width / rect.width;
    const scaleY = localImageData.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const regionSize = 50;
    const region = {
      x: Math.max(0, x - regionSize / 2),
      y: Math.max(0, y - regionSize / 2),
      width: Math.min(regionSize, localImageData.width - x + regionSize / 2),
      height: Math.min(regionSize, localImageData.height - y + regionSize / 2),
    };

    setIsExtracting(true);
    setLastExtractionPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    const colors = extractColorsFromRegion(localImageData, region, 8);
    onRegionExtracted(colors, region);

    setTimeout(() => {
      setIsExtracting(false);
      setLastExtractionPoint(null);
    }, 1000);
  }, [localImageData, onRegionExtracted]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setCurrentSelection(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!isSelecting || !selectionStart || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const selection = {
      x: Math.min(selectionStart.x, currentX),
      y: Math.min(selectionStart.y, currentY),
      width: Math.abs(currentX - selectionStart.x),
      height: Math.abs(currentY - selectionStart.y),
    };

    setCurrentSelection(selection);
  }, [isSelecting, selectionStart]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !currentSelection || !localImageData || !imageRef.current) {
      setIsSelecting(false);
      setSelectionStart(null);
      setCurrentSelection(null);
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = localImageData.width / rect.width;
    const scaleY = localImageData.height / rect.height;

    const region = {
      x: Math.floor(currentSelection.x * scaleX),
      y: Math.floor(currentSelection.y * scaleY),
      width: Math.floor(currentSelection.width * scaleX),
      height: Math.floor(currentSelection.height * scaleY),
    };

    if (region.width > 10 && region.height > 10) {
      setIsExtracting(true);

      const colors = extractColorsFromRegion(localImageData, region, 8);
      onRegionExtracted(colors, region);

      setTimeout(() => {
        setIsExtracting(false);
      }, 1000);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  }, [isSelecting, currentSelection, localImageData, onRegionExtracted]);

  const handleExtractAll = useCallback(() => {
    if (!localImageData) return;

    const colors = extractColorsFromImageData(localImageData, {
      maxColors: 8,
      quality: 2,
    });

    onColorsExtracted(colors);
  }, [localImageData, onColorsExtracted]);

  if (!localImageUrl || !localImageData) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-base rounded-2xl bg-surface-secondary/30 hover:bg-surface-secondary/50 transition-colors cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="p-4 rounded-full bg-surface-highlight mb-4 group-hover:scale-110 transition-transform">
          <Upload size={32} className="text-secondary" />
        </div>
        <p className="text-sm font-medium text-main">Click to upload an image</p>
        <p className="text-xs text-secondary mt-1">PNG, JPG or WebP</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-main">Image Color Extraction</h3>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-element-hover rounded text-secondary transition-colors"
            title="Change Image"
          >
            <Upload size={16} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </button>
          <button
            onClick={handleExtractAll}
            className="px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded text-xs font-medium transition-colors flex items-center space-x-1"
          >
            <RefreshCw size={12} />
            <span>Extract All</span>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-base shadow-inner">
        <img
          ref={imageRef}
          src={localImageUrl}
          alt="Color extraction source"
          className="w-full max-h-[500px] object-contain cursor-crosshair"
          onClick={handleImageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable={false}
        />

        {currentSelection && (
          <div
            className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
            style={{
              left: currentSelection.x,
              top: currentSelection.y,
              width: currentSelection.width,
              height: currentSelection.height,
            }}
          />
        )}

        {lastExtractionPoint && isExtracting && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: lastExtractionPoint.x - 10,
              top: lastExtractionPoint.y - 10,
            }}
          >
            <div className="w-5 h-5 border-2 border-success bg-success/30 rounded-full animate-ping" />
            <div className="absolute inset-0 w-5 h-5 border-2 border-success bg-success/50 rounded-full" />
          </div>
        )}

        {isExtracting && (
          <div className="absolute top-8 left-2 bg-success text-white text-xs px-2 py-1 rounded shadow-lg">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>Extracting colors...</span>
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded uppercase tracking-wider">
          <div className="flex items-center space-x-1">
            <Target size={12} />
            <span>Click or drag image</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-secondary text-center italic">
        Select a region or click a point to update the palette
      </div>
    </div>
  );
};