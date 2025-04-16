import React, { useState, useEffect } from 'react';
import { ConversionPanel } from '../components/ConversionPanel';
import { ConversionInput } from '../components/ConversionInput';

interface TextConverter {
  id: string;
  title: string;
  description: string;
  convert: (input: string) => Record<string, string>;
}

const converters: TextConverter[] = [
  {
    id: 'escape',
    title: 'String Escaper / Unescaper', // Updated title
    description: 'Escape or unescape strings for various programming languages', // Updated description
    convert: (input: string) => {
      // --- Escaping Functions ---
      const escapeJavaScript = (str: string): string => {
        try {
          // JSON.stringify correctly escapes for JS/JSON, then remove outer quotes
          return JSON.stringify(str).slice(1, -1);
        } catch (e) {
          return "Error escaping";
        }
      }

      // Java and C# escaping rules are often very similar for common cases
      const escapeJavaCSharp = (str: string): string => {
        try {
          return str
            .replace(/\\/g, '\\\\') // Escape backslashes first
            .replace(/"/g, '\\"')  // Escape double quotes
            .replace(/'/g, "\\'")  // Escape single quotes (optional but common)
            .replace(/\n/g, '\\n')  // Escape newlines
            .replace(/\r/g, '\\r')  // Escape carriage returns
            .replace(/\t/g, '\\t'); // Escape tabs
        } catch (e) {
          return "Error escaping";
        }
      }

      // --- Unescaping Functions ---
      const unescapeJavaScript = (str: string): string => {
        try {
          // To parse correctly, the string needs to be wrapped in quotes
          // We assume the input 'str' is the *content* of a JS string literal
          return JSON.parse(`"${str}"`);
        } catch (e) {
          // If JSON.parse fails, it's likely not a valid escaped JS string sequence
          // Return a message or the original string depending on desired behavior
          // console.error("JS Unescape Error:", e);
          return "Invalid JS escape sequence";
        }
      }

      const unescapeJavaCSharp = (str: string): string => {
        try {
          // Use a regex to find escape sequences and replace them
          // Handles \\, \", \', \n, \r, \t
          return str.replace(/\\(\\|"|'|n|r|t)/g, (match, char) => {
            switch (char) {
              case '\\': return '\\';
              case '"': return '"';
              case "'": return "'";
              case 'n': return '\n';
              case 'r': return '\r';
              case 't': return '\t';
              default: return match; // Should not happen with this regex
            }
          });
        } catch (e) {
          return "Error unescaping";
        }
      }

      // --- Return both escaped and unescaped versions ---
      return {
        'Escaped - JavaScript/JSON': escapeJavaScript(input),
        'Unescaped - JavaScript/JSON': unescapeJavaScript(input),
        'Escaped - Java/C#': escapeJavaCSharp(input),
        'Unescaped - Java/C#': unescapeJavaCSharp(input),
      };
    }
  },
  // ... other converters remain the same ...
  {
    id: 'case',
    title: 'Case Converter',
    description: 'Convert text to different cases',
    convert: (input: string) => {
      const toTitleCase = (str: string) =>
        str.replace(/\w\S*/g, txt =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );

      const toSentenceCase = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

      const toSpongebobCase = (str: string) =>
        str.split('').map((char, i) =>
          i % 2 ? char.toLowerCase() : char.toUpperCase()
        ).join('');

      return {
        'UPPERCASE': input.toUpperCase(),
        'lowercase': input.toLowerCase(),
        'Title Case': toTitleCase(input),
        'Sentence case': toSentenceCase(input),
        'sPoNgEbOb CaSe': toSpongebobCase(input)
      };
    }
  },
  {
    id: 'lineending',
    title: 'Line Ending Converter',
    description: 'Convert between different line ending styles',
    convert: (input: string) => {
      // Ensure consistent LF before converting to CRLF
      const toLF = (str: string) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const toCRLF = (str: string) => toLF(str).replace(/\n/g, '\r\n');


      return {
        'Windows (CRLF)': toCRLF(input),
        'Unix/Linux/macOS (LF)': toLF(input)
      };
    }
  },
  {
    id: 'whitespace',
    title: 'Whitespace Remover',
    description: 'Remove different types of whitespace',
    convert: (input: string) => ({
      'Trimmed': input.trim(),
      'No Extra Spaces': input.replace(/\s+/g, ' ').trim(),
      'No Whitespace': input.replace(/\s+/g, '')
    })
  },
  {
    id: 'reverse',
    title: 'Text Reverser',
    description: 'Reverse the order of characters',
    convert: (input: string) => ({
      'Reversed': input.split('').reverse().join('')
    })
  },
  {
    id: 'slugify',
    title: 'Slugify',
    description: 'Convert text to URL-friendly slug',
    convert: (input: string) => ({
      'Slug': input
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove non-word, non-space, non-hyphen chars
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single
        .trim()                   // Trim leading/trailing spaces (shouldn't be needed after replace)
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    })
  }
];

interface Props {
  searchQuery: string;
}

export const TextConversion: React.FC<Props> = ({ searchQuery }) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  // Results structure remains the same: Record<converterId, Record<label, value>>
  const [results, setResults] = useState<Record<string, Record<string, string>>>({});

  // Ensure search query is lowercased for case-insensitive comparison
  const lowerCaseSearchQuery = searchQuery.toLowerCase();
  const filteredConverters = converters.filter(converter =>
    converter.title.toLowerCase().includes(lowerCaseSearchQuery) ||
    converter.description.toLowerCase().includes(lowerCaseSearchQuery)
  );

  const handleInputChange = (converterId: string, value: string) => {
    setInputs(prev => ({ ...prev, [converterId]: value }));
  };

  // Debounce effect for performance
  useEffect(() => {
    const handler = setTimeout(() => {
      const newResults: Record<string, Record<string, string>> = {};
      // Iterate over current inputs to calculate results
      Object.entries(inputs).forEach(([id, input]) => {
        // Only calculate if there is input for this specific converter
        if (input) { // Check if input is not empty (trim() removed, allow whitespace input)
          const converter = converters.find(c => c.id === id);
          if (converter) {
            try {
              newResults[id] = converter.convert(input);
            } catch (error) {
              console.error(`Error converting for ${id}:`, error);
              // Optionally set an error state for this converter's results
              newResults[id] = { Error: 'Conversion failed' };
            }
          }
        } else {
          // Clear results for this converter if input is empty
          newResults[id] = {};
        }
      });
      setResults(newResults);
    }, 150); // Adjust debounce delay (e.g., 150ms)

    return () => clearTimeout(handler); // Cleanup timeout
  }, [inputs]); // Rerun effect when inputs change

  return (
    <>
      {filteredConverters.map(converter => (
        <ConversionPanel
          key={converter.id}
          title={converter.title}
          description={converter.description}
        >
          <ConversionInput
            value={inputs[converter.id] || ''}
            onChange={(value) => handleInputChange(converter.id, value)}
            placeholder="Enter text to convert..."
            rows={3}
            className="mb-4"
          />
          {Object.keys(results[converter.id] || {}).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(results[converter.id] || {}).map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs font-semibold text-blue-300 mb-1 uppercase tracking-wider">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/60 border border-gray-700/50 text-gray-100 px-3 py-2 rounded-md break-all relative group">
                    <pre className="whitespace-pre-wrap break-words">{value}</pre>
                    {/* Optional Copy Button */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             inputs[converter.id] && <div className="text-sm text-gray-500 italic mt-2">Processing...</div>
          )}
        </ConversionPanel>
      ))}

      {filteredConverters.length === 0 && (
         <div className="col-span-full text-gray-400 text-center py-6">
             No matching text converters found for "{searchQuery}".
         </div>
       )}
    </>
  );
};