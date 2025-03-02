import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * CSV language detector
 */
export class CsvLanguageDetector extends BaseLanguageDetector {
  id = 'csv';
  name = 'CSV';
  extensions = ['csv', 'tsv'];
  priority = 4;
  
  /**
   * Check if content matches CSV patterns
   */
  isMatch(content: string): boolean {
    // Split into lines and check if we have at least one line
    const lines = content.trim().split('\n');
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
  }
  
  /**
   * Register CSV language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Register CSV language if not already registered
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'csv')) {
      monaco.languages.register({ id: 'csv' });
      
      // Define CSV syntax highlighting
      monaco.languages.setMonarchTokensProvider('csv', {
        tokenizer: {
          root: [
            [/^[^,\r\n]+/, 'header'],
            [/,(?=[^,\r\n]*$)/, 'delimiter.comma'],
            [/,/, 'delimiter.comma'],
            [/[^,\r\n]+/, 'field']
          ]
        }
      });
      
      // Define CSV theme
      monaco.editor.defineTheme('csv-theme', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'header', foreground: '0000FF', fontStyle: 'bold' },
          { token: 'delimiter.comma', foreground: 'FF0000' },
          { token: 'field', foreground: '000000' }
        ],
        colors: {}
      });
    }
    
    // Configure CSV formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('csv', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        
        // Determine the delimiter
        const firstLine = lines[0] || '';
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
        
        // Format each line
        const formattedLines = lines.map((line: string) => {
          if (!line.trim()) return '';
          
          // Split the line by the delimiter
          const fields = line.split(delimiter);
          
          // Trim each field and rejoin with the delimiter
          return fields.map((field: string) => field.trim()).join(delimiter);
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

// Export for backward compatibility
export const registerCsvProvider = (monaco: any) => {
  csvDetector.registerProvider(monaco);
};