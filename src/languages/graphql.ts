import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

/**
 * GraphQL language detector
 */
export class GraphqlLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "graphql"; // Monaco has built-in support for 'graphql'
  name = "GraphQL";
  extensions = ["graphql", "gql", "graphqls"]; // .graphqls for schema files
  priority = 6; // High priority due to distinctive syntax

  sampleContent(): string {
    return `# A simple query
query GetHero {
  hero {
    name
    appearsIn
  }
}

# A mutation with variables
mutation CreateReviewForEpisode($ep: Episode!, $review: ReviewInput!) {
  createReview(episode: $ep, review: $review) {
    stars
    commentary
  }
}

# Type definition
type Character {
  name: String!
  appearsIn: [Episode!]!
  friends: [Character]
}

# Interface definition
interface NamedEntity {
  name: String
}

# Enum definition
enum Episode {
  NEWHOPE
  EMPIRE
  JEDI
}

# Input object type
input ReviewInput {
  stars: Int!
  commentary: String
  favoriteColor: ColorInput
}

# Fragment definition
fragment comparisonFields on Character {
  name
  appearsIn
  friends {
    name
  }
}

# Schema definition (less common in query files, but possible)
schema {
  query: Query
  mutation: Mutation
}
`;
  }

  /**
   * Detects if the given content matches GraphQL patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) {
      // e.g., "type A {}"
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. Core GraphQL Keywords and Structures (Definitive)
    //    Searches for keywords typically at the start of a definition or block.
    //    The 'm' flag is important for ^ to match start of lines.
    const definitivePatterns = [
      {
        pattern:
          /^\s*(?:#.*\r?\n\s*)*\b(type|interface|enum|input|union|scalar)\s+[A-Z_][\w]*\s*(?:implements\s*&?\s*[\w&]+)?\s*\{/gm,
        weight: 0.4,
        perMatch: 0.15,
      },
      {
        pattern:
          /^\s*(?:#.*\r?\n\s*)*\b(query|mutation|subscription|fragment)\b(?:\s+[A-Z_][\w]*)?(?:\s*\(.*?\))?\s*\{/gm,
        weight: 0.35,
        perMatch: 0.1,
      },
      {
        pattern: /^\s*(?:#.*\r?\n\s*)*\bschema\s*\{/gm,
        weight: 0.4,
        perMatch: 0.1,
      },
      { pattern: /\.\.\.\s*on\s+\w+/g, weight: 0.2, perMatch: 0.05 }, // Inline fragments ... on Type
      { pattern: /\.\.\.\w+/g, weight: 0.15, perMatch: 0.03 }, // Fragment spread ...fragmentName
      { pattern: /@\w+(?:\s*\(.*?\))?/g, weight: 0.1, perMatch: 0.02 }, // Directives @deprecated, @include
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, 3) * dp.perMatch;
        }
        patternsMatched++;
        strongSignalFound = true;
      }
    }

    // 2. Field definitions (name: Type, name(arg: Type): Type)
    // This is a common pattern but can overlap with other languages if not careful.
    // We make it more specific by looking for capitalized types or basic scalars.
    const fieldPattern =
      /\b[a-z_][\w]*\s*(?:\([^)]*\))?\s*:\s*(?:[A-Z_][\w]*|String|Int|Float|Boolean|ID|\[.+\])!?/g;
    const fieldMatches = content.match(fieldPattern);
    if (fieldMatches && fieldMatches.length > 1) {
      // Require at least 2 field definitions
      confidenceScore += 0.15;
      confidenceScore += Math.min(fieldMatches.length, 10) * 0.02; // Add per-field bonus
      patternsMatched++;
      if (fieldMatches.length >= 3) strongSignalFound = true;
    }

    // 3. Comments (GraphQL uses # for comments)
    if (/^\s*#.*$/m.test(content)) {
      confidenceScore += 0.05; // Small boost for comments
      patternsMatched++;
    }

    // 4. Anti-patterns (syntax from other languages that GraphQL doesn't use)
    const antiPatterns = [
      { pattern: /<\w.*?>/g, weight: -0.5 }, // HTML/XML tags
      { pattern: /\b(function|class|var|let|const)\b/i, weight: -0.4 }, // JS/TS/Java keywords
      { pattern: /System\.out\.println/i, weight: -0.4 }, // Java print
      { pattern: /console\.log/i, weight: -0.3 }, // JavaScript console.log
      { pattern: /^\s*package\s+[\w.]+;/im, weight: -0.5 }, // Java package
      { pattern: /^\s*#include\s+<.+>/m, weight: -0.5 }, // C/C++ include
      { pattern: /:=/g, weight: -0.3 }, // Go assignment
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 5. Final Adjustments and Clamping
    if (patternsMatched > 2 && strongSignalFound) {
      confidenceScore += 0.1; // Bonus for multiple strong signals
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    // Requires at least one strong signal or a good combination of weaker ones.
    const isMatch =
      (strongSignalFound && confidenceScore >= 0.4) ||
      (patternsMatched >= 2 && confidenceScore > 0.5);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound,
    };
  }

  getFileExtension(): string {
    return "graphql";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'graphql'

    // Monaco has built-in support for 'graphql'
    // You typically don't need to register a custom Monarch tokenizer for it.
    // The built-in one is generally quite good.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // No custom formatter is usually provided for GraphQL in basic editors,
    // as formatting is often handled by tools like Prettier which understand the AST.
  }
}

// Create and register the detector
const graphqlDetector = new GraphqlLanguageDetector();
languageRegistry.register(graphqlDetector);

// Export for backward compatibility (optional)
export const registerGraphqlProvider = (monaco: any) => {
  graphqlDetector.registerProvider(monaco);
};
