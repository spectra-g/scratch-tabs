import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * SQL language detector
 */
export class SqlLanguageDetector extends BaseLanguageDetector {
  id = 'sql';
  name = 'SQL';
  extensions = ['sql'];
  priority = 3;
  
  /**
   * Check if content matches SQL patterns
   */
  isMatch(content: string): boolean {
    // Normalize content for better detection
    const normalizedContent = content.toLowerCase().trim();
    
    // Check for common SQL keywords and patterns
    const sqlPatterns = [
      /\b(select|from|where|join|inner join|left join|right join|full join|group by|order by|having)\b/i,
      /\b(insert into|values|update|set|delete from)\b/i,
      /\b(create|alter|drop)\s+(table|view|index|procedure|function|trigger|database)\b/i,
      /\b(primary key|foreign key|references|constraint|unique|not null|auto_increment)\b/i,
      /\b(int|varchar|char|text|date|datetime|timestamp|boolean|decimal|float|double)\b/i,
      /\b(count|sum|avg|min|max)\s*\(/i,
      /\b(and|or|not|in|between|like|is null|is not null)\b/i
    ];
    
    // Count how many SQL patterns match
    const matchCount = sqlPatterns.reduce((count, pattern) => 
      count + (pattern.test(normalizedContent) ? 1 : 0), 0);
    
    // If at least 3 patterns match, consider it SQL
    return matchCount >= 3;
  }
  
  /**
   * Register SQL language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure SQL formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('sql', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        
        // Basic SQL formatting
        let formattedSql = content
          // Replace multiple spaces with a single space
          .replace(/\s+/g, ' ')
          // Add newline after semicolons
          .replace(/;\s*/g, ';\n\n')
          // Add newline and indent after these keywords
          .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, '\n$1')
          .replace(/\b(INNER|LEFT|RIGHT|FULL|OUTER|CROSS)?\s*JOIN\b/gi, '\n  JOIN')
          // Add newline and indent for these clauses
          .replace(/\b(ON|AND|OR)\b/gi, '\n    $1')
          // Format INSERT statements
          .replace(/\b(INSERT INTO|VALUES|UPDATE|SET|DELETE FROM)\b/gi, '\n$1')
          // Format CREATE/ALTER/DROP statements
          .replace(/\b(CREATE|ALTER|DROP)\s+(TABLE|VIEW|INDEX|PROCEDURE|FUNCTION|TRIGGER|DATABASE)\b/gi, '\n$1 $2')
          // Clean up extra newlines
          .replace(/\n\s*\n/g, '\n\n')
          .trim();
        
        return [{
          range: model.getFullModelRange(),
          text: formattedSql
        }];
      }
    });
  }
}

// Create and register the detector
const sqlDetector = new SqlLanguageDetector();
languageRegistry.register(sqlDetector);

// Export for backward compatibility
export const registerSqlProvider = (monaco: any) => {
  sqlDetector.registerProvider(monaco);
}; 