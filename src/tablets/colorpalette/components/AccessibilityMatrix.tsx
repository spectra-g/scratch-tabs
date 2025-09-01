import React, { useMemo } from 'react';
import { Check, X, AlertTriangle } from '../../../components/Icons';
import { ColorInfo, AccessibilityPair } from '../types';
import { getContrastRatio, evaluateContrast, generateContrastSuggestion } from '../utils/colorUtils';

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
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: pair.foreground.hex }}
                  title={`Foreground: ${pair.foreground.hex}`}
                />
                <span className="text-xs text-gray-400">on</span>
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: pair.background.hex }}
                  title={`Background: ${pair.background.hex}`}
                />
              </div>
              
              {/* Live Text Preview */}
              <div
                className="px-3 py-1 rounded text-sm font-medium"
                style={{
                  color: pair.foreground.hex,
                  backgroundColor: pair.background.hex,
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
                      if (suggestion.includes('Darken text') || suggestion.includes('Lighten text')) {
                        const newHex = suggestion.match(/#[A-Fa-f0-9]{6}/)?.[0];
                        if (newHex) {
                          const colorIndex = colors.findIndex(c => c.hex === pair.foreground.hex);
                          if (colorIndex !== -1) {
                            const newColor = { ...pair.foreground, hex: newHex.toUpperCase() };
                            onColorSuggestionApply(colorIndex, newColor);
                          }
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