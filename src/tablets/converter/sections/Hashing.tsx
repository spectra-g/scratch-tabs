import React, { useState, useEffect } from 'react';
import { ConversionPanel } from '../components/ConversionPanel';
import { ConversionInput } from '../components/ConversionInput';
import CryptoJS from 'crypto-js';
// Make sure CRC32 component is loaded if not using modular imports
// If you installed the full 'crypto-js' package, this might not be strictly
// necessary, but it doesn't hurt to be explicit if you encounter issues.
// import 'crypto-js/crc32';

interface HashFunction {
  id: string;
  title: string;
  description: string;
  hash: (input: string) => string;
}

const hashFunctions: HashFunction[] = [
  {
    id: 'md5',
    title: 'MD5',
    description: 'Calculate MD5 hash of input text',
    // Use CryptoJS.enc.Hex for WordArray results
    hash: (input: string) => CryptoJS.MD5(input).toString(CryptoJS.enc.Hex)
  },
  {
    id: 'sha1',
    title: 'SHA-1',
    description: 'Calculate SHA-1 hash of input text',
    hash: (input: string) => CryptoJS.SHA1(input).toString(CryptoJS.enc.Hex)
  },
  {
    id: 'sha256',
    title: 'SHA-256',
    description: 'Calculate SHA-256 hash of input text',
    hash: (input: string) => CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex)
  },
  {
    id: 'sha512',
    title: 'SHA-512',
    description: 'Calculate SHA-512 hash of input text',
    hash: (input: string) => CryptoJS.SHA512(input).toString(CryptoJS.enc.Hex)
  },
  {
    id: 'crc32',
    title: 'CRC32',
    description: 'Calculate CRC32 checksum of input text',
    hash: (input: string) => {
      // Simple CRC32 implementation since CryptoJS.CRC32 might not be available
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < input.length; i++) {
        crc = crc ^ input.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
          crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
        }
      }
      return (crc ^ 0xFFFFFFFF >>> 0).toString(16).padStart(8, '0');
    }
  }
];

interface Props {
  searchQuery: string;
  data?: { input: string };
  onDataChange?: (data: { input: string }) => void;
}

export const Hashing: React.FC<Props> = ({ searchQuery, data, onDataChange }) => {
  const [input, setInput] = useState(data?.input || '');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  // Ensure search query is lowercased for case-insensitive comparison
  const lowerCaseSearchQuery = searchQuery.toLowerCase();
  const filteredHashFunctions = hashFunctions.filter(fn =>
    fn.title.toLowerCase().includes(lowerCaseSearchQuery) ||
    fn.description.toLowerCase().includes(lowerCaseSearchQuery)
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    onDataChange?.({ input: value });
  };

  useEffect(() => {
    // Debounce calculation slightly to avoid excessive computation on fast typing
    const handler = setTimeout(() => {
      if (!input) {
        setHashes({});
        return;
      }

      const newHashes: Record<string, string> = {};
      hashFunctions.forEach(fn => {
        try {
          newHashes[fn.id] = fn.hash(input);
        } catch (error) {
           console.error(`Error calculating ${fn.title}:`, error);
           newHashes[fn.id] = 'Error'; // Show error in UI
        }
      });
      setHashes(newHashes);
    }, 150);

    // Cleanup function to clear timeout if input changes again quickly
    return () => {
      clearTimeout(handler);
    };
  }, [input]); // Rerun effect only when input changes

  return (
    // Use a Fragment or a wrapping div if Hashing itself needs grid placement
    <>
      {/* Input Panel - Assuming it should span the full width */}
      {/* Adjust col-span based on the total columns of the PARENT grid */}
      <div className="md:col-span-2 lg:col-span-3 mb-6"> {/* Added margin-bottom for spacing */}
        <ConversionPanel
          title="Input Text"
          description="Enter text to generate hashes"
        >
          <ConversionInput
            value={input}
            onChange={handleInputChange}
            placeholder="Enter text to hash..."
            rows={3}
          />
        </ConversionPanel>
      </div>

      {/* Wrapper Div for the Hash Result Panels */}
      {/* This div becomes the grid container for the results */}
      {/* Adjust col-span to match the input panel, spanning the full width */}
      <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Render only the filtered panels */}
        {filteredHashFunctions.map(fn => (
          <ConversionPanel
            key={fn.id}
            title={fn.title}
            description={fn.description}
            result={hashes[fn.id] || (input ? 'Calculating...' : 'No result')}
          >
            <div></div>
          </ConversionPanel>
        ))}

        {/* Message if filtering hides all panels */}
        {/* Ensure this message spans the full width of *this* grid */}
        {filteredHashFunctions.length === 0 && (
           <div className="col-span-full text-gray-400 text-center py-4">
               No matching hash functions found for "{searchQuery}".
           </div>
         )}
      </div>
    </>
  );
};