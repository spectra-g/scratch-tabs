import React, { useState, useEffect } from 'react';
import { ConversionPanel } from '../components/ConversionPanel';
import { ConversionInput } from '../components/ConversionInput';

interface Converter {
  id: string;
  title: string;
  description: string;
  convert: (input: string, decode?: boolean) => string;
}

const converters: Converter[] = [
  {
    id: 'base64',
    title: 'Base64',
    description: 'Convert text to/from Base64 encoding',
    convert: (input: string, decode = false) => {
      try {
        if (decode) {
          return atob(input);
        } else {
          return btoa(input);
        }
      } catch (e) {
        return 'Invalid input';
      }
    }
  },
  {
    id: 'url',
    title: 'URL Encoding',
    description: 'Convert text to/from URL-safe encoding',
    convert: (input: string, decode = false) => {
      try {
        if (decode) {
          return decodeURIComponent(input);
        } else {
          return encodeURIComponent(input);
        }
      } catch (e) {
        return 'Invalid input';
      }
    }
  },
  {
    id: 'html',
    title: 'HTML Entities',
    description: 'Convert text to/from HTML entities',
    convert: (input: string, decode = false) => {
      const textarea = document.createElement('textarea');
      if (decode) {
        textarea.innerHTML = input;
        return textarea.value;
      } else {
        textarea.textContent = input;
        return textarea.innerHTML;
      }
    }
  },
  {
    id: 'hex',
    title: 'Hex Encoding',
    description: 'Convert text to/from hexadecimal',
    convert: (input: string, decode = false) => {
      try {
        if (decode) {
          return input.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || '';
        } else {
          return Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        }
      } catch (e) {
        return 'Invalid input';
      }
    }
  },
  {
    id: 'binary',
    title: 'Binary Encoding',
    description: 'Convert text to/from binary',
    convert: (input: string, decode = false) => {
      try {
        if (decode) {
          return input.replace(/[01]{8}/g, function(byte) {
            return String.fromCharCode(parseInt(byte, 2));
          });
        } else {
          return Array.from(input).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
        }
      } catch (e) {
        return 'Invalid input';
      }
    }
  }
];

interface Props {
  searchQuery: string;
  data?: { inputs: Record<string, string> };
  onDataChange?: (data: { inputs: Record<string, string> }) => void;
}

export const EncodeDecode: React.FC<Props> = ({ searchQuery, data, onDataChange }) => {
  const [inputs, setInputs] = useState<Record<string, string>>(data?.inputs || {});
  const [results, setResults] = useState<Record<string, string>>({});

  const filteredConverters = converters.filter(converter =>
    converter.title.toLowerCase().includes(searchQuery) ||
    converter.description.toLowerCase().includes(searchQuery)
  );

  const handleInputChange = (converterId: string, value: string) => {
    const newInputs = { ...inputs, [converterId]: value };
    setInputs(newInputs);
    onDataChange?.({ inputs: newInputs });
  };

  useEffect(() => {
    const newResults: Record<string, string> = {};
    
    Object.entries(inputs).forEach(([id, input]) => {
      const converter = converters.find(c => c.id === id);
      if (converter && input) {
        newResults[`${id}-encode`] = converter.convert(input, false);
        newResults[`${id}-decode`] = converter.convert(input, true);
      }
    });
    
    setResults(newResults);
  }, [inputs]);

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
          />
          {converter.id === 'jwt' ? (
            <div className="font-mono text-sm bg-gray-900/50 text-gray-200 p-3 rounded-md whitespace-pre-wrap">
              {results[`${converter.id}-encode`] || 'Decoded JWT will appear here'}
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium text-gray-400 mb-2">Encoded:</div>
                <div className="font-mono text-sm bg-gray-900/50 text-gray-200 p-3 rounded-md break-all">
                  {results[`${converter.id}-encode`] || 'Encoded text will appear here'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-400 mb-2">Decoded:</div>
                <div className="font-mono text-sm bg-gray-900/50 text-gray-200 p-3 rounded-md break-all">
                  {results[`${converter.id}-decode`] || 'Decoded text will appear here'}
                </div>
              </div>
            </>
          )}
        </ConversionPanel>
      ))}
    </>
  );
};