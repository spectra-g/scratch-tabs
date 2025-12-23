import React, { useCallback, useState } from 'react';
import { Palette, Shuffle, Image as ImageIcon } from '../../../components/Icons';
import { ColorInfo, ColorHarmonyOptions } from '../types';
import {
  loadImageFromFile,
  extractColorsFromImageData,
  generateColorHarmony,
  generateRandomPalette
} from '../utils/colourUtils';

const IMAGE_EXTRACTION_DEFAULTS = {
  maxColors: 8,
  quality: 10,
} as const;

const RANDOM_PALETTE_SIZE = 6;

interface PaletteGeneratorProps {
  onColorsGenerated: (colors: ColorInfo[]) => void;
  onImageLoaded: (imageData: ImageData, imageUrl: string) => void;
  onImageLoadedAndColorsGenerated?: (imageData: ImageData, imageUrl: string, colors: ColorInfo[]) => void;
  onError: (error: string) => void;
}

export const PaletteGenerator: React.FC<PaletteGeneratorProps> = ({
  onColorsGenerated,
  onImageLoaded,
  onImageLoadedAndColorsGenerated,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [harmonyBase, setHarmonyBase] = useState('#3B82F6');
  const [harmonyType, setHarmonyType] = useState<ColorHarmonyOptions['type']>('complementary');

  const handleImageFile = useCallback(async (file: File) => {
    setIsExtracting(true);
    try {
      const imageData = await loadImageFromFile(file);
      const imageUrl = URL.createObjectURL(file);
      const colors = extractColorsFromImageData(imageData, IMAGE_EXTRACTION_DEFAULTS);

      // Use combined callback if available to avoid race conditions
      if (onImageLoadedAndColorsGenerated) {
        onImageLoadedAndColorsGenerated(imageData, imageUrl, colors);
      } else {
        // Fallback to separate callbacks
        onImageLoaded(imageData, imageUrl);
        onColorsGenerated(colors);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsExtracting(false);
    }
  }, [onColorsGenerated, onImageLoaded, onImageLoadedAndColorsGenerated, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (!imageFile) {
      onError('Please drop an image file');
      return;
    }

    await handleImageFile(imageFile);
  }, [handleImageFile, onError]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleImageFile(file);
    }
  }, [handleImageFile]);

  const handleGenerateHarmony = useCallback(() => {
    try {
      const colors = generateColorHarmony({
        type: harmonyType,
        baseColor: harmonyBase,
        variations: 3,
      });
      onColorsGenerated(colors);
    } catch {
      onError('Failed to generate color harmony');
    }
  }, [harmonyType, harmonyBase, onColorsGenerated, onError]);

  const handleGenerateRandom = useCallback(() => {
    const colors = generateRandomPalette(RANDOM_PALETTE_SIZE);
    onColorsGenerated(colors);
  }, [onColorsGenerated]);

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-main">Extract from Image</h3>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
              ? 'border-primary bg-primary/10'
              : 'border-base hover:border-secondary'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isExtracting ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="text-sm text-secondary">Extracting colors...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <ImageIcon size={32} className="text-secondary" />
              <p className="text-sm text-main">
                Drop an image here or{' '}
                <label className="text-info hover:text-info/80 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-muted">
                Colors are extracted locally - your image never leaves your browser
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Color Harmony Generator */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-main">Generate Harmony</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-secondary mb-1">Base Color</label>
            <div className="flex items-center space-x-2 h-8">
              <input
                type="color"
                value={harmonyBase}
                onChange={(e) => setHarmonyBase(e.target.value)}
                className="w-8 h-8 rounded border border-base bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={harmonyBase}
                onChange={(e) => setHarmonyBase(e.target.value)}
                className="flex-1 px-2 py-1 bg-surface-secondary border border-base rounded text-xs text-main font-mono h-8"
                placeholder="#3B82F6"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Harmony Type</label>
            <select
              value={harmonyType}
              onChange={(e) => setHarmonyType(e.target.value as ColorHarmonyOptions['type'])}
              className="w-full px-2 py-1 bg-surface-secondary border border-base rounded text-xs text-main h-8"
            >
              <option value="complementary">Complementary</option>
              <option value="triadic">Triadic</option>
              <option value="analogous">Analogous</option>
              <option value="monochromatic">Monochromatic</option>
              <option value="tetradic">Tetradic</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerateHarmony}
          className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <Palette size={16} />
          <span>Generate Harmony</span>
        </button>
      </div>

      {/* Random Generator */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-main">Random Palette</h3>
        <button
          onClick={handleGenerateRandom}
          className="w-full px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <Shuffle size={16} />
          <span>Generate Random</span>
        </button>
      </div>
    </div>
  );
};