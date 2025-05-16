import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * SQL language detector
 */
export class SqlLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'sql'; // Monaco's built-in ID for SQL
  name = 'SQL';
  extensions = ['sql', 'ddl', 'dml'];
  priority = 6; // High priority, distinctive keywords

  sampleContent(): string {
    return `-- This is a sample SQL script

-- DDL: Create Tables
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY AUTO_INCREMENT,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE,
    DepartmentID INT,
    HireDate DATE,
    Salary DECIMAL(10, 2),
    CONSTRAINT FK_Department FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE INDEX idx_employee_lastname ON Employees(LastName);

-- DML: Insert Data
INSERT INTO Employees (FirstName, LastName, Email, DepartmentID, HireDate, Salary)
VALUES 
('John', 'Doe', 'john.doe@example.com', 1, '2022-01-15', 60000.00),
('Jane', 'Smith', 'jane.smith@example.com', 2, '2021-07-22', 75000.00),
('Robert', 'Brown', 'robert.brown@example.com', 1, '2023-03-01', 55000.00);

-- DQL: Select Data
SELECT 
    e.FirstName, 
    e.LastName, 
    d.DepartmentName,
    e.Salary,
    (SELECT AVG(Salary) FROM Employees) AS AvgCompanySalary
FROM 
    Employees e
INNER JOIN 
    Departments d ON e.DepartmentID = d.DepartmentID
WHERE 
    e.Salary > (SELECT AVG(Salary) FROM Employees WHERE DepartmentID = e.DepartmentID)
    AND e.HireDate > '2022-01-01'
GROUP BY
    e.EmployeeID, d.DepartmentName -- Necessary for some SQL dialects if not aggregating these columns
HAVING
    COUNT(e.EmployeeID) > 0 -- Silly example for HAVING
ORDER BY 
    e.LastName ASC, e.FirstName ASC
LIMIT 10;

-- DML: Update Data
UPDATE Employees
SET Salary = Salary * 1.05, DepartmentID = 3
WHERE LastName = 'Doe';

-- DML: Delete Data
-- DELETE FROM Employees WHERE Email = 'robert.brown@example.com';

/*
This is a
multi-line SQL comment.
*/
`;
  }

  /**
   * Detects if the given content matches SQL patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) { // e.g., "SELECT *;"
      return this.noMatch();
    }
    const lines = content.split('\n');

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. Core DML/DDL Keywords (Very Strong Signals)
    //    Case-insensitive matching for keywords.
    // 1. Core DML/DDL Keywords (Very Strong Signals)
    //    Case-insensitive matching for keywords.
    const coreSqlKeywords = [
      "SELECT", "INSERT INTO", "UPDATE", "DELETE FROM",
      "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
      "CREATE VIEW", "ALTER VIEW", "DROP VIEW",
      "CREATE INDEX", "DROP INDEX",
      "CREATE PROCEDURE", "ALTER PROCEDURE", "DROP PROCEDURE",
      "CREATE FUNCTION", "ALTER FUNCTION", "DROP FUNCTION",
      "CREATE TRIGGER", "ALTER TRIGGER", "DROP TRIGGER",
      "CREATE DATABASE", "ALTER DATABASE", "DROP DATABASE",
      "CREATE SCHEMA", "ALTER SCHEMA", "DROP SCHEMA",
      "BEGIN TRANSACTION", "COMMIT", "ROLLBACK", "SAVEPOINT",
      "TRUNCATE TABLE",
      "WITH " // Common Table Expressions (ensure space if it's a prefix)
    ];

    // Regex to match these keywords, ensuring they are whole words and
    // potentially start a statement or follow common delimiters.
    // Corrected: Ensure the ( is just an alternative, not an unterminated group opener.
    const coreKeywordRegex = new RegExp(`(?:^|\\s|;|\\()(${coreSqlKeywords.map(kw => kw.replace(/\s+/g, '\\s+')).join('|')})\\b`, "gi");

    const coreMatches = content.match(coreKeywordRegex);
    if (coreMatches) {
      confidenceScore += 0.5; // Strong base for finding core DML/DDL
      // Adjusted perMatch bonus to be slightly more conservative, and cap at 5
      confidenceScore += Math.min(coreMatches.length, 5) * 0.08;
      patternsMatched += coreMatches.length > 0 ? 1 : 0;
      strongSignalFound = true;
    }

    // 2. Common SQL Clauses and Secondary Keywords
    const commonClausePatterns = [
      { pattern: /\bFROM\b/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /\bWHERE\b/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /\b(INNER|LEFT|RIGHT|FULL)?\s*JOIN\b[\s\S]*?\bON\b/gi, weight: 0.15, perMatch: 0.02 },
      { pattern: /\bGROUP\s+BY\b/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /\bORDER\s+BY\b/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /\bHAVING\b/gi, weight: 0.08, perMatch: 0.01 },
      { pattern: /\bLIMIT\b|\bOFFSET\b|\bFETCH\s+FIRST\b|\bROWNUM\b/gi, weight: 0.08, perMatch: 0.01 }, // Limit/offset
      { pattern: /\b(VALUES|SET)\s*\(/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /\b(AND|OR|NOT)\b/gi, weight: 0.05, perMatch: 0.005 },
      { pattern: /\b(AS|IN|LIKE|BETWEEN|IS\s+NULL|IS\s+NOT\s+NULL|EXISTS|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END)\b/gi, weight: 0.05, perMatch: 0.002 },
      { pattern: /\b(PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|UNIQUE|NOT\s+NULL|DEFAULT|CHECK|CONSTRAINT)\b/gi, weight: 0.15, perMatch: 0.02 }, // Constraints
      { pattern: /\b(VARCHAR|INT|INTEGER|DECIMAL|NUMERIC|TEXT|DATE|TIMESTAMP|BOOLEAN|CHAR|BLOB|CLOB)\b/gi, weight: 0.1, perMatch: 0.01 }, // Common data types
    ];

    for (const p of commonClausePatterns) {
      const matches = content.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore += Math.min(matches.length, 10) * p.perMatch; // Higher cap for common keywords
        }
        patternsMatched++;
      }
    }

    // 3. SQL Comments
    if (/--.*/g.test(content)) { // SQL single-line comment
      confidenceScore += 0.1;
      patternsMatched++;
    }
    if (/\/\*[\s\S]*?\*\//g.test(content)) { // SQL multi-line comment
      confidenceScore += 0.05; // Slightly less distinctive than --
      patternsMatched++;
    }

    // 4. Semicolons as statement terminators (common, but not exclusive to SQL)
    const semicolonCount = (content.match(/;/g) || []).length;
    if (semicolonCount > 0) {
      confidenceScore += Math.min(semicolonCount, 5) * 0.01; // Small bonus
      patternsMatched++;
    }

    // 5. Anti-patterns
    const antiPatterns = [
      { pattern: /<\?php/i, weight: -0.7 },
      { pattern: /^\s*#include\s*<.+>/m, weight: -0.6 },         // C/C++ include
      { pattern: /<\w.*?>/g, weight: -0.5 },                     // HTML/XML tags
      { pattern: /\b(function|class|var|let|const|def)\s+\w+/i, weight: -0.4 }, // JS/Python/Ruby/Groovy keywords
      { pattern: /=>|->(?!')/g, weight: -0.3, except: /['"].*?->.*?['"]/g }, // Arrow/pointer syntax (excluding JSONB operators in strings)
      { pattern: /@[\w.]+\s*\(?/g, weight: -0.2, except: /@\w+\s*=\s*[^;]+/g } // Annotations, except things like @variable = value
    ];

    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
        let applyPenalty = true;
        if (ap.except) {
          const exceptionMatches = content.match(ap.except);
          if (exceptionMatches && exceptionMatches.length > 0 && exceptionMatches.length >= matches.length) {
            applyPenalty = false;
          }
        }
        if (applyPenalty) {
          confidenceScore += ap.weight * Math.min(matches.length, 2);
        }
      }
    }

    // 6. Final Adjustments
    if (strongSignalFound && patternsMatched >= 2) {
      confidenceScore += 0.2;
    }
    if (confidenceScore > 0 && lines.length > 0 && lines.every(line => line.trim().endsWith(';') || line.trim() === '' || line.trim().startsWith('--') || line.trim().startsWith('/*'))) {
      confidenceScore += 0.1; // All non-empty/non-comment lines end with a semicolon
    }


    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = (strongSignalFound && confidenceScore >= 0.5) || (patternsMatched >= 3 && confidenceScore >= 0.6);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound
    };
  }

  getFileExtension(): string {
    return 'sql';
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'sql'

    // Monaco has good built-in support for 'sql'.
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    // SQL formatting is highly dialect-dependent and complex.
    // Relying on Monaco's built-in capabilities or an LSP is generally best.
    // The formatter you provided was a good attempt at heuristic formatting but might
    // oversimplify or misformat complex queries.
    // For a scratchpad, a *very* basic formatter might be acceptable or none at all.
    // I'll keep your formatter structure but note its limitations.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        // A more robust SQL formatter would typically be an external library or LSP.
        // This is a very basic heuristic formatter.
        let formattedSql = content;

        // Uppercase main keywords (optional, depends on style preference)
        // const keywordsToUpper = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
        // keywordsToUpper.forEach(kw => {
        //   formattedSql = formattedSql.replace(new RegExp(`\\b${kw}\\b`, 'gi'), kw.toUpperCase());
        // });

        // Add newlines and basic indentation
        // This is very simplified and might not handle all SQL dialects or complex queries well.
        formattedSql = formattedSql
          .replace(/\s*([;,()])\s*/g, '$1 ') // Space after comma, semicolon, parens
          .replace(/\s*=\s*/g, ' = ')      // Spaces around equals
          .replace(/\s*(<>|!=|<=|>=|<|>)\s*/g, ' $1 ') // Spaces around comparison operators
          .replace(/\b(AND|OR)\b/gi, '\n  $1')
          .replace(/\b(SELECT\b.*?\bFROM)\b/gi, '\n$1') // Newline before SELECT...FROM
          .replace(/\b(WHERE|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, '\n$1')
          .replace(/\b(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|JOIN)\b/gi, '\n  $1')
          .replace(/\bON\b/gi, '\n    ON')
          .replace(/\b(INSERT INTO)\b/gi, '\n$1')
          .replace(/\bVALUES\b/gi, '\n  VALUES')
          .replace(/\b(UPDATE\b.*?\bSET)\b/gi, '\n$1')
          .replace(/\b(CREATE|ALTER|DROP)\s+(TABLE|VIEW|INDEX)\b/gi, '\n$1 $2')
          .replace(/;\s*/g, ';\n\n') // Two newlines after statements
          .replace(/\n\s*\n+/g, '\n\n') // Max one blank line
          .trim();

        // Basic indentation logic (very heuristic)
        let indentLevel = 0;
        const indentChar = '  '; // Two spaces
        const lines = formattedSql.split('\n');
        formattedSql = lines.map(line => {
          let currentLine = line.trim();
          let indent = indentLevel;

          if (currentLine.match(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|INSERT INTO|UPDATE|VALUES|SET|CREATE|ALTER|DROP|BEGIN)\b/i) || currentLine.endsWith('(')) {
            // No change before, potential change after
          } else if (currentLine.match(/\b(END|COMMIT|ROLLBACK)\b/i) || currentLine.startsWith(')')) {
            indent = Math.max(0, indentLevel - 1);
          }

          const result = indentChar.repeat(indent) + currentLine;

          if (currentLine.match(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|INSERT INTO|UPDATE|VALUES|SET|CREATE|ALTER|DROP|BEGIN)\b/i) || currentLine.endsWith('(')) {
            if (!currentLine.endsWith(';')) indentLevel++;
          } else if (currentLine.match(/\b(END|COMMIT|ROLLBACK)\b/i) || currentLine.startsWith(')')) {
            // Already handled indent decrease, but ensure it's capped
            indentLevel = Math.max(0, indentLevel - (currentLine.startsWith(')') ? 1 : 0)); // Decrement again if it was just for a closing paren
          }
          if (currentLine.endsWith(';')) {
            indentLevel = Math.max(0, indentLevel - 1); // Reset after statement if it was a block
          }


          return result;
        }).join('\n');


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

// Export for backward compatibility (optional)
export const registerSqlProvider = (monaco: any) => {
  sqlDetector.registerProvider(monaco);
};