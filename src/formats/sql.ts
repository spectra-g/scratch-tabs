import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * SQL language detector
 */
export class SqlFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "sql"; // Monaco's built-in ID for SQL
  name = "SQL";
  extensions = ["sql", "ddl", "dml"];
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

  // Store keywords in a Set for efficient lookup
  private coreSqlKeywordsForRatio: Set<string>; // More restrictive for ratio
  private allSqlKeywordsForPatterns: Set<string>; // Broader for general pattern matching
  private coreDmlDdlStartKeywordsRegex: RegExp; // For checking line starts

  constructor() {
    super();
    // CORE_SQL_KEYWORDS_FOR_RATIO: Highly unambiguous SQL-specific keywords
    // These are less likely to appear as common English words.
    const CORE_SQL_KEYWORDS_FOR_RATIO_LIST = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE", // Base DML
      "CREATE",
      "ALTER",
      "DROP", // Base DDL
      "TABLE",
      "VIEW",
      "INDEX",
      "PROCEDURE",
      "FUNCTION",
      "TRIGGER",
      "DATABASE",
      "SCHEMA",
      "TRUNCATE",
      "WITH", // CTE
      "JOIN",
      "INNER",
      "LEFT",
      "RIGHT",
      "FULL", // Join types are quite specific
      "GROUP",
      "ORDER",
      "HAVING", // Clause starters
      "CONSTRAINT",
      "PRIMARY",
      "FOREIGN",
      "REFERENCES",
      "UNIQUE", // Constraint keywords
      "VALUES", // Specific to INSERT
      // Excluded: FROM, WHERE, ON, BY, AS, IN, AND, OR, NOT, IS, NULL, SET, KEY, END, ALL, DISTINCT, CASE, WHEN, THEN, ELSE
      // Excluded Data Types for ratio, as they might appear as identifiers in other contexts if not careful.
    ];
    this.coreSqlKeywordsForRatio = new Set(CORE_SQL_KEYWORDS_FOR_RATIO_LIST); // Stored in uppercase for Set

    // CORE_DML_DDL_START_KEYWORDS_LIST: Keywords that often start a SQL statement.
    // Used for the "lines starting with core keywords" heuristic and initial strong signal.
    const CORE_DML_DDL_START_KEYWORDS_LIST = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "CREATE",
      "ALTER",
      "DROP",
      "TRUNCATE",
      "WITH",
      "BEGIN",
      "COMMIT",
      "ROLLBACK",
      "SAVEPOINT", // Transactional
    ];
    this.coreDmlDdlStartKeywordsRegex = new RegExp(
      `^\\s*(${CORE_DML_DDL_START_KEYWORDS_LIST.join("|")})\\b`,
      "i",
    );

    // ALL_SQL_KEYWORDS_FOR_PATTERNS: Broader set for general pattern matching weights.
    // This can include words that are also common English words, as their weight contribution
    // will be balanced by the ratio and other signals.
    const ALL_SQL_KEYWORDS_FOR_PATTERNS_LIST = [
      ...CORE_SQL_KEYWORDS_FOR_RATIO_LIST, // Include the core set
      "FROM",
      "WHERE",
      "ON",
      "BY",
      "LIMIT",
      "OFFSET",
      "FETCH",
      "ROWNUM",
      "SET",
      "AND",
      "OR",
      "NOT",
      "AS",
      "IN",
      "LIKE",
      "BETWEEN",
      "IS",
      "NULL",
      "EXISTS",
      "UNION",
      "ALL",
      "DISTINCT",
      "CASE",
      "WHEN",
      "THEN",
      "ELSE",
      "END",
      "DEFAULT",
      "CHECK",
      "VARCHAR",
      "INT",
      "INTEGER",
      "DECIMAL",
      "NUMERIC",
      "TEXT",
      "DATE",
      "TIMESTAMP",
      "BOOLEAN",
      "CHAR",
      "BLOB",
      "CLOB",
      "KEY",
      "INTO",
    ];
    this.allSqlKeywordsForPatterns = new Set(
      ALL_SQL_KEYWORDS_FOR_PATTERNS_LIST.map((kw) => kw.toUpperCase()),
    );
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0; // Count of distinct pattern types matched
    let strongSignalFound = false;
    let actualKeywordHits = 0; // General counter for any keyword pattern hit

    let contentWithoutComments = content.replace(/--.*/g, "");
    contentWithoutComments = contentWithoutComments.replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );

    const linesForAnalysis = contentWithoutComments
      .split("\n")
      .filter((line) => line.trim().length > 0);

    if (linesForAnalysis.length === 0 && content.length > 0) {
      return this.noMatch();
    }
    const nonCommentContent = linesForAnalysis.join("\n");
    if (nonCommentContent.trim().length < 5 && content.length > 0) {
      return this.noMatch();
    }

    // --- NEW: Lines Starting with Core SQL Keywords Heuristic ---
    let linesStartingWithCoreKeyword = 0;
    if (linesForAnalysis.length > 0) {
      linesForAnalysis.forEach((line) => {
        if (this.coreDmlDdlStartKeywordsRegex.test(line.trimStart())) {
          linesStartingWithCoreKeyword++;
        }
      });

      if (linesForAnalysis.length >= 1 && linesStartingWithCoreKeyword > 0) {
        const ratioLinesStartCore =
          linesStartingWithCoreKeyword / linesForAnalysis.length;
        if (ratioLinesStartCore >= 0.5 && linesForAnalysis.length >= 1) {
          // e.g., 50% of non-comment lines start with a core keyword
          confidenceScore += 0.35;
          strongSignalFound = true;
          patternsMatched++;
        } else if (ratioLinesStartCore >= 0.2 && linesForAnalysis.length >= 2) {
          confidenceScore += 0.2;
          strongSignalFound = true; // Still a good signal
          patternsMatched++;
        } else if (linesStartingWithCoreKeyword > 0) {
          confidenceScore += 0.1; // At least one such line found
          patternsMatched++;
        }
      } else if (
        linesForAnalysis.length > 3 &&
        linesStartingWithCoreKeyword === 0 &&
        nonCommentContent.length > 100
      ) {
        // If substantial non-comment text and NO lines start with core SQL, it's a negative signal.
        confidenceScore -= 0.25;
      }
    }
    // --- End Lines Starting with Core SQL Keywords ---

    // --- Keyword-to-Token Ratio Calculation (using coreSqlKeywordsForRatio) ---
    let keywordRatio = -1;
    let totalSignificantTokens = 0;
    let coreKeywordTokenCountForRatio = 0;

    if (linesForAnalysis.length > 0) {
      const sqlTokenRegex =
        /([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)|('[^']*'|"[^"]*")|(\d+\.?\d*(?:[eE][+-]?\d+)?)|([=<>!+-/*]+|[\(\),;])/g;
      const tokensFromContent: string[] = [];
      let matchToken;
      while ((matchToken = sqlTokenRegex.exec(nonCommentContent)) !== null) {
        if (matchToken[0]) tokensFromContent.push(matchToken[0]);
      }

      totalSignificantTokens = tokensFromContent.length;

      if (totalSignificantTokens > 5) {
        // Min tokens to make ratio somewhat meaningful
        tokensFromContent.forEach((token) => {
          // Use the more restrictive coreSqlKeywordsForRatio for this calculation
          if (this.coreSqlKeywordsForRatio.has(token.toUpperCase())) {
            coreKeywordTokenCountForRatio++;
          }
        });
        // Update general actualKeywordHits based on the broader set for other checks
        actualKeywordHits = tokensFromContent.filter((t) =>
          this.allSqlKeywordsForPatterns.has(t.toUpperCase()),
        ).length;

        if (totalSignificantTokens > 0) {
          keywordRatio = coreKeywordTokenCountForRatio / totalSignificantTokens;
          // console.log(`SQL Detector: Ratio (Core Keywords)=${keywordRatio.toFixed(3)}, CoreKeywords=${coreKeywordTokenCountForRatio}, TotalTokens=${totalSignificantTokens}, ActualAllKeywords=${actualKeywordHits}`);

          const MIN_RATIO_FOR_SQL = 0.02; // Stricter: e.g., 2% of tokens must be from coreSqlKeywordsForRatio
          const MIN_TOKENS_FOR_STRICT_RATIO_CHECK = 50;

          if (
            totalSignificantTokens > MIN_TOKENS_FOR_STRICT_RATIO_CHECK &&
            keywordRatio < MIN_RATIO_FOR_SQL &&
            coreKeywordTokenCountForRatio < 2
          ) {
            // console.log(`SQL Detector: Early exit due to very low CORE keyword ratio (${keywordRatio.toFixed(3)}) and few core keyword hits.`);
            return this.noMatch();
          }
          // Apply penalties/boosts based on this more refined ratio
          if (keywordRatio < 0.03 && totalSignificantTokens > 40) {
            confidenceScore -= 0.5;
          } else if (keywordRatio < 0.05 && totalSignificantTokens > 60) {
            confidenceScore -= 0.3;
          } else if (
            keywordRatio >= 0.1 &&
            coreKeywordTokenCountForRatio >= 2
          ) {
            // Need at least a couple of core keywords for a ratio boost
            confidenceScore += 0.2;
            strongSignalFound = true;
          }
        }
      }
    }
    // --- End Ratio Calculation ---

    // 1. Core DML/DDL Keywords (Original broad check for pattern matching, weight adjusted)
    // We use a broad regex here for pattern matching scores, but the ratio uses a stricter keyword set.
    const allKeywordsPatternForWeight = new RegExp(
      `\\b(${Array.from(this.allSqlKeywordsForPatterns).join("|")})\\b`,
      "gi",
    );
    const keywordPatternMatches = nonCommentContent.match(
      allKeywordsPatternForWeight,
    );
    if (keywordPatternMatches) {
      confidenceScore += 0.1; // Reduced base weight for general keyword presence
      confidenceScore += Math.min(keywordPatternMatches.length, 10) * 0.01; // Reduced per-match
      patternsMatched++;
      if (keywordPatternMatches.length > 3)
        actualKeywordHits = Math.max(
          actualKeywordHits,
          keywordPatternMatches.length,
        ); // Update if this found more
    }

    // 2. Common SQL Clauses and Secondary Structures (more specific regexes)
    const commonClausePatterns = [
      /* Mostly same as before, ensure weights are sensible */
      {
        pattern: /\b(INNER|LEFT|RIGHT|FULL)?\s*JOIN\b[\s\S]*?\bON\b/gi,
        weight: 0.15,
        perMatch: 0.02,
        specific: true,
      },
      {
        pattern: /\bGROUP\s+BY\b/gi,
        weight: 0.1,
        perMatch: 0.01,
        specific: true,
      },
      {
        pattern: /\bORDER\s+BY\b/gi,
        weight: 0.1,
        perMatch: 0.01,
        specific: true,
      },
      {
        pattern:
          /\b(PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|UNIQUE|NOT\s+NULL|CONSTRAINT)\b/gi,
        weight: 0.15,
        perMatch: 0.02,
        specific: true,
      },
      {
        pattern: /\b(CASE\s+WHEN\b[\s\S]*?\bTHEN\b[\s\S]*?\bEND)\b/gi,
        weight: 0.15,
        specific: true,
      }, // Full CASE WHEN THEN END
    ];

    for (const p of commonClausePatterns) {
      const source = p.pattern.source.includes("[\\s\\S]")
        ? content
        : nonCommentContent;
      const matches = source.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore += Math.min(matches.length, 5) * p.perMatch;
        }
        patternsMatched++;
        if (p.specific) strongSignalFound = true;
      }
    }

    // 3. SQL Comments
    if (/--.*/g.test(content)) {
      confidenceScore += 0.03;
      patternsMatched++;
    } // Reduced slightly
    if (/\/\*[\s\S]*?\*\//g.test(content)) {
      confidenceScore += 0.02;
      patternsMatched++;
    }

    // 4. Semicolons
    const semicolonCount = (nonCommentContent.match(/;/g) || []).length;
    if (semicolonCount > 0) {
      confidenceScore += Math.min(semicolonCount, 5) * 0.005;
      if (
        semicolonCount >= linesForAnalysis.length * 0.3 &&
        linesForAnalysis.length > 1
      ) {
        confidenceScore += 0.05;
        // strongSignalFound = true; // Semicolons alone aren't usually a "strong" specific signal
      }
      patternsMatched++;
    }

    // 6. Anti-patterns
    const antiPatterns = [
      /* ... same as before ... */ { pattern: /<\?php/i, weight: -0.8 },
      { pattern: /^\s*#include\s*<.+>/m, weight: -0.7 },
      { pattern: /(<html|<body|<div|<script)/i, weight: -0.6 },
      {
        pattern:
          /\b(function|class\s+\w+\s*\{|var\s+\w+\s*=|let\s+\w+\s*=|const\s+\w+\s*=)\b/i,
        weight: -0.5,
      },
      { pattern: /\bdef\s+\w+\s*\(.*?\):/m, weight: -0.6 },
      { pattern: /=>\s*\{/g, weight: -0.4 },
    ];
    if (
      linesForAnalysis.length > 5 &&
      actualKeywordHits < 2 &&
      (keywordRatio === -1 || keywordRatio < 0.05)
    ) {
      // Stricter: if very few keywords and low ratio
      let proseLines = 0;
      linesForAnalysis.slice(0, 10).forEach((line) => {
        const words = line.trim().split(/\s+/);
        if (
          words.length > 4 &&
          words.every((w) => /^[a-zA-Z'-]+$/.test(w) || w.length < 2) &&
          (line.endsWith(".") || line.endsWith("?"))
        ) {
          proseLines++;
        }
      });
      if (proseLines >= 2) {
        // If 2 or more lines look like prose
        confidenceScore *= 0.2; // Stronger penalty
      }
    }

    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
        confidenceScore += ap.weight * Math.min(matches.length, 2);
      }
    }

    // 7. Final Adjustments
    if (strongSignalFound && patternsMatched >= 1) {
      confidenceScore += 0.05; // Reduced general boost
    }
    if (linesStartingWithCoreKeyword > 0 && keywordRatio > 0.05) {
      // If lines start well AND ratio is okay
      confidenceScore += 0.15;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    let isMatch = false;
    // Stricter conditions for matching:
    if (strongSignalFound && confidenceScore >= 0.25) {
      // Need less confidence if a very SQL-specific structure was found
      isMatch = true;
    } else if (
      patternsMatched >= 2 &&
      keywordRatio >= 0.08 &&
      confidenceScore >= 0.3
    ) {
      // More patterns + okay ratio
      isMatch = true;
    } else if (
      linesStartingWithCoreKeyword >= 1 &&
      keywordRatio >= 0.05 &&
      confidenceScore >= 0.2
    ) {
      // Line starts + some ratio
      isMatch = true;
    }

    // Final critical override for substantial text with extremely low core keyword ratio,
    // and very few general keyword hits.
    if (
      isMatch &&
      keywordRatio !== -1 &&
      keywordRatio < 0.025 &&
      totalSignificantTokens > 60 &&
      actualKeywordHits < 4 &&
      linesStartingWithCoreKeyword < 1
    ) {
      //    console.log(`SQL Detector: Final override. Ratio: ${keywordRatio.toFixed(3)}, TotalTokens: ${totalSignificantTokens}, AllSQLKeywords: ${actualKeywordHits}, CoreStartLines: ${linesStartingWithCoreKeyword}`);
      isMatch = false;
    }
    if (confidenceScore < 0.1 && totalSignificantTokens > 40) {
      // If confidence is still abysmally low for decent text length
      isMatch = false;
    }

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && confidenceScore > 0.45, // Adjusted definitive
    };
  }

  getFileExtension(): string {
    return "sql";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;

    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }
    // Existing formatter from previous version (can be kept or refined)
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        let formattedSql = content;
        formattedSql = formattedSql
          .replace(/\s*([;,()])\s*/g, "$1 ")
          .replace(/\s*=\s*/g, " = ")
          .replace(/\s*(<>|!=|<=|>=|<|>)\s*/g, " $1 ")
          .replace(/\b(AND|OR)\b/gi, "\n  $1")
          .replace(/\b(SELECT\b.*?\bFROM)\b/gi, "\n$1")
          .replace(/\b(WHERE|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, "\n$1")
          .replace(
            /\b(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|JOIN)\b/gi,
            "\n  $1",
          )
          .replace(/\bON\b/gi, "\n    ON")
          .replace(/\b(INSERT INTO)\b/gi, "\n$1")
          .replace(/\bVALUES\b/gi, "\n  VALUES")
          .replace(/\b(UPDATE\b.*?\bSET)\b/gi, "\n$1")
          .replace(/\b(CREATE|ALTER|DROP)\s+(TABLE|VIEW|INDEX)\b/gi, "\n$1 $2")
          .replace(/;\s*/g, ";\n\n")
          .replace(/\n\s*\n+/g, "\n\n")
          .trim();
        let indentLevel = 0;
        const indentChar = "  ";
        const lines = formattedSql.split("\n");
        formattedSql = lines
          .map((line) => {
            const currentLine = line.trim();
            let indent = indentLevel;
            if (
              currentLine.match(
                /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|INSERT INTO|UPDATE|VALUES|SET|CREATE|ALTER|DROP|BEGIN)\b/i,
              ) ||
              currentLine.endsWith("(")
            ) {
            } else if (
              currentLine.match(/\b(END|COMMIT|ROLLBACK)\b/i) ||
              currentLine.startsWith(")")
            ) {
              indent = Math.max(0, indentLevel - 1);
            }
            const result = indentChar.repeat(indent) + currentLine;
            if (
              currentLine.match(
                /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|INSERT INTO|UPDATE|VALUES|SET|CREATE|ALTER|DROP|BEGIN)\b/i,
              ) ||
              currentLine.endsWith("(")
            ) {
              if (!currentLine.endsWith(";")) indentLevel++;
            } else if (
              currentLine.match(/\b(END|COMMIT|ROLLBACK)\b/i) ||
              currentLine.startsWith(")")
            ) {
              indentLevel = Math.max(
                0,
                indentLevel - (currentLine.startsWith(")") ? 1 : 0),
              );
            }
            if (currentLine.endsWith(";")) {
              indentLevel = Math.max(0, indentLevel - 1);
            }
            return result;
          })
          .join("\n");
        return [
          {
            range: model.getFullModelRange(),
            text: formattedSql,
          },
        ];
      },
    });
  }
}

// Create and register the detector
const sqlDetector = new SqlFormatDetector();
formatRegistry.register(sqlDetector);

// Export for backward compatibility (optional)
export const registerSqlProvider = (monaco: any) => {
  sqlDetector.registerProvider(monaco);
};
