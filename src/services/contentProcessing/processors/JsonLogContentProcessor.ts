import { ContentProcessor, ContentProcessingResult, ContentProcessingContext } from "../types";

/**
 * Content processor for cleaning messy JSON log pastes
 * Handles common scenarios like:
 * - Lines with timestamp/level prefixes before JSON
 * - Double-escaped JSON strings
 * - Mixed content with some JSON lines and some plain text
 */
export class JsonLogContentProcessor implements ContentProcessor {
  id = "json-log-cleaner";
  name = "JSON Log Cleaner";
  priority = 95; // High priority, but below main JSON processor

  canProcess(content: string, context: ContentProcessingContext): boolean {
    // Only process pasted content that isn't already detected as ndjson or json
    if (!context.isFromPaste) {
      return false;
    }

    if (context.detectedLanguage === "ndjson" || context.detectedLanguage === "json") {
      return false;
    }

    const lines = content.split("\n").filter(line => line.trim().length > 0);
    
    // Need at least 2 lines
    if (lines.length < 2) {
      return false;
    }

    let linesStartingWithBrace = 0;
    let linesNotStartingWithBrace = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("{")) {
        linesStartingWithBrace++;
      } else if (trimmed.length > 0) {
        linesNotStartingWithBrace++;
      }
    }

    // Good heuristic: some lines start with { and some don't (indicating potential prefixes)
    return linesStartingWithBrace > 0 && linesNotStartingWithBrace > 0;
  }

  process(content: string, context: ContentProcessingContext): ContentProcessingResult {
    const lines = content.split("\n");
    const processedLines: string[] = [];
    let successfullyProcessedCount = 0;
    let totalNonEmptyLines = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // Keep empty lines
        processedLines.push(line);
        continue;
      }

      totalNonEmptyLines++;
      let processedLine = line;
      let wasProcessed = false;

      // Attempt 1: Try to unstringify (handle double-escaped JSON)
      try {
        const parsed = JSON.parse(trimmedLine);
        if (typeof parsed === "string") {
          // It's a stringified JSON, try to parse the inner string
          const innerParsed = JSON.parse(parsed);
          if (typeof innerParsed === "object" && innerParsed !== null) {
            processedLine = JSON.stringify(innerParsed);
            wasProcessed = true;
            successfullyProcessedCount++;
          }
        } else if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          // It's already a valid JSON object, just ensure it's compact
          processedLine = JSON.stringify(parsed);
          wasProcessed = true;
          successfullyProcessedCount++;
        }
      } catch (e) {
        // Attempt 2: Try to extract JSON from line with prefix
        const jsonMatch = trimmedLine.match(/[{\[].*/);
        if (jsonMatch) {
          const jsonPart = jsonMatch[0];
          try {
            const parsed = JSON.parse(jsonPart);
            if (typeof parsed === "object" && parsed !== null) {
              processedLine = JSON.stringify(parsed);
              wasProcessed = true;
              successfullyProcessedCount++;
            }
          } catch (e2) {
            // Keep original line if we can't process it
          }
        }
      }

      processedLines.push(processedLine);
    }

    // Only return processed content if we successfully processed a significant portion
    const successRatio = successfullyProcessedCount / Math.max(totalNonEmptyLines, 1);
    
    if (successRatio > 0.5 && successfullyProcessedCount > 1) {
      return {
        processed: true,
        content: processedLines.join("\n"),
        language: "ndjson",
        lockLanguage: true,
        metadata: {
          originalLines: totalNonEmptyLines,
          processedLines: successfullyProcessedCount,
          successRatio: Math.round(successRatio * 100),
        },
      };
    }

    // Not enough lines were processable
    return {
      processed: false,
      content,
    };
  }
}