import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * CSV language detector
 */
export class CsvLanguageDetector extends BaseLanguageDetector {
  id = 'csv';
  name = 'CSV';
  extensions = ['csv', 'tsv'];
  priority = 3; // Lower priority than JavaScript

  /**
   * Get sample content for CSV
   */
  sampleContent(): string {
    return `ID,First Name,Last Name,Email,Phone,Country,Job Title,Department,Salary
1,John,Doe,john.doe@example.com,+1-555-123-4567,USA,Senior Developer,Engineering,95000
2,Jane,Smith,jane.smith@example.com,+1-555-234-5678,Canada,Product Manager,Product,105000
3,Michael,Johnson,michael.j@example.com,+1-555-345-6789,UK,UX Designer,Design,85000
4,Emily,Brown,emily.b@example.com,+1-555-456-7890,Australia,Data Analyst,Analytics,75000
5,David,Wilson,david.w@example.com,+1-555-567-8901,Germany,DevOps Engineer,Operations,90000
6,Sarah,Taylor,sarah.t@example.com,+1-555-678-9012,France,Marketing Manager,Marketing,80000
7,James,Anderson,james.a@example.com,+1-555-789-0123,Spain,Sales Director,Sales,110000
8,Lisa,Martinez,lisa.m@example.com,+1-555-890-1234,Italy,HR Specialist,Human Resources,70000
9,Robert,Garcia,robert.g@example.com,+1-555-901-2345,Japan,Software Engineer,Engineering,88000
10,Maria,Rodriguez,maria.r@example.com,+1-555-012-3456,Brazil,Content Writer,Marketing,65000`;
  }

  /**
   * Check if content matches CSV patterns
   */
  isMatch(content: string): boolean {
    // Reject code snippets
    if (/\b(import|export|function|class|const |let |var )\b/.test(content)) return false;
    // Reject if any comment markers
    if (/\/\//.test(content) || /\/\*/.test(content)) return false;
    // Get non-empty trimmed lines
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    // Need at least two lines to compare
    if (lines.length < 2) return false;
    const linesToCheck = lines.slice(0, 5);
    // Try common delimiters
    const delimiters = [',', ';', '\t'];
    for (const delim of delimiters) {
      // For each line, count delimiters and non-empty fields
      const stats = linesToCheck.map(line => {
        const parts = line.split(delim);
        const delimCount = parts.length - 1;
        const nonEmptyFields = parts.filter(p => p.trim().length > 0).length;
        return { delimCount, nonEmptyFields };
      });
      const first = stats[0];
      // First line must have at least 2 delimiters and 3 non-empty fields
      if (first.delimCount < 2 || first.nonEmptyFields < 3) continue;
      // All lines must satisfy these thresholds
      if (stats.every(s => s.delimCount === first.delimCount && s.nonEmptyFields >= 3)) {
        return true;
      }
    }
    return false;
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