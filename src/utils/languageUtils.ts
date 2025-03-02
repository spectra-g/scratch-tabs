/**
 * Common language extensions mapping
 */
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'cs': 'csharp',
  'go': 'go',
  'rs': 'rust',
  'php': 'php',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'json': 'json',
  'md': 'markdown',
  'txt': 'plaintext',
  'sh': 'shell',
  'bash': 'shell',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'sql': 'sql',
  'graphql': 'graphql',
  'swift': 'swift',
  'kt': 'kotlin',
  'dart': 'dart',
};

/**
 * Detects language from a filename
 * @param filename The filename to detect language from
 * @returns The detected language or 'plaintext' if not detected
 */
export function detectLanguageFromFilename(filename: string): string {
  if (!filename) return 'plaintext';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return 'plaintext';
  
  return LANGUAGE_EXTENSIONS[extension] || 'plaintext';
}

/**
 * Detects language from content using simple heuristics
 * @param content The content to detect language from
 * @returns The detected language or 'plaintext' if not detected
 */
export function detectLanguageFromContent(content: string): string {
  if (!content || content.trim() === '') return 'plaintext';
  
  // Simple heuristics for common languages
  if (content.includes('import React') || content.includes('export default')) {
    return 'javascript';
  }
  
  if (content.includes('interface ') || content.includes('type ') || content.includes('export const')) {
    return 'typescript';
  }
  
  if (content.includes('def ') || content.includes('import ') && content.includes(':')) {
    return 'python';
  }
  
  if (content.includes('<html') || content.includes('<!DOCTYPE html')) {
    return 'html';
  }
  
  if (content.includes('body {') || content.includes('@media')) {
    return 'css';
  }
  
  if (content.startsWith('{') || content.startsWith('[')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch (e) {
      // Not valid JSON
    }
  }
  
  if (content.includes('# ') || content.includes('## ')) {
    return 'markdown';
  }
  
  return 'plaintext';
}

/**
 * Gets a file extension for a language
 * @param language The language to get extension for
 * @returns The file extension for the language
 */
export function getFileExtensionForLanguage(language: string): string {
  const entries = Object.entries(LANGUAGE_EXTENSIONS);
  const entry = entries.find(([_, lang]) => lang === language);
  
  if (entry) {
    return entry[0];
  }
  
  // Default extensions for common languages
  switch (language) {
    case 'javascript': return 'js';
    case 'typescript': return 'ts';
    case 'python': return 'py';
    case 'ruby': return 'rb';
    case 'java': return 'java';
    case 'c': return 'c';
    case 'cpp': return 'cpp';
    case 'csharp': return 'cs';
    case 'go': return 'go';
    case 'rust': return 'rs';
    case 'php': return 'php';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'scss': return 'scss';
    case 'json': return 'json';
    case 'markdown': return 'md';
    case 'shell': return 'sh';
    case 'yaml': return 'yaml';
    case 'xml': return 'xml';
    case 'sql': return 'sql';
    case 'graphql': return 'graphql';
    case 'swift': return 'swift';
    case 'kotlin': return 'kt';
    case 'dart': return 'dart';
    default: return 'txt';
  }
} 