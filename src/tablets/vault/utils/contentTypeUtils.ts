import { FileText, FileCode, Terminal, Link } from 'lucide-react';
import { ContentType } from '../types';
import { detectLanguage } from '../../../languages';

export const CONTENT_TYPES = [
  { id: 'plaintext', name: 'Plain Text', icon: FileText },
  { id: 'code', name: 'Code', icon: FileCode },
  { id: 'script', name: 'Script', icon: Terminal },
  { id: 'url', name: 'Link', icon: Link }
];

/**
 * Get the icon component for a content type
 */
export function getContentTypeIcon(contentType: string) {
  const type = CONTENT_TYPES.find(t => t.id === contentType);
  return type?.icon || FileText;
}

/**
 * Attempt to detect the content type from the content
 */
export function detectContentType(content: string): ContentType {
  // Check for URL
  if (content.trim().match(/^https?:\/\//i)) {
    return 'url';
  }
  
  // Detect language
  const detectedLanguage = detectLanguage(content);
  
  // Map detected language to our simplified content types
  if (['javascript', 'typescript', 'java', 'python', 'csharp', 'cpp', 'go', 'rust', 'html', 'css', 'json', 'xml', 'yaml', 'sql'].includes(detectedLanguage)) {
    return 'code';
  }
  
  if (['shell', 'bash', 'powershell', 'batch'].includes(detectedLanguage)) {
    return 'script';
  }
  
  return 'plaintext';
}

/**
 * Get the file extension for a content type
 */
export function getFileExtensionForContentType(contentType: ContentType): string {
  switch (contentType) {
    case 'code': return 'txt';
    case 'script': return 'sh';
    case 'url': return 'url';
    case 'plaintext':
    default:
      return 'txt';
  }
}