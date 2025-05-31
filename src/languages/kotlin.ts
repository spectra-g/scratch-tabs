import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * Kotlin language detector
 */
export class KotlinLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'kotlin'; // Monaco's built-in ID for Kotlin
  name = 'Kotlin';
  extensions = ['kt', 'kts']; // .kt for Kotlin, .kts for Kotlin Script
  priority = 6; // Higher than Java due to more unique keywords like 'val', 'var', 'fun' at top level

  sampleContent(): string {
    return `package com.example.myapp

import kotlinx.coroutines.* // Coroutine import

// Data class
data class User(val id: Int, var name: String, val email: String?)

// Extension function
fun String.initials(): String {
    return this.split(' ')
        .filter { it.isNotEmpty() }
        .map { it.first().toUpperCase() }
        .joinToString("")
}

// Top-level function
fun main(args: Array<String>) = runBlocking { // Entry point
    println("Hello, Kotlin World!")

    // Variable declaration
    val immutableValue: String = "This is a val"
    var mutableValue: Int = 10
    mutableValue += 5

    val user = User(1, "John Doe", "john.doe@example.com")
    println("User: \${user.name}, Email: \${user.email ?: "N/A"}") // String template and elvis operator
    user.name = "Jane Doe"

    // Null safety and smart casts
    val nullableName: String? = null
    println(nullableName?.length) // Safe call
    println(nullableName ?: "Default Name") // Elvis operator

    // Coroutine launch
    launch {
        delay(1000L)
        println("World from coroutine!")
    }
    println("Hello from main thread,")

    // Collection and lambda
    val numbers = listOf(1, 2, 3, 4, 5)
    numbers.filter { it % 2 == 0 }
           .map { it * 2 }
           .forEach { println(it) }

    // When expression (like switch)
    val x = 10
    when (x) {
        1 -> println("x is 1")
        2, 3 -> println("x is 2 or 3")
        in 4..10 -> println("x is between 4 and 10")
        else -> println("x is something else")
    }

    val myInitials = "Richard Hendricks".initials()
    println("Initials: \$myInitials")
}`;
  }

  /**
   * Detects if the given content matches Kotlin patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 5) {
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;
    let specificKotlinHits = 0;

    // --- ANTI-PATTERNS for other languages (especially Scala) ---
    if (/^\s*#![^\r\n]*(scala|python|ruby|bash|sh)/i.test(trimmedContent)) { // Shebangs for other common scripts
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    
    // Strong stacktrace anti-pattern - if we see multiple "at" lines, this is likely a stacktrace
    const atFramePattern = /^\s*at\s+[\w$.]+/gm;
    const atFrameMatches = content.match(atFramePattern);
    if (atFrameMatches && atFrameMatches.length >= 3) {
      // 3 or more "at" frame lines strongly suggests stacktrace, not Kotlin
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    
    // Check for common stacktrace error patterns
    if (/^(?:[A-Za-z_][\w.$]*(?:Error|Exception|Panic|Traceback))/m.test(trimmedContent)) {
      // If it starts with an error/exception and has "at" frames, it's a stacktrace
      if (atFrameMatches && atFrameMatches.length >= 1) {
        return { match: false, confidence: 0.0, matchedDefinitive: false };
      }
    }
    
    if (/\b(case\s+class|case\s+object|trait)\b/g.test(content)) { // Strong Scala keywords
      confidenceScore -= 0.7; // Heavy penalty
    }
    if (/\bdef\s+[a-zA-Z_][\w!?=~<>*+\-%&^|]*\s*(?:\[[^\]]+\])?\s*(?:\([^)]*\))*\s*:\s*[\w\[\],.<>:]+\s*=/g.test(content) && !/\bfun\b/.test(content)) {
      // Scala `def foo(): Type =` and no `fun` keyword present
      confidenceScore -= 0.6;
    }
    if (/\s+with\s+[\w.:<>\[\]]+\s*\{/g.test(content)) { // Scala `with Trait {`
      confidenceScore -= 0.5;
    }
    if (/\bimport\s+[\w.]+\._\b/g.test(content)) { // Scala wildcard import `import foo._`
      confidenceScore -= 0.3;
    }
    if (/\bs(?:""|"|')/g.test(content) && !content.includes("$")) { // Scala s"" string interpolator without Kotlin's $
      confidenceScore -= 0.4;
    }
    // --- End Anti-Patterns ---


    // 1. Definitive Kotlin Keywords and Syntax
    const definitivePatterns = [
      { pattern: /^\s*package\s+[\w.]+/m, weight: 0.15, perMatch: 0.02, maxMatches: 1 }, // Less unique than Java's
      { pattern: /^\s*import\s+[\w.*]+(?:\s+as\s+\w+)?/m, weight: 0.1, perMatch: 0.01, maxMatches: 5 }, // Also less unique
      { pattern: /\bfun\s+[a-zA-Z_][\w<>.:,\s=?]*\s*\(/g, weight: 0.35, perMatch: 0.05, specific: true, maxMatches: 5 },
      { pattern: /\b(val|var)\s+[a-zA-Z_][\w<>.:,\s=?]*\s*(?::\s*[\w<>?.[\]]+)?\s*(?:=\s*[^;{\n]+|by\s+\w+)/g, weight: 0.3, perMatch: 0.05, specific: true, maxMatches: 10 }, // val/var name: Type = or val/var name by delegate
      { pattern: /\bdata\s+class\s+\w+/g, weight: 0.3, perMatch: 0.1, specific: true, maxMatches: 2 },
      { pattern: /\bobject\s+\w+(?:\s*:\s*[\w<>]+)?\s*(?:,\s*[\w<>]+)*\s*\{/g, weight: 0.25, perMatch: 0.05, specific: true, maxMatches: 2 }, // object Foo or object Bar : Baz
      { pattern: /\b(interface|enum\s+class|sealed\s+class|annotation\s+class)\s+\w+/g, weight: 0.2, perMatch: 0.05, specific: true, maxMatches: 3 },
      { pattern: /\$\{[^}]+\}/g, weight: 0.25, perMatch: 0.03, specific: true, maxMatches: 10 }, // String templates - only ${...} syntax
      { pattern: /\bwhen\s*(?:\([^)]*\))?\s*\{/g, weight: 0.2, perMatch: 0.03, specific: true, maxMatches: 3 },
      { pattern: /\w+\?\.|\w+\?\:|\w+!!/g, weight: 0.25, perMatch: 0.03, specific: true, maxMatches: 5 }, // Null safety ?. ?: !!
      { pattern: /\b(lateinit\s+var|lazy\s*(?:\{\s*\}|\bval\b))/g, weight: 0.3, perMatch: 0.1, specific: true, maxMatches: 2 },
      { pattern: /\b(?:suspend\s+fun|coroutineScope|launch|async|delay|runBlocking)\b/g, weight: 0.25, perMatch: 0.05, specific: true, maxMatches: 3 }, // Coroutines
      { pattern: /->\s*(?:\{|\w)/g, weight: 0.15, perMatch: 0.02, specific: true, maxMatches: 5 }, // Lambda arrow
      { pattern: /@(?:JvmStatic|JvmOverloads|JvmField|JvmName|file:|param:|field:|get:|set:)\b/g, weight: 0.15, perMatch: 0.03, specific: true, maxMatches: 3 }, // Common Kotlin annotations
      { pattern: /`[^`]+`/g, weight: 0.05, perMatch: 0.01, maxMatches: 3 },
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, dp.maxMatches || 5) * dp.perMatch;
        }
        patternsMatched++;
        if (dp.specific) {
          strongSignalFound = true;
          specificKotlinHits++;
        }
      }
    }

    // 2. Common constructs
    const commonKeywords = ["companion object", "override fun", "init", "constructor", "get", "set", "internal", "expect", "actual", "reified", "inline", "operator", "infix"];
    const commonKeywordsRegex = new RegExp(`\\b(?:${commonKeywords.join('|')})\\b`, "g");
    const commonMatches = content.match(commonKeywordsRegex);
    if (commonMatches) {
      confidenceScore += 0.1;
      confidenceScore += Math.min(commonMatches.length, 5) * 0.02;
      patternsMatched++;
    }

    // 3. Comments
    if (/\/\//.test(content) || /\/\*[\s\S]*?\*\//.test(content)) {
      confidenceScore += 0.02; // Low weight, common in many
    }

    // 4. Other Anti-patterns (already had some, ensure they don't conflict)
    const otherAntiPatterns = [
      { pattern: /System\.out\.println/i, weight: -0.5 }, // Java print
      { pattern: /^\s*#include\s*<.+>/m, weight: -0.7 },  // C/C++ include
      { pattern: /<\w.*?>/g, weight: -0.6 },            // HTML/XML tags
      { pattern: /^\s*def\s+\w+\s*\(.*?\)\s*:/m, weight: -0.7, except: /\bfun\b/ }, // Python def, ensure not confused with Kotlin fun
    ];

    for (const ap of otherAntiPatterns) {
      if (ap.except && ap.except.test(content)) continue;
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 5. Final Adjustments
    if (strongSignalFound && specificKotlinHits >= 2) {
      confidenceScore += 0.2;
    }
    if (content.includes("fun main(") && (content.includes("val ") || content.includes("var "))) {
      confidenceScore += 0.15;
      strongSignalFound = true;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = (strongSignalFound && specificKotlinHits >= 1 && confidenceScore >= 0.40) ||
      (specificKotlinHits >= 2 && confidenceScore >= 0.50) ||
      (patternsMatched >= 3 && confidenceScore >= 0.60 && !content.includes("def ")); // Higher bar if no strong signals

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && specificKotlinHits >= 2 && confidenceScore > 0.6
    };
  }

  getFileExtension(): string {
    return 'kt';
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'kotlin'

    // Monaco has built-in support for 'kotlin'.
    // You typically don't need to register a custom Monarch tokenizer or formatter.
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    // Kotlin formatting is usually handled by tools like ktlint or IntelliJ's formatter.
    // A simple regex-based formatter would be insufficient.
  }
}

// Create and register the detector
const kotlinDetector = new KotlinLanguageDetector();
languageRegistry.register(kotlinDetector);

// Export for backward compatibility (optional)
export const registerKotlinProvider = (monaco: any) => {
  kotlinDetector.registerProvider(monaco);
};