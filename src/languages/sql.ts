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
   * Get sample content for SQL
   */
  sampleContent(): string {
    return `-- Create tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email, password_hash) VALUES
    ('john_doe', 'john@example.com', 'hash123'),
    ('jane_smith', 'jane@example.com', 'hash456');

INSERT INTO posts (user_id, title, content, status, published_at) VALUES
    (1, 'First Post', 'This is my first blog post!', 'published', CURRENT_TIMESTAMP),
    (1, 'Draft Post', 'Work in progress...', 'draft', NULL),
    (2, 'Hello World', 'Welcome to my blog!', 'published', CURRENT_TIMESTAMP);

-- Sample queries
SELECT 
    p.title,
    p.content,
    u.username,
    p.published_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.status = 'published'
ORDER BY p.published_at DESC;

-- Complex query with aggregation
SELECT 
    u.username,
    COUNT(p.id) as post_count,
    MAX(p.published_at) as last_published
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE p.status = 'published'
GROUP BY u.username
HAVING COUNT(p.id) > 0
ORDER BY post_count DESC;`;
  }
  
  /**
   * Check if content matches SQL patterns
   */
  isMatch(content: string): boolean {
    // Normalize content for better detection
    const normalizedContent = content.toLowerCase().trim();
    
    // Use grouped SQL keyword patterns for detection
    const sqlPatterns = [
      /\bselect\b[\s\S]*\bfrom\b/i,
      /\binsert\s+into\b/i,
      /\bupdate\b[\s\S]*\bset\b/i,
      /\bdelete\s+from\b/i,
      /\bcreate\s+(table|view|index|procedure|function|trigger|database)\b/i,
      /\balter\s+(table|view|index|procedure|function|trigger|database)\b/i,
      /\bdrop\s+(table|view|index|procedure|function|trigger|database)\b/i,
      /\bjoin\b[\s\S]*\bon\b/i
    ];
    
    // Count how many SQL patterns match
    const matchCount = sqlPatterns.reduce((count, pattern) => 
      count + (pattern.test(normalizedContent) ? 1 : 0), 0);
    
    // If at least one grouped pattern matches, consider it SQL
    return matchCount >= 1;
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