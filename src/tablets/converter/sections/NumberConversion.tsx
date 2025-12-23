import React, { useState, useEffect } from "react";
import { ConversionPanel } from "../components/ConversionPanel";
import { ConversionInput } from "../components/ConversionInput";

interface NumberConverter {
  id: string;
  title: string;
  description: string;
  convert: (input: string) => Record<string, string>;
}

const converters: NumberConverter[] = [
  {
    id: "base",
    title: "Number Base Converter",
    description: "Convert between different number bases",
    convert: (input: string): Record<string, string> => {
      const num = parseInt(input);
      if (isNaN(num)) return { Error: "Invalid number" };
      return {
        Decimal: num.toString(10),
        Hexadecimal: num.toString(16).toUpperCase(),
        Octal: num.toString(8),
        Binary: num.toString(2),
      };
    },
  },
  {
    id: "roman",
    title: "Roman Numeral Converter",
    description: "Convert between numbers and Roman numerals",
    convert: (input: string): Record<string, string> => {
      const romanToInt = (roman: string): number => {
        const values: Record<string, number> = {
          I: 1,
          V: 5,
          X: 10,
          L: 50,
          C: 100,
          D: 500,
          M: 1000,
        };
        let result = 0;
        for (let i = 0; i < roman.length; i++) {
          const current = values[roman[i]];
          const next = values[roman[i + 1]];
          if (next > current) {
            result += next - current;
            i++;
          } else {
            result += current;
          }
        }
        return result;
      };

      const intToRoman = (num: number): string => {
        const values = [
          { value: 1000, numeral: "M" },
          { value: 900, numeral: "CM" },
          { value: 500, numeral: "D" },
          { value: 400, numeral: "CD" },
          { value: 100, numeral: "C" },
          { value: 90, numeral: "XC" },
          { value: 50, numeral: "L" },
          { value: 40, numeral: "XL" },
          { value: 10, numeral: "X" },
          { value: 9, numeral: "IX" },
          { value: 5, numeral: "V" },
          { value: 4, numeral: "IV" },
          { value: 1, numeral: "I" },
        ];

        let result = "";
        let remaining = num;

        for (const { value, numeral } of values) {
          while (remaining >= value) {
            result += numeral;
            remaining -= value;
          }
        }

        return result;
      };

      // Try parsing as number first
      const num = parseInt(input);
      if (!isNaN(num) && num > 0 && num < 4000) {
        return { "Roman Numeral": intToRoman(num) };
      }

      // Try parsing as Roman numeral
      const roman = input.toUpperCase().trim();
      if (/^[IVXLCDM]+$/.test(roman)) {
        return { Number: romanToInt(roman).toString() };
      }

      return { Error: "Invalid input" };
    },
  },
  {
    id: "datasize",
    title: "Data Size Converter",
    description: "Convert between different data size units",
    convert: (input: string): Record<string, string> => {
      const match = input.match(/^(\d+(?:\.\d+)?)\s*([KMGTP]i?B)?$/i);
      if (!match) return { Error: "Invalid input format" };

      const [, valueStr, unit = "B"] = match;
      const value = parseFloat(valueStr);
      const unitUpper = unit.toUpperCase();

      // Convert to bytes first
      let bytes: number;
      switch (unitUpper) {
        case "B":
          bytes = value;
          break;
        case "KB":
          bytes = value * 1000;
          break;
        case "MB":
          bytes = value * 1000000;
          break;
        case "GB":
          bytes = value * 1000000000;
          break;
        case "TB":
          bytes = value * 1000000000000;
          break;
        case "PB":
          bytes = value * 1000000000000000;
          break;
        case "KIB":
          bytes = value * 1024;
          break;
        case "MIB":
          bytes = value * 1048576;
          break;
        case "GIB":
          bytes = value * 1073741824;
          break;
        case "TIB":
          bytes = value * 1099511627776;
          break;
        case "PIB":
          bytes = value * 1125899906842624;
          break;
        default:
          return { Error: "Invalid unit" };
      }

      return {
        Bytes: bytes.toLocaleString() + " B",
        Kilobytes: (bytes / 1000).toLocaleString() + " KB",
        Megabytes: (bytes / 1000000).toLocaleString() + " MB",
        Gigabytes: (bytes / 1000000000).toLocaleString() + " GB",
        Terabytes: (bytes / 1000000000000).toLocaleString() + " TB",
        Petabytes: (bytes / 1000000000000000).toLocaleString() + " PB",
        Kibibytes: (bytes / 1024).toLocaleString() + " KiB",
        Mebibytes: (bytes / 1048576).toLocaleString() + " MiB",
        Gibibytes: (bytes / 1073741824).toLocaleString() + " GiB",
        Tebibytes: (bytes / 1099511627776).toLocaleString() + " TiB",
        Pebibytes: (bytes / 1125899906842624).toLocaleString() + " PiB",
      };
    },
  },
];

interface Props {
  searchQuery: string;
  data?: { inputs: Record<string, string> };
  onDataChange?: (data: { inputs: Record<string, string> }) => void;
}

export const NumberConversion: React.FC<Props> = ({
  searchQuery,
  data,
  onDataChange,
}) => {
  const [inputs, setInputs] = useState<Record<string, string>>(
    data?.inputs || {},
  );
  const [results, setResults] = useState<
    Record<string, Record<string, string>>
  >({});

  const filteredConverters = converters.filter(
    (converter) =>
      converter.title.toLowerCase().includes(searchQuery) ||
      converter.description.toLowerCase().includes(searchQuery),
  );

  const handleInputChange = (converterId: string, value: string) => {
    const newInputs = { ...inputs, [converterId]: value };
    setInputs(newInputs);
    onDataChange?.({ inputs: newInputs });
  };

  useEffect(() => {
    const newResults: Record<string, Record<string, string>> = {};
    Object.entries(inputs).forEach(([id, input]) => {
      if (input.trim()) {
        const converter = converters.find((c) => c.id === id);
        if (converter) {
          newResults[id] = converter.convert(input);
        }
      }
    });
    setResults(newResults);
  }, [inputs]);

  return (
    <>
      {filteredConverters.map((converter) => (
        <ConversionPanel
          key={converter.id}
          title={converter.title}
          description={converter.description}
        >
          <ConversionInput
            value={inputs[converter.id] || ""}
            onChange={(value) => handleInputChange(converter.id, value)}
            placeholder="Enter number to convert..."
            rows={1}
          />
          <div className="space-y-2">
            {Object.entries(results[converter.id] || {}).map(
              ([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-secondary mb-1">
                    {label}:
                  </div>
                  <div className="font-mono text-sm bg-surface-secondary/50 text-main px-3 py-2 rounded-md border border-base">
                    {value}
                  </div>
                </div>
              ),
            )}
          </div>
        </ConversionPanel>
      ))}
    </>
  );
};
