import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * PHP language detector
 */
export class PhpFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "php"; // Monaco's built-in ID for PHP
  name = "PHP";
  extensions = ["php", "phtml", "php3", "php4", "php5", "phps"];
  priority = 5; // High priority due to its specific tags

  sampleContent(): string {
    return `<?php
declare(strict_types=1); // Strict types declaration

namespace App\\Services;

use App\\Models\\User; // Use statement
use Psr\\Log\\LoggerInterface; // Importing an interface

interface Notifiable {
    public function notify(string $message): bool;
}

abstract class BaseService {
    protected LoggerInterface $logger;

    public function __construct(LoggerInterface $logger) {
        $this->logger = $logger;
    }

    abstract protected function process(array $data): mixed;
}

class UserService extends BaseService implements Notifiable {
    public const DEFAULT_ROLE = 'subscriber';
    private array $users = [];

    public function __construct(LoggerInterface $logger) {
        parent::__construct($logger);
        $this->logger->info('UserService initialized');
    }

    public function createUser(string $name, string $email, string $password, string $role = self::DEFAULT_ROLE): ?User {
        if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->logger->error("Invalid input for user creation.");
            return null;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $user = new User(uniqid(), $name, $email, $hashedPassword, $role);
        $this->users[$user->getId()] = $user;
        
        $this->logger->info("User created: {$user->getName()}");
        return $user;
    }

    public function notify(string $message): bool {
        // Dummy notification logic
        echo "Notification: $message\\n";
        return true;
    }
    
    protected function process(array $data): mixed {
        if (!isset($data['userId'])) {
            throw new \\InvalidArgumentException("User ID is required.");
        }
        return $this->findUserById($data['userId']);
    }

    public function findUserById(string $id): ?User {
        return $this->users[$id] ?? null; // Null coalescing operator
    }
}

// Example usage
// $logger = new Monolog\\Logger('app'); // Assuming Monolog or similar
// $userService = new UserService($logger);
// $newUser = $userService->createUser("Jane Doe", "jane@example.com", "s3cr3tP@ss");

// if ($newUser) {
//     $userService->notify("Welcome {$newUser->getName()}!");
// }

// Arrow function example (PHP 7.4+)
$numbers = [1, 2, 3, 4];
$squared = array_map(fn($n) => $n * $n, $numbers);
// print_r($squared);

// Match expression (PHP 8.0+)
// $day = "Mon";
// $output = match ($day) {
//     "Mon" => "Monday",
//     "Tue" => "Tuesday",
//     default => "Other day",
// };
// echo $output;

?>
<!-- Some HTML might follow here -->
<p>This could be HTML content after PHP block.</p>
`;
  }

  detect(content: string): DetectionResult {
    const trimmedContentStart = content.trimStart(); // Only trim start for tag checks
    if (!trimmedContentStart) {
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let hasPhpTags = false;
    let isDefinitivePhp = false;

    // 1. Check for PHP opening tags (very strong indicator)
    const openTagMatch = trimmedContentStart.match(/^<\?(?:php|=)?/i); // Anchor to start
    if (openTagMatch) {
      hasPhpTags = true;
      confidenceScore = 0.75; // High base confidence for any PHP tag
      // Don't increment patternsMatched here - only count actual PHP content patterns
      isDefinitivePhp = true; // Opening tag is a definitive signal

      if (openTagMatch[0] === "<?=") {
        confidenceScore += 0.15; // Short echo tag is very PHP specific
      } else if (trimmedContentStart.startsWith("<?php")) {
        confidenceScore += 0.1; // Standard opening tag
      }
    } else {
      // If no PHP opening tag at the very start, it's extremely unlikely to be PHP
      // unless it's an included file without tags, which this detector can't reliably identify.
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    // 2. Common PHP keywords and syntax elements
    //    Only add to confidence if PHP tags were already found.
    const phpPatterns = [
      {
        pattern: /\b(class|interface|trait|enum)\s+[A-Z_][\w]*/g,
        weight: 0.05,
        perMatch: 0.02,
        maxMatches: 3,
      },
      {
        pattern: /\b(function|fn)\s+(?:&?\s*[a-zA-Z_][\w]*)?\s*\(/g,
        weight: 0.05,
        perMatch: 0.02,
        maxMatches: 5,
      },
      {
        pattern: /\$(this|self|static)\s*->\s*\w+/g,
        weight: 0.08,
        perMatch: 0.03,
        maxMatches: 5,
      },
      {
        pattern: /\$\w+\s*=\s*new\s+\w+/g,
        weight: 0.05,
        perMatch: 0.01,
        maxMatches: 3,
      },
      {
        pattern:
          /\b(public|private|protected|static|abstract|final)\s+(?:function|const|\$)/g,
        weight: 0.06,
        perMatch: 0.02,
        maxMatches: 5,
      },
      {
        pattern: /\b(namespace|use)\s+[\w\\]+;/g,
        weight: 0.08,
        perMatch: 0.03,
        maxMatches: 3,
      },
      { pattern: /::\w+/g, weight: 0.04, perMatch: 0.01, maxMatches: 5 },
      {
        pattern:
          /\b(echo|print|isset|unset|empty|require|include|die|exit)\b(?!["'=])/g,
        weight: 0.05,
        perMatch: 0.01,
        maxMatches: 10,
      },
      {
        pattern: /\$\w+(?:\[.*?\])?/g,
        weight: 0.03,
        perMatch: 0.005,
        maxMatches: 20,
      }, // Variables are very common
      {
        pattern:
          /\b(if|else|elseif|foreach|for|while|do|switch|case|break|continue|return|try|catch|finally|throw|match)\b/g,
        weight: 0.02,
        perMatch: 0.002,
        maxMatches: 10,
      },
      { pattern: /->\w+\s*\(/g, weight: 0.05, perMatch: 0.01, maxMatches: 5 },
      {
        pattern: /declare\s*\(\s*strict_types\s*=\s*1\s*\)\s*;/g,
        weight: 0.1,
        perMatch: 0.05,
        maxMatches: 1,
      },
    ];

    if (hasPhpTags) {
      // Only evaluate these if PHP tags were found
      for (const p of phpPatterns) {
        const matches = content.match(p.pattern);
        if (matches) {
          confidenceScore += p.weight;
          if (p.perMatch) {
            confidenceScore +=
              Math.min(matches.length, p.maxMatches || 5) * p.perMatch;
          }
          patternsMatched++;
        }
      }
    }

    // 3. Closing tag `?>`
    if (/\?>/.test(content)) {
      confidenceScore += 0.05; // Small boost, less common in modern code but still valid
      patternsMatched++;
    }

    // 4. Anti-Patterns (less critical if PHP tags are present, but can help refine)
    //    These are more to prevent PHP from matching if it *only* had a `<?` but then looked like something else.
    if (confidenceScore < 0.8) {
      // Only apply anti-patterns if not already super confident
      const antiPatterns = [
        { pattern: /^\s*#include\s*<.+>/m, weight: -0.5 },
        {
          pattern:
            /^\s*import\s+(?:{[\s\S]*?}|[\w*]+)\s+from\s*['"].*?['"];?/gm,
          weight: -0.4,
        },
        { pattern: /System\.out\.println/i, weight: -0.4 },
        { pattern: /console\.log/i, weight: -0.3 },
      ];
      for (const ap of antiPatterns) {
        if (ap.pattern.test(content)) {
          confidenceScore += ap.weight;
        }
      }
    }

    // 5. Final Adjustments and Clamping
    if (patternsMatched > 3 && hasPhpTags) {
      confidenceScore += 0.1;
    }
    if (
      content.includes("<?php") &&
      content.includes("class ") &&
      content.includes("$this->")
    ) {
      confidenceScore += 0.1;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // PHP match is primarily determined by the presence of PHP tags and a reasonable overall score.
    // Require more than just the opening tag - need some actual PHP content
    const isMatch = hasPhpTags && confidenceScore >= 0.55 && patternsMatched > 0;

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isDefinitivePhp && isMatch && confidenceScore > 0.7, // Definitive if tags + high score
    };
  }

  getFileExtension(): string {
    return "php";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'php'

    // Monaco has built-in support for 'php'.
    // You usually don't need to register a custom Monarch tokenizer or formatter.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // The basic formatter you had can be a starting point if Monaco's default
    // isn't active or if you want very simple heuristic indenting.
    // Proper PHP formatting often relies on tools like PHP CS Fixer or Prettier with PHP plugin.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let indentLevel = 0;
        const indentChar = "    "; // Common: 4 spaces for PHP

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          let currentIndent = "";

          // Heuristic: Decrease indent for closing braces/parens/brackets
          // and for 'case'/'default' if not the first statement in switch.
          if (
            trimmedLine.match(/^(\}|\]|\))/) ||
            (trimmedLine.match(/^(case\b|default\b)/) &&
              indentLevel > 0 &&
              !line.match(/^\s*(switch|{)/)) // Avoid de-denting case after switch
          ) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          currentIndent = indentChar.repeat(indentLevel);
          const formattedLine = trimmedLine ? currentIndent + trimmedLine : "";

          // Heuristic: Increase indent after opening braces/parens/brackets
          // and after case/default labels.
          if (
            trimmedLine.endsWith("{") ||
            trimmedLine.endsWith("(") ||
            trimmedLine.endsWith("[")
          ) {
            indentLevel++;
          } else if (trimmedLine.match(/^(case\b|default\b).*:/)) {
            indentLevel++;
          }

          return formattedLine;
        });

        return [
          {
            range: model.getFullModelRange(),
            text:
              formattedLines.join("\n").trimEnd() +
              (content.endsWith("\n") &&
              formattedLines.join("\n").trimEnd() !== ""
                ? "\n"
                : ""),
          },
        ];
      },
    });
  }
}

// Create and register the detector
const phpDetector = new PhpFormatDetector();
formatRegistry.register(phpDetector);

// Export for backward compatibility (optional)
export const registerPhpProvider = (monaco: any) => {
  phpDetector.registerProvider(monaco);
};
