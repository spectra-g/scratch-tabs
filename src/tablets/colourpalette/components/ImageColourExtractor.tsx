import React, { useState, useRef, useCallback } from 'react';
import { ColorInfo } from '../types';
import { extractColorsFromImageData, extractColorsFromRegion } from '../utils/colourUtils';
import { Target, RefreshCw } from '../../../components/Icons';

interface ImageColourExtractorProps {
  imageData: ImageData | null;
  imageUrl: string | null;
  onColorsExtracted: (colors: ColorInfo[]) => void;
  onRegionExtracted: (colors: ColorInfo[], region: { x: number; y: number; width: number; height: number }) => void;
}

export const ImageColourExtractor: React.FC<ImageColourExtractorProps> = ({
  imageData,
  imageUrl,
  onColorsExtracted,
  onRegionExtracted,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastExtractionPoint, setLastExtractionPoint] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageData || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageData.width / rect.width;
    const scaleY = imageData.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Extract colors from a 50x50 region around the click
    const regionSize = 50;
    const region = {
      x: Math.max(0, x - regionSize / 2),
      y: Math.max(0, y - regionSize / 2),
      width: Math.min(regionSize, imageData.width - x + regionSize / 2),
      height: Math.min(regionSize, imageData.height - y + regionSize / 2),
    };

    setIsExtracting(true);
    setLastExtractionPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    const colors = extractColorsFromRegion(imageData, region, 8);
    onRegionExtracted(colors, region);

    // Clear extraction indicator after a delay
    setTimeout(() => {
      setIsExtracting(false);
      setLastExtractionPoint(null);
    }, 1000);
  }, [imageData, onRegionExtracted]);

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
    if (!isSelecting || !currentSelection || !imageData || !imageRef.current) {
      setIsSelecting(false);
      setSelectionStart(null);
      setCurrentSelection(null);
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageData.width / rect.width;
    const scaleY = imageData.height / rect.height;

    const region = {
      x: Math.floor(currentSelection.x * scaleX),
      y: Math.floor(currentSelection.y * scaleY),
      width: Math.floor(currentSelection.width * scaleX),
      height: Math.floor(currentSelection.height * scaleY),
    };

    if (region.width > 10 && region.height > 10) {
      setIsExtracting(true);

      const colors = extractColorsFromRegion(imageData, region, 8);
      onRegionExtracted(colors, region);

      // Clear extraction indicator after a delay
      setTimeout(() => {
        setIsExtracting(false);
      }, 1000);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  }, [isSelecting, currentSelection, imageData, onRegionExtracted]);

  const handleExtractAll = useCallback(() => {
    if (!imageData) return;

    const colors = extractColorsFromImageData(imageData, {
      maxColors: 8,
      quality: 2, // Better sampling quality
    });

    onColorsExtracted(colors);
  }, [imageData, onColorsExtracted]);

  if (!imageUrl || !imageData) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Image Color Extraction</h3>
        <button
          onClick={handleExtractAll}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center space-x-1"
        >
          <RefreshCw size={12} />
          <span>Extract All</span>
        </button>
      </div>

      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Color extraction source"
          className="w-full max-h-64 object-contain rounded-lg border border-gray-600 cursor-crosshair"
          onClick={handleImageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable={false}
        />
        
        {/* Selection Overlay */}
        {currentSelection && (
          <div
            className="absolute border-2 border-blue-400 bg-blue-400/20 pointer-events-none"
            style={{
              left: currentSelection.x,
              top: currentSelection.y,
              width: currentSelection.width,
              height: currentSelection.height,
            }}
          />
        )}

        {/* Extraction Point Indicator */}
        {lastExtractionPoint && isExtracting && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: lastExtractionPoint.x - 10,
              top: lastExtractionPoint.y - 10,
            }}
          >
            <div className="w-5 h-5 border-2 border-green-400 bg-green-400/30 rounded-full animate-ping" />
            <div className="absolute inset-0 w-5 h-5 border-2 border-green-400 bg-green-400/50 rounded-full" />
          </div>
        )}

        {/* Extraction Status Overlay */}
        {isExtracting && (
          <div className="absolute top-8 left-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>Extracting colors...</span>
            </div>
          </div>
        )}
        
        {/* Instructions Overlay */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          <div className="flex items-center space-x-1">
            <Target size={12} />
            <span>Click or drag to extract colors</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Click anywhere on the image to extract colors from that region
      </div>
    </div>
  );
};