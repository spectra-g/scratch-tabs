import { loader } from '@monaco-editor/react';
import { registerYamlProvider } from './yaml';
import { registerMarkdownProvider } from './markdown';
import { registerJsonProvider } from './json';
import { registerBashProvider } from './bash';
import { registerCsvProvider } from './csv';

export const initializeLanguageProviders = () => {
  loader.init().then((monaco) => {
    // Register all language providers
    registerYamlProvider(monaco);
    registerMarkdownProvider(monaco);
    registerJsonProvider(monaco);
    registerBashProvider(monaco);
    registerCsvProvider(monaco);
  });
};

// Language detection functions
export const detectLanguage = (content: string): string => {
  if (!content.trim()) return 'plaintext';

  // Check for shebang first
  if (content.trimStart().startsWith('#!')) {
    const firstLine = content.split('\n')[0].toLowerCase();
    if (firstLine.includes('bash') || firstLine.includes('/sh')) {
      return 'shell';
    }
  }

  // Check for unambiguous languages first
  if (isJson(content)) return 'json';
  if (isCsv(content)) return 'csv';
  
  // Check for potentially ambiguous languages
  const matchesYaml = isYaml(content);
  const matchesMarkdown = isMarkdown(content);
  
  // If content matches both YAML and Markdown patterns, return the most likely one
  // but don't lock it (handled in App.tsx)
  if (matchesYaml && matchesMarkdown) {
    // Prioritize YAML if it has more YAML-specific patterns than Markdown-specific patterns
    if (countYamlSpecificPatterns(content) > countMarkdownSpecificPatterns(content)) {
      return 'yaml';
    } else {
      return 'markdown';
    }
  }
  
  if (matchesYaml) return 'yaml';
  if (matchesMarkdown) return 'markdown';
  
  return 'plaintext';
};

// Check if the content matches patterns that could be ambiguous between languages
export const isAmbiguousLanguage = (content: string): boolean => {
  const matchesYaml = isYaml(content);
  const matchesMarkdown = isMarkdown(content);
  
  // If content matches both YAML and Markdown patterns, it's ambiguous
  return matchesYaml && matchesMarkdown;
};

// Count YAML-specific patterns (patterns that are unlikely to be in Markdown)
const countYamlSpecificPatterns = (str: string): number => {
  const yamlSpecificPatterns = [
    /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*[a-zA-Z0-9_-]+:$/m,  // nested keys like "key1: key2:"
    /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*\d+$/m,              // key: number
    /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*true|false$/m,       // key: boolean
    /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*\[.*\]$/m,           // key: [array]
    /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*\{.*\}$/m            // key: {object}
  ];
  
  return yamlSpecificPatterns.reduce((count, pattern) => 
    count + (pattern.test(str) ? 1 : 0), 0);
};

// Count Markdown-specific patterns (patterns that are unlikely to be in YAML)
const countMarkdownSpecificPatterns = (str: string): number => {
  const markdownSpecificPatterns = [
    /^#{2,6}\s/m,                  // Headers with more than one #
    /\[.+?\]\(.+?\)/m,             // Links
    /!\[.+?\]\(.+?\)/m,            // Images
    /`{3}[\s\S]+?`{3}/m,           // Code blocks
    /\*\*.+?\*\*/m,                // Bold text
    /_.+?_/m,                      // Italic text
    /^>\s.+/m,                     // Blockquotes
    /^- \[[ x]\] /im,              // Task lists
    /^\d+\.\s/m                    // Ordered lists
  ];
  
  return markdownSpecificPatterns.reduce((count, pattern) => 
    count + (pattern.test(str) ? 1 : 0), 0);
};

// Helper functions for language detection
const isJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

const isMarkdown = (str: string): boolean => {
  const markdownPatterns = [
    /^#+ /m,                    // Headers
    /^\s*[-*] /m,               // Unordered lists
    /^\s*\d+\. /m,              // Ordered lists
    /\[.+?\]\(.+?\)/m,          // Links
    /!\[.+?\]\(.+?\)/m,         // Images
    /^>\s/m,                    // Blockquotes
    /`{1,3}[^`]+`{1,3}/m,      // Code blocks/inline code
    /\*\*.+?\*\*/m,            // Bold text
    /_.+?_/m,                  // Italic text
    /^- \[[ x]\] /im,          // Task lists
    /^---$/m                    // Horizontal rules
  ];

  return markdownPatterns.some(pattern => pattern.test(str));
};

const isYaml = (str: string): boolean => {
  const yamlPatterns = [
    /^[\s]*[a-zA-Z0-9_-]+[\s]*:(?:\s.*)?$/m,  // key: value
    /^[\s]*-[\s]+.*$/m,                        // - list item
    /^---$/m                                    // document separator
  ];
  
  return yamlPatterns.some(pattern => pattern.test(str)) &&
         !str.includes('{') &&                  // Avoid confusion with JSON
         !str.includes('}');
};

// CSV detection function
const isCsv = (str: string): boolean => {
  // Split into lines and check if we have at least one line
  const lines = str.trim().split('\n');
  if (lines.length === 0) return false;
  
  // Determine the most likely delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  let delimiterCount = (firstLine.match(/,/g) || []).length;
  
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  if (semicolonCount > delimiterCount) {
    delimiter = ';';
    delimiterCount = semicolonCount;
  }
  
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (tabCount > delimiterCount) {
    delimiter = '\t';
    delimiterCount = tabCount;
  }
  
  // If no delimiters found, it's not a CSV
  if (delimiterCount === 0) return false;
  
  // Check if all lines have approximately the same number of delimiters
  // (allowing for empty lines and some variation)
  const expectedFields = delimiterCount + 1;
  
  // Check at least the first 5 lines (or all if fewer)
  const linesToCheck = Math.min(5, lines.length);
  let validLines = 0;
  
  for (let i = 0; i < linesToCheck; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const fieldCount = (line.match(new RegExp(delimiter, 'g')) || []).length + 1;
    
    // Allow for some variation in field count (±1)
    if (Math.abs(fieldCount - expectedFields) <= 1) {
      validLines++;
    }
  }
  
  // If most of the checked lines match our CSV pattern, consider it a CSV
  return validLines >= Math.ceil(linesToCheck * 0.6);
};