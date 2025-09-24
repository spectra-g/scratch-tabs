import React, { useMemo } from 'react';
import { Check, X, AlertTriangle } from '../../../components/Icons';
import { ColorInfo, AccessibilityPair } from '../types';
import { getContrastRatio, evaluateContrast, generateContrastSuggestion, createColorInfo } from '../utils/colourUtils';

interface AccessibilityMatrixProps {
  colors: ColorInfo[];
  onColorSuggestionApply: (colorIndex: number, newColor: ColorInfo) => void;
}

export const AccessibilityMatrix: React.FC<AccessibilityMatrixProps> = ({
  colors,
  onColorSuggestionApply,
}) => {
  const accessibilityPairs = useMemo(() => {
    const pairs: AccessibilityPair[] = [];

    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        if (i !== j) {
          const foreground = colors[i];
          const background = colors[j];
          const ratio = getContrastRatio(foreground, background);
          const level = evaluateContrast(ratio);
          const suggestion = level === 'FAIL'
            ? generateContrastSuggestion(foreground, background, ratio)
            : undefined;

          pairs.push({
            foreground,
            background,
            foregroundIndex: i,
            backgroundIndex: j,
            contrast: { ratio, level, suggestion },
          });
        }
      }
    }

    return pairs;
  }, [colors]);

  const getContrastIcon = (level: AccessibilityPair['contrast']['level']) => {
    switch (level) {
      case 'AAA':
        return <Check size={14} className="text-green-400" />;
      case 'AA':
        return <Check size={14} className="text-yellow-400" />;
      case 'FAIL':
        return <X size={14} className="text-red-400" />;
    }
  };

  const getContrastBadge = (level: AccessibilityPair['contrast']['level']) => {
    const baseClasses = "px-2 py-1 rounded text-xs font-medium";
    switch (level) {
      case 'AAA':
        return `${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`;
      case 'AA':
        return `${baseClasses} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`;
      case 'FAIL':
        return `${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`;
    }
  };

  if (colors.length < 2) {
    return (
      <div className="text-center py-8">
        <AlertTriangle size={32} className="text-gray-500 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Add more colors to see accessibility matrix</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Accessibility Matrix</h3>
        <div className="text-xs text-gray-500">WCAG 2.1 Contrast Ratios</div>
      </div>

      <div className="space-y-3">
        {accessibilityPairs.map((pair, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
          >
            {/* Color Combination Preview */}
            <div className="flex items-center space-x-4">
              {/* Color Swatches with Hex Values */}
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded border border-gray-600"
                    style={{ backgroundColor: pair.foreground.hex }}
                    title={`Text color: ${pair.foreground.hex}`}
                  />
                  <div className="text-xs font-mono text-gray-300 mt-1">
                    {pair.foreground.hex}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded border border-gray-600"
                    style={{ backgroundColor: pair.background.hex }}
                    title={`Background color: ${pair.background.hex}`}
                  />
                  <div className="text-xs font-mono text-gray-300 mt-1">
                    {pair.background.hex}
                  </div>
                </div>
              </div>

              {/* Live Text Preview */}
              <div
                className="px-3 py-2 rounded text-sm font-medium border flex items-center"
                style={{
                  color: pair.foreground.hex,
                  backgroundColor: pair.background.hex,
                  borderColor: pair.contrast.level === 'FAIL' ? '#ef4444' : '#6b7280',
                  minHeight: '32px',
                }}
              >
                Sample Text
              </div>
            </div>

            {/* Contrast Results */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  {getContrastIcon(pair.contrast.level)}
                  <span className="text-xs font-mono text-gray-300">
                    {pair.contrast.ratio.toFixed(2)}:1
                  </span>
                </div>
                <div className={getContrastBadge(pair.contrast.level)}>
                  {pair.contrast.level}
                </div>
              </div>

              {/* Suggestion */}
              {pair.contrast.suggestion && (
                <div className="max-w-xs">
                  <button
                    onClick={() => {
                      // Parse suggestion and apply it
                      const suggestion = pair.contrast.suggestion!;
                      const newHex = suggestion.match(/#[A-Fa-f0-9]{6}/)?.[0];
                      if (newHex) {
                        let colorIndex = -1;

                        if (suggestion.includes('Darken text') || suggestion.includes('Lighten text')) {
                          // Apply to foreground color using the stored index
                          colorIndex = pair.foregroundIndex;
                        } else if (suggestion.includes('Darken background') || suggestion.includes('Lighten background')) {
                          // Apply to background color using the stored index
                          colorIndex = pair.backgroundIndex;
                        }

                        if (colorIndex !== -1) {
                          // Use createColorInfo to properly recalculate all color properties including luminance
                          const newColor = createColorInfo(newHex.toUpperCase());
                          onColorSuggestionApply(colorIndex, newColor);
                        }
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors text-left"
                    title="Click to apply suggestion"
                  >
                    💡 {pair.contrast.suggestion}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 pt-2 border-t border-gray-700">
        <div className="flex items-center space-x-1">
          <Check size={12} className="text-green-400" />
          <span>AAA: 7:1+ (Best)</span>
        </div>
        <div className="flex items-center space-x-1">
          <Check size={12} className="text-yellow-400" />
          <span>AA: 4.5:1+ (Good)</span>
        </div>
        <div className="flex items-center space-x-1">
          <X size={12} className="text-red-400" />
          <span>Fail: &lt;4.5:1</span>
        </div>
      </div>
    </div>
  );
};