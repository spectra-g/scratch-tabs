import { EncodingOption } from '../types';

export const encodingOptions: EncodingOption[] = [
  {
    id: 'utf8',
    name: 'UTF-8',
    description: 'Standard Unicode encoding, compatible with most text'
  },
  {
    id: 'utf16',
    name: 'UTF-16',
    description: 'Unicode encoding that uses 2 bytes per character'
  },
  {
    id: 'hex',
    name: 'Hexadecimal',
    description: 'Represent binary data as hexadecimal digits'
  },
  {
    id: 'binary',
    name: 'Binary',
    description: 'Raw binary data representation'
  }
];

export function getEncodingById(id: string): EncodingOption {
  const encoding = encodingOptions.find(e => e.id === id);
  if (!encoding) {
    throw new Error(`Unknown encoding: ${id}`);
  }
  return encoding;
}

/**
 * Converts a string to a different encoding
 */
export function convertEncoding(input: string, fromEncoding: string, toEncoding: string): string {
  // If the encodings are the same, return the input
  if (fromEncoding === toEncoding) {
    return input;
  }

  // Convert from source encoding to binary
  let binaryData: Uint8Array;
  
  switch (fromEncoding) {
    case 'utf8':
      binaryData = new TextEncoder().encode(input);
      break;
    case 'utf16':
      // Convert UTF-16 string to binary
      const buffer = new ArrayBuffer(input.length * 2);
      const view = new Uint16Array(buffer);
      for (let i = 0; i < input.length; i++) {
        view[i] = input.charCodeAt(i);
      }
      binaryData = new Uint8Array(buffer);
      break;
    case 'hex':
      // Convert hex string to binary
      if (!/^[0-9A-Fa-f]*$/.test(input)) {
        throw new Error('Invalid hexadecimal string');
      }
      binaryData = new Uint8Array(input.length / 2);
      for (let i = 0; i < input.length; i += 2) {
        binaryData[i / 2] = parseInt(input.substring(i, i + 2), 16);
      }
      break;
    case 'binary':
      // Input is already binary (represented as a string of 0s and 1s)
      if (!/^[01]*$/.test(input)) {
        throw new Error('Invalid binary string');
      }
      // Pad to multiple of 8 if needed
      const paddedBinary = input.padStart(Math.ceil(input.length / 8) * 8, '0');
      binaryData = new Uint8Array(paddedBinary.length / 8);
      for (let i = 0; i < paddedBinary.length; i += 8) {
        binaryData[i / 8] = parseInt(paddedBinary.substring(i, i + 8), 2);
      }
      break;
    default:
      throw new Error(`Unsupported source encoding: ${fromEncoding}`);
  }

  // Convert binary to target encoding
  switch (toEncoding) {
    case 'utf8':
      return new TextDecoder().decode(binaryData);
    case 'utf16':
      const view = new Uint16Array(binaryData.buffer);
      let result = '';
      for (let i = 0; i < view.length; i++) {
        result += String.fromCharCode(view[i]);
      }
      return result;
    case 'hex':
      return Array.from(binaryData)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    case 'binary':
      return Array.from(binaryData)
        .map(b => b.toString(2).padStart(8, '0'))
        .join('');
    default:
      throw new Error(`Unsupported target encoding: ${toEncoding}`);
  }
}