import { VaultItem } from '../types';

export type ImportSource = 'terminal-history' | 'vscode-snippets' | 'markdown-notes';

export interface ImportParserResult {
  items: Partial<VaultItem>[];
  errors: string[];
}

/**
 * Parse terminal history from bash/zsh history output
 * Format: Lines like "998 chmod +x inspect_folder.sh"
 */
export function parseTerminalHistory(rawContent: string): ImportParserResult {
  const lines = rawContent.trim().split('\n');
  const items: Partial<VaultItem>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Regex to match history format: number + command
      const match = line.match(/^\d+\s+(.*)/);
      if (match) {
        const command = match[1].trim();
        if (command) {
          // Generate title from first few words
          const words = command.split(/\s+/);
          const title = words.slice(0, 5).join(' ');
          
          // Try to extract program name for additional label
          const programMatch = command.match(/^(\w+)/);
          const labels = ['terminal-history'];
          if (programMatch) {
            labels.push(programMatch[1]);
          }

          items.push({
            title: title.length > 50 ? title.substring(0, 50) + '...' : title,
            content: command,
            contentType: 'script',
            labels
          });
        }
      } else {
        // If it doesn't match the history format, treat as a command
        const title = line.length > 50 ? line.substring(0, 50) + '...' : line;
        items.push({
          title,
          content: line,
          contentType: 'script',
          labels: ['terminal-history']
        });
      }
    } catch (error) {
      errors.push(`Line ${i + 1}: Failed to parse command`);
    }
  }

  return { items, errors };
}

/**
 * Parse VS Code snippets from JSON format
 * Format: { "snippet-name": { "body": "snippet content", ... } }
 */
export function parseVscodeSnippets(rawContent: string): ImportParserResult {
  const items: Partial<VaultItem>[] = [];
  const errors: string[] = [];

  try {
    const snippets = JSON.parse(rawContent);
    
    if (typeof snippets !== 'object' || snippets === null) {
      throw new Error('Invalid JSON structure');
    }

    Object.entries(snippets).forEach(([key, snippet]: [string, any]) => {
      try {
        if (typeof snippet === 'object' && snippet !== null) {
          let body = '';
          
          // Handle different body formats
          if (Array.isArray(snippet.body)) {
            body = snippet.body.join('\n');
          } else if (typeof snippet.body === 'string') {
            body = snippet.body;
          } else {
            throw new Error('Invalid body format');
          }

          if (body.trim()) {
            items.push({
              title: key,
              content: body,
              contentType: 'code',
              labels: ['vscode-snippet']
            });
          }
        }
      } catch (error) {
        errors.push(`Snippet "${key}": ${error instanceof Error ? error.message : 'Invalid format'}`);
      }
    });
  } catch (error) {
    errors.push(`JSON parsing failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }

  return { items, errors };
}

/**
 * Parse markdown notes split by horizontal rules
 * Format: Content separated by "---" on its own line
 */
export function parseMarkdownNotes(rawContent: string): ImportParserResult {
  const items: Partial<VaultItem>[] = [];
  const errors: string[] = [];

  try {
    // Split by horizontal rules (--- on its own line)
    const sections = rawContent.split(/\n\s*---\s*\n/);
    
    sections.forEach((section, index) => {
      try {
        const trimmedSection = section.trim();
        if (!trimmedSection) return;

        const lines = trimmedSection.split('\n');
        const firstLine = lines[0].trim();
        
        // Use first line as title, rest as content
        const title = firstLine.replace(/^#+\s*/, ''); // Remove markdown headers
        const content = lines.slice(1).join('\n').trim();

        if (title) {
          items.push({
            title: title.length > 100 ? title.substring(0, 100) + '...' : title,
            content: content || title, // If no content, use title as content
            contentType: 'plaintext',
            labels: ['markdown-import']
          });
        } else if (content) {
          // If no title, use first few words of content as title
          const words = content.split(/\s+/);
          const generatedTitle = words.slice(0, 5).join(' ');
          
          items.push({
            title: generatedTitle.length > 100 ? generatedTitle.substring(0, 100) + '...' : generatedTitle,
            content,
            contentType: 'plaintext',
            labels: ['markdown-import']
          });
        }
      } catch (error) {
        errors.push(`Section ${index + 1}: ${error instanceof Error ? error.message : 'Failed to parse'}`);
      }
    });
  } catch (error) {
    errors.push(`Markdown parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { items, errors };
}

/**
 * Main parser function that routes to the appropriate parser based on source
 */
export function parseImportData(source: ImportSource, rawContent: string): ImportParserResult {
  switch (source) {
    case 'terminal-history':
      return parseTerminalHistory(rawContent);
    case 'vscode-snippets':
      return parseVscodeSnippets(rawContent);
    case 'markdown-notes':
      return parseMarkdownNotes(rawContent);
    default:
      return {
        items: [],
        errors: [`Unknown import source: ${source}`]
      };
  }
}

/**
 * Get import source display information
 */
export function getImportSourceInfo(source: ImportSource) {
  switch (source) {
    case 'terminal-history':
      return {
        name: 'Terminal History',
        description: 'Import commands from bash/zsh history output',
        placeholder: 'Paste your terminal history here...\nExample:\n998 chmod +x inspect_folder.sh\n999 git status\n1000 npm install',
        acceptsFiles: false
      };
    case 'vscode-snippets':
      return {
        name: 'VS Code Snippets',
        description: 'Import snippets from VS Code snippets.json file',
        placeholder: 'Paste your VS Code snippets JSON here...',
        acceptsFiles: true,
        fileExtensions: ['.json']
      };
    case 'markdown-notes':
      return {
        name: 'Markdown Notes',
        description: 'Import notes from markdown files separated by horizontal rules (---)',
        placeholder: 'Paste your markdown content here...\nSeparate notes with --- on its own line',
        acceptsFiles: true,
        fileExtensions: ['.md', '.markdown', '.txt']
      };
    default:
      return {
        name: 'Unknown',
        description: '',
        placeholder: '',
        acceptsFiles: false
      };
  }
} 