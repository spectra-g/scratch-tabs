import { pythonSnippet } from './python';
import { javascriptSnippet } from './javascript';
import { typescriptSnippet } from './typescript';
import { javaSnippet } from './java';
import { goSnippet } from './go';
import { rustSnippet } from './rust';
import { rubySnippet } from './ruby';
import { phpSnippet } from './php';

// Map our language IDs to Piston's runtime IDs
export const languageToRuntime: Record<string, string> = {
  'python': 'python',
  'javascript': 'node-javascript',
  'typescript': 'node-typescript',
  'java': 'java',
  'c': 'c',
  'cpp': 'c++',
  'csharp': 'c#',
  'go': 'go',
  'rust': 'rust',
  'ruby': 'ruby',
  'php': 'php',
};

// Template code for each language
export const languageTemplates: Record<string, { name: string, code: string }> = {
  'python': pythonSnippet,
  'javascript': javascriptSnippet,
  'typescript': typescriptSnippet,
  'java': javaSnippet,
  'go': goSnippet,
  'rust': rustSnippet,
  'ruby': rubySnippet,
  'php': phpSnippet,
};

// Languages supported by Piston
export const supportedLanguages = Object.keys(languageToRuntime);