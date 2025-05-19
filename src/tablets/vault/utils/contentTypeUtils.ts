import { FileText, FileJson, FileCode, Terminal, FileType, Link, FileSpreadsheet, Code, FileSymlink, Database, FileHtml, FileType2 } from 'lucide-react';
import { ContentType } from '../types';
import { detectLanguage } from '../../../languages';

export const CONTENT_TYPES = [
  { id: 'plaintext', name: 'Plain Text', icon: FileText },
  { id: 'json', name: 'JSON', icon: FileJson },
  { id: 'javascript', name: 'JavaScript', icon: FileCode },
  { id: 'typescript', name: 'TypeScript', icon: FileCode },
  { id: 'python', name: 'Python', icon: FileCode },
  { id: 'shell', name: 'Shell/CLI', icon: Terminal },
  { id: 'markdown', name: 'Markdown', icon: FileType },
  { id: 'url', name: 'URL', icon: Link },
  { id: 'yaml', name: 'YAML', icon: FileSpreadsheet },
  { id: 'xml', name: 'XML', icon: Code },
  { id: 'sql', name: 'SQL', icon: Database },
  { id: 'html', name: 'HTML', icon: FileHtml },
  { id: 'css', name: 'CSS', icon: FileType2 }
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
  
  // Use the language detector for code
  const detectedLanguage = detectLanguage(content);
  
  // Map detected language to our content types
  if (CONTENT_TYPES.some(t => t.id === detectedLanguage)) {
    return detectedLanguage as ContentType;
  }
  
  return 'plaintext';
}

/**
 * Get the file extension for a content type
 */
export function getFileExtensionForContentType(contentType: ContentType): string {
  switch (contentType) {
    case 'javascript': return 'js';
    case 'typescript': return 'ts';
    case 'python': return 'py';
    case 'shell': return 'sh';
    case 'markdown': return 'md';
    case 'yaml': return 'yml';
    case 'xml': return 'xml';
    case 'sql': return 'sql';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'url': return 'url';
    case 'plaintext':
    default:
      return 'txt';
  }
}