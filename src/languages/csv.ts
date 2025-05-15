// In languages/csv.ts (or your equivalent file)

import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * CSV/TSV language detector
 */
export class CsvLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'csv'; // Keep 'csv' as the Monaco language ID
  name = 'CSV / TSV'; // More descriptive name
  extensions = ['csv', 'tsv', 'txt']; // .txt can often be CSV/TSV
  priority = 2; // Lower priority, as many things can look like CSV

  sampleContent(): string {
    return `ID,First Name,Last Name,Email
1,John,Doe,john.doe@example.com
2,Jane,Smith,jane.smith@example.com
3,Michael,Johnson,michael.j@example.com`;
  }

  /**
   * Detects if the given content matches CSV/TSV patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) { // e.g., "a,b"
      return this.noMatch();
    }

    // --- Anti-patterns (strong negative signals) ---
    // Common code structures that are definitely not CSV
    const codeAntiPatterns = [
      /\b(function|class|interface|enum|namespace|type)\s+\w+/i, // JS, TS, Java, C# keywords
      /^\s*#include\s+<.+>/m,  // C/C++ include
      /^\s*import\s+[\w.*]+(?:from\s*['"].*['"])?;?/im, // JS/TS/Python/Java import
      /^\s*package\s+[\w.]+;/im, // Java package
      /<\?php/i,               // PHP tag
      /<html\b|<body\b|<div\b|<script\b/i, // HTML/XML tags
      /^\s*@\w+/m,             // CSS @-rules, some decorators
      /\{\s*".*"\s*:\s*".*"\s*\}/g, // Looks like JSON object
      /-\s*-\s*-\s*/,           // Common Markdown separator
    ];

    if (codeAntiPatterns.some(pattern => pattern.test(content))) {
      return { match: false, confidence: 0.0 };
    }
    // More subtle anti-patterns (reduce confidence if found)
    let antiPatternPenalty = 0;
    if (content.includes(';') && !content.includes(',')) {
      // If semicolons are prevalent and commas aren't, it might be code (e.g. JS, Java, C#)
      // but CSV can also use semicolons. This is tricky.
      // Let's make it a small penalty for now if it wasn't caught by stronger anti-patterns.
      const semicolonLines = content.split('\n').filter(line => line.trim().endsWith(';')).length;
      if (semicolonLines > content.split('\n').length / 2) {
        antiPatternPenalty += 0.2;
      }
    }
    if (content.includes('//') || content.includes('/*')) {
      antiPatternPenalty += 0.1; // Comments might exist in data, but less likely
    }


    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) { // Need at least a header and one data row for good detection
      return { match: false, confidence: 0.0 };
    }

    const maxLinesToAnalyze = Math.min(lines.length, 10); // Analyze up to 10 lines
    const linesToAnalyze = lines.slice(0, maxLinesToAnalyze);

    const delimiters = [
      { char: ',', name: 'comma', weight: 0.3 },
      { char: '\t', name: 'tab', weight: 0.25 },
      { char: ';', name: 'semicolon', weight: 0.2 },
      // { char: '|', name: 'pipe', weight: 0.15 } // Less common, can add if needed
    ];

    let bestDelimiterMatch: { delim: string, avgFields: number, consistency: number, confidenceBoost: number } | null = null;
    let highestConfidence = 0.0;

    for (const delimInfo of delimiters) {
      const delimiter = delimInfo.char;
      const fieldCounts = linesToAnalyze.map(line => line.split(delimiter).length);

      if (fieldCounts.length === 0 || fieldCounts[0] <= 1) { // Must have at least one delimiter (=> 2 fields)
        continue;
      }

      const headerFieldCount = fieldCounts[0];
      let consistentCount = 0;
      let totalFields = 0;

      for (let i = 0; i < fieldCounts.length; i++) {
        totalFields += fieldCounts[i];
        // Check consistency: allow some variation for potentially quoted fields with internal delimiters
        // A simple check: if it's "close" to the header count.
        // Or, more strictly, require exact match for unquoted lines.
        // For simplicity here, let's prefer exact matches but allow minor deviations.
        if (Math.abs(fieldCounts[i] - headerFieldCount) <= 1) { // Allow one field difference
          consistentCount++;
        } else if (fieldCounts[i] === headerFieldCount) {
          consistentCount++;
        }
      }

      const consistencyRatio = consistentCount / fieldCounts.length;
      const averageFields = totalFields / fieldCounts.length;

      if (averageFields > 1.5 && consistencyRatio >= 0.7) { // At least ~1.5 fields on avg, 70% consistency
        let currentConfidence = delimInfo.weight; // Base confidence from delimiter type
        currentConfidence += (consistencyRatio * 0.4); // Add consistency bonus
        currentConfidence += Math.min(averageFields / 5, 0.2); // Bonus for more fields (capped)
        currentConfidence -= antiPatternPenalty; // Apply penalty

        // Prefer delimiters that result in more fields, if confidence is similar
        if (currentConfidence > highestConfidence) {
          highestConfidence = currentConfidence;
          bestDelimiterMatch = { delim: delimiter, avgFields: averageFields, consistency: consistencyRatio, confidenceBoost: currentConfidence };
        } else if (currentConfidence === highestConfidence && bestDelimiterMatch && averageFields > bestDelimiterMatch.avgFields) {
          bestDelimiterMatch = { delim: delimiter, avgFields: averageFields, consistency: consistencyRatio, confidenceBoost: currentConfidence };
        }
      }
    }

    if (bestDelimiterMatch) {
      // Check for purely numeric data which is less likely to be "prose" plaintext
      const firstLineParts = linesToAnalyze[0].split(bestDelimiterMatch.delim);
      const isMostlyNumeric = firstLineParts.every(part => !isNaN(parseFloat(part))) && firstLineParts.length > 1;
      if (isMostlyNumeric) {
        highestConfidence += 0.1;
      }
      // If header looks like typical column names (alphanumeric, spaces, underscores)
      const headerLooksGood = firstLineParts.every(part => /^[a-z0-9\s_-]+$/i.test(part.trim()));
      if (headerLooksGood && firstLineParts.length > 2) {
        highestConfidence += 0.15;
      }


      highestConfidence = Math.min(1.0, Math.max(0.0, highestConfidence));
      return { match: true, confidence: highestConfidence };
    }

    return { match: false, confidence: 0.0 };
  }


  getFileExtension(): string {
    // Could be smarter based on detected delimiter, but 'csv' is a safe default.
    return 'csv';
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'csv'

    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });

      // Basic Monarch tokenizer for CSV/TSV
      // This is a simplified version and might not handle all edge cases like quoted fields with delimiters.
      // In CsvLanguageDetector.registerProvider

      // In CsvLanguageDetector.registerProvider
      monaco.languages.setMonarchTokensProvider(languageId, {
        defaultToken: 'invalid', // Will color unhandled characters red
        tokenizer: {
          root: [
            // 1. Match a semicolon (delimiter)
            //    This rule is simple and consumes one character.
            [';', 'delimiter.semicolon'],

            // 2. Match field content: One or more characters that are NOT a semicolon and NOT a newline.
            //    The `+` is crucial: it ensures at least one character is consumed.
            //    This should be placed AFTER specific delimiter rules.
            [/[^;\r\n]+/, 'identifier'],

            // 3. Optional: Match whitespace if you want to tokenize it separately (often not needed)
            //    If not tokenized, it might become part of an 'identifier' if adjacent,
            //    or 'invalid' if standalone between delimiters.
            //    [/\s+/, 'white'] // For debugging, you can see what it does.
          ]
        }
      });

      // Define a basic theme for CSV
      // In CsvLanguageDetector.registerProvider method, defineTheme:
      monaco.editor.defineTheme(`${languageId}-theme`, {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'string.quoted.double', foreground: 'ce9178' }, // Orange-ish for strings
          { token: 'string.quoted.single', foreground: 'ce9178' },
          { token: 'delimiter.comma', foreground: 'd4d4d4', fontStyle: 'bold' },
          { token: 'delimiter.tab', foreground: '6A9955', fontStyle: 'bold' },
          { token: 'delimiter.semicolon', foreground: 'c586c0', fontStyle: 'bold' }, // Your CSV uses ;
          { token: 'delimiter.pipe', foreground: '569cd6', fontStyle: 'bold' },
          { token: 'identifier', foreground: '9cdcfe' },         // Light blue for field content
          { token: 'comment', foreground: '6a9955' },            // If you add comment rule
          { token: 'invalid', foreground: 'ff0000', fontStyle: 'italic' } // For defaultToken
        ],
        colors: {
          'editor.foreground': '#d4d4d4'
        }
      });
    }

    // Basic CSV formatter (trims fields) - can be improved
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let detectedDelimiter = ','; // Default

        // Simple delimiter detection for formatting (could be more robust)
        if (lines.length > 0) {
          const header = lines[0];
          if (header.includes('\t')) detectedDelimiter = '\t';
          else if (header.includes(';')) detectedDelimiter = ';';
          else if (header.includes('|')) detectedDelimiter = '|';
        }

        const formattedLines = lines.map((line: string) => {
          if (!line.trim()) return '';
          return line.split(detectedDelimiter)
            .map((field: string) => field.trim())
            .join(detectedDelimiter);
        });

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });
  }
}

// Create and register the detector
const csvDetector = new CsvLanguageDetector();
languageRegistry.register(csvDetector);

// Export for backward compatibility (optional)
export const registerCsvProvider = (monaco: any) => {
  csvDetector.registerProvider(monaco);
};