import React, { useState, useEffect } from "react";
import { ConversionPanel } from "../components/ConversionPanel";
import { ConversionInput } from "../components/ConversionInput";

interface Props {
  searchQuery: string;
  data?: { inputs: Record<string, string> };
  onDataChange?: (data: { inputs: Record<string, string> }) => void;
}

export const ColorConversion: React.FC<Props> = ({
  data,
  onDataChange,
}) => {
  const [color, setColor] = useState(data?.inputs?.color || "");
  const [results, setResults] = useState<Record<string, string>>({});

  const handleColorChange = (value: string) => {
    setColor(value);
    onDataChange?.({ inputs: { ...data?.inputs, color: value } });
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  useEffect(() => {
    if (!color) {
      setResults({});
      return;
    }

    let newResults: Record<string, string> = {};

    // Try parsing as hex
    if (color.match(/^#?[0-9a-f]{6}$/i)) {
      const hex = color.startsWith("#") ? color : `#${color}`;
      const rgb = hexToRgb(hex);
      if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        newResults = {
          Hex: hex,
          RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          RGBA: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
          HSL: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          HSLA: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
        };
      }
    }
    // Try parsing as rgb/rgba
    else if (color.match(/^rgba?\(.*\)$/)) {
      const match = color.match(
        /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/,
      );
      if (match) {
        const [, r, g, b, a = "1"] = match;
        const rgb = { r: +r, g: +g, b: +b };
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        newResults = {
          Hex: rgbToHex(rgb.r, rgb.g, rgb.b),
          RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          RGBA: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`,
          HSL: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          HSLA: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`,
        };
      }
    }
    // Try parsing as hsl/hsla
    else if (color.match(/^hsla?\(.*\)$/)) {
      const match = color.match(
        /^hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)$/,
      );
      if (match) {
        const [, h, s, l, a = "1"] = match;
        // Convert HSL to RGB (simplified conversion)
        const hue = +h;
        const sat = +s / 100;
        const light = +l / 100;

        const c = (1 - Math.abs(2 * light - 1)) * sat;
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = light - c / 2;

        let r = 0,
          g = 0,
          b = 0;
        if (hue >= 0 && hue < 60) {
          r = c;
          g = x;
          b = 0;
        } else if (hue >= 60 && hue < 120) {
          r = x;
          g = c;
          b = 0;
        } else if (hue >= 120 && hue < 180) {
          r = 0;
          g = c;
          b = x;
        } else if (hue >= 180 && hue < 240) {
          r = 0;
          g = x;
          b = c;
        } else if (hue >= 240 && hue < 300) {
          r = x;
          g = 0;
          b = c;
        } else if (hue >= 300 && hue < 360) {
          r = c;
          g = 0;
          b = x;
        }

        const rgb = {
          r: Math.round((r + m) * 255),
          g: Math.round((g + m) * 255),
          b: Math.round((b + m) * 255),
        };

        newResults = {
          Hex: rgbToHex(rgb.r, rgb.g, rgb.b),
          RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          RGBA: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`,
          HSL: `hsl(${h}, ${s}%, ${l}%)`,
          HSLA: `hsla(${h}, ${s}%, ${l}%, ${a})`,
        };
      }
    }

    setResults(newResults);
  }, [color]);

  return (
    <ConversionPanel
      title="Color Converter"
      description="Convert between different color formats (Hex, RGB(A), HSL(A))"
    >
      <div className="space-y-4">
        <div>
          <ConversionInput
            value={color}
            onChange={handleColorChange}
            placeholder="Enter color (e.g., #ff0000, rgb(255,0,0), hsl(0,100%,50%))"
            rows={1}
          />
        </div>

        {Object.keys(results).length > 0 && (
          <>
            <div
              className="h-20 rounded-md"
              style={{ backgroundColor: results.RGB || color }}
            />

            <div className="space-y-2">
              {Object.entries(results).map(([format, value]) => (
                <div key={format}>
                  <div className="text-sm font-medium text-secondary mb-1">
                    {format}:
                  </div>
                  <div className="font-mono text-sm bg-surface-secondary/50 text-main px-3 py-2 rounded-md border border-base">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ConversionPanel>
  );
};
