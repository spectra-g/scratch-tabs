import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Copy, Code } from 'lucide-react';
import { HttpRequest } from '../types';
import { converters, getConverter } from '../converters';
import { requestToCurl } from '../converters/curlConverter';

interface RequestConverterProps {
  request: HttpRequest;
  format: string;
  onFormatChange: (format: string) => void;
  onUpdateRequest: (request: Partial<HttpRequest>) => void;
}

export const RequestConverter: React.FC<RequestConverterProps> = ({
  request,
  format,
  onFormatChange,
  onUpdateRequest
}) => {
  const [convertedText, setConvertedText] = useState('');
  const [isError, setIsError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCurlCopied, setIsCurlCopied] = useState(false);

  const selfUpdateRef = useRef(false);

  // Convert request to selected format
  useEffect(() => {
    if (selfUpdateRef.current) {
      selfUpdateRef.current = false;
      return;
    }

    const converter = getConverter(format);
    if (converter) {
      try {
        const text = converter.convert(request);
        setConvertedText(text);
        setIsError(false);
      } catch (error) {
        console.error(`Error converting to ${format}:`, error);
        setConvertedText(`Error converting to ${format}`);
        setIsError(true);
      }
    } else {
      setConvertedText(`Converter for ${format} not found`);
      setIsError(true);
    }
  }, [request, format]);

  // Handle text change in the editor
  const handleEditorChange = (value: string | undefined) => {

    setConvertedText(value || ''); 

    // Try to parse the text if the format supports parsing
    const converter = getConverter(format);
    if (converter && converter.parse && value) {
      try {
        const parsedRequest = converter.parse(value);
        if (parsedRequest) {
          selfUpdateRef.current = true;
          onUpdateRequest(parsedRequest);
          setIsError(false);
        } else {
          setIsError(true);
        }
      } catch (error) {
        console.error(`Error parsing ${format}:`, error);
        setIsError(true);
      }
    } else if (!converter?.parse) {
      // If no parse function, editing means it's out of sync.
      // No action needed here other than displaying the text.
      // The readOnly prop on Editor should ideally handle this.
    }
  };

  // Copy the converted text to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(convertedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Copy cURL command to clipboard
  const handleCopyCurl = async () => {
    try {
      const curlCommand = requestToCurl(request);
      await navigator.clipboard.writeText(curlCommand);
      setIsCurlCopied(true);
      setTimeout(() => setIsCurlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy cURL:', error);
    }
  };

  // Get language for syntax highlighting
  const getLanguage = () => {
    switch (format) {
      case 'curl':
        return 'shell';
      case 'http':
        return 'plaintext';
      case 'postman':
        return 'json';
      default:
        return 'plaintext';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-300">Format:</label>
          <select
            value={format}
              onChange={(e) => {
              onFormatChange(e.target.value);
            }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-md px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
          >
            {converters.map((converter) => (
              <option key={converter.id} value={converter.id}>
                {converter.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCurl}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
            title="Copy as cURL"
          >
            <Code size={14} />
            <span>{isCurlCopied ? 'Copied!' : 'Copy cURL'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
            title="Copy"
          >
            <Copy size={14} />
            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className={`border rounded-md overflow-hidden ${isError ? 'border-red-500/50' : 'border-gray-700/50'}`}>
        <Editor
          height="150px"
          language={getLanguage()}
          value={convertedText}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            readOnly: !getConverter(format)?.parse
          }}
        />
      </div>

      {isError && (
        <div className="text-sm text-red-400">
          Invalid format. Changes may not be fully applied to the request.
        </div>
      )}
    </div>
  );
};