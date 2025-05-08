import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Diff/patch language detector
 */
export class DiffLanguageDetector extends BaseLanguageDetector {
  id = 'diff'; // Use Monaco's built-in ID if possible
  name = 'Diff';
  extensions = ['diff', 'patch'];
  priority = 4;

  sampleContent(): string {
    return `diff --git a/example.txt b/example.txt
index 83db48f..bf269f1 100644
--- a/example.txt
+++ b/example.txt
@@ -1,3 +1,4 @@
-Line one removed
+Line one added
 Line two (context)
 Line three (context)
+Another added line`;
  }

  /**
   * Checks for common diff/patch file headers or change indicators.
   */
  isMatch(content: string): boolean {
    if (!content) return false;
    const trimmedContent = content.trim();
    // Check for various diff headers or line prefixes
    return (
      /^diff --git\s+/m.test(trimmedContent) ||    // Git diff header
      /^Index:\s+/m.test(trimmedContent) ||        // Index header
      /^---\s+/m.test(trimmedContent) ||           // Original file header
      /^\+\+\+\s+/m.test(trimmedContent) ||         // New file header
      /^@@\s*-\d+(?:,\d+)?\s*\+\d+(?:,\d+)?\s*@@/m.test(trimmedContent) || // Hunk header
      /^(?:[-+ ]|\\[Nn]o newline at end of file)/m.test(trimmedContent) // Line change indicators (-, +, space) or missing newline indicator
    );
  }

  /**
   * Registers the 'diff' language with Monaco using a Monarch tokenizer
   * that assigns standard token types likely styled by default themes like 'vs-dark'.
   */
  registerProvider(monaco: any): void {
    const languageId = this.id;

    // Register the language ID if it doesn't exist (Monaco usually includes 'diff')
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    monaco.languages.setMonarchTokensProvider(languageId, {
      tokenizer: {
        root: [
          // Headers - Assign potentially standard meta/comment/keyword tokens
          // These names are conventions, actual styling depends on the theme
          [/^diff --git .*$/, 'keyword'], // Often blue/purple
          [/^index .*$/, 'metatag'], // Often less distinct, maybe gray/white
          [/^--- .*$/, 'comment.doc'], // Often gray/greenish comment style
          [/^\+\+\+ .*$/, 'comment.doc'], // Often gray/greenish comment style
          [/^@@ .* @@.*$/, 'meta.diff.range'], // Often blue/violet, maybe bold

          // Added Lines (+) - Use standard Monaco token for insertions
          [/^\+.*/, 'markup.inserted.diff'], // Standard token, usually green

          // Removed Lines (-) - Use standard Monaco token for deletions
          [/^-.*/, 'markup.deleted.diff'], // Standard token, usually red/pink

          // Context Lines (Starting with space) - No specific token needed (default styling)
          [/^ .*/, ''],

          // Special indicators
          [/^\\.*/, 'comment'], // "\ No newline..." styled as comment

          // Default: Match any other line - prevents unstyled lines if context doesn't start with space
          [/^.*$/, '']
        ]
      }
    });

  }
}

// --- Registration ---
const diffDetector = new DiffLanguageDetector();
languageRegistry.register(diffDetector);

// Optional: Export for explicit registration if needed elsewhere
export const registerDiffProvider = (monaco: any) => {
  diffDetector.registerProvider(monaco);
};