// Text analysis utilities for word count statistics
// Pure functions with no React dependencies

// Device configuration for reading time and layout calculations
export type DeviceType = 'standard' | 'desktop' | 'tablet' | 'mobile';
export type WritingGoal = 'general' | 'technical' | 'blog' | 'academic';

export interface WritingTarget {
  fleschKincaidMin: number;
  fleschKincaidMax: number;
  avgSentenceLengthMax: number;
  passiveVoiceMax: number;
  adverbsMax: number;
  keywordDensityMin: number;
  keywordDensityMax: number;
}

export const DEVICE_CONFIGS: Record<DeviceType, {
  viewportWidth: number;
  viewportHeight: number;
  avgCharWidth: number;
  lineHeight: number;
  readingWPM: number;
}> = {
  standard: {
    viewportWidth: 800,
    viewportHeight: 600,
    avgCharWidth: 8,
    lineHeight: 20,
    readingWPM: 225,
  },
  desktop: {
    viewportWidth: 1200,
    viewportHeight: 800,
    avgCharWidth: 8,
    lineHeight: 22,
    readingWPM: 240, // Fast but potential for distractions
  },
  tablet: {
    viewportWidth: 768,
    viewportHeight: 1024,
    avgCharWidth: 9,
    lineHeight: 24,
    readingWPM: 255, // Fastest - focused, comfortable reading experience
  },
  mobile: {
    viewportWidth: 375,
    viewportHeight: 667,
    avgCharWidth: 10,
    lineHeight: 26,
    readingWPM: 260, // Faster for mobile scanning behavior
  },
};

// Common English stop words for keyword density filtering
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'would', 'you', 'your', 'i', 'me',
  'my', 'we', 'us', 'our', 'they', 'them', 'their', 'she', 'her',
  'him', 'his', 'this', 'these', 'those', 'but', 'or', 'not', 'can',
  'could', 'should', 'would', 'have', 'had', 'do', 'does', 'did',
  'been', 'being', 'am', 'were', 'what', 'when', 'where', 'who',
  'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here', 'there',
  'up', 'out', 'down', 'off', 'over', 'under', 'again', 'further',
  'once', 'also', 'if', 'because', 'while', 'during', 'before',
  'after', 'above', 'below', 'between', 'through', 'into', 'onto'
]);

export interface LLMTokenCounts {
  gpt35: number;
  gpt4: number;
  claude: number;
  llama: number;
  gemini: number;
}

export interface WordCountStats {
  // Core counts
  words: number;
  uniqueWords: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  
  // Averages & lengths
  longestSentence: number;
  shortestSentence: number;
  avgSentenceLength: number;
  avgSentenceLengthChars: number;
  avgWordLength: number;
  
  // Readability & time
  syllables: number;
  fleschKincaidGrade: number;
  gunningFogIndex: number;
  smogIndex: number;
  colemanLiauIndex: number;
  lexicalDensity: number;
  readingTime: { minutes: number; seconds: number };
  speakingTime: { minutes: number; seconds: number };
  handwritingTime: { hours: number; minutes: number };
  
  // LLM token counts
  llmTokens: LLMTokenCounts;
  
  // SEO & keywords
  topKeywords: Array<{ word: string; count: number; density: number }>;
  topBigrams: Array<{ phrase: string; count: number; density: number }>;
  topTrigrams: Array<{ phrase: string; count: number; density: number }>;
  targetKeywordDensity?: { count: number; density: number }; // Added for specific target keyword
  
  // Stylistic analysis
  passiveVoiceSentences: Array<{ sentence: string; startIndex: number; endIndex: number }>;
  adverbs: Array<{ word: string; startIndex: number; endIndex: number }>;
  weakeningPhrases: Array<{ phrase: string; startIndex: number; endIndex: number }>;
  fillerWords: Array<{ word: string; startIndex: number; endIndex: number }>;
  redundantPhrases: Array<{ phrase: string; startIndex: number; endIndex: number }>;
  longSentences: Array<{ sentence: string; startIndex: number; endIndex: number }>;
  
  // Punctuation analysis
  questionCount: number;
  exclamationCount: number;
  
  // Device-specific metrics
  pages: number;
  screenfuls: number;
  wallOfTextParagraphs: Array<{ startIndex: number; endIndex: number }>;
}

export const WRITING_TARGETS: Record<WritingGoal, WritingTarget> = {
  general: {
    fleschKincaidMin: 6,
    fleschKincaidMax: 10,
    avgSentenceLengthMax: 20,
    passiveVoiceMax: 10,
    adverbsMax: 5,
    keywordDensityMin: 0.5,
    keywordDensityMax: 2.0
  },
  technical: {
    fleschKincaidMin: 10,
    fleschKincaidMax: 15,
    avgSentenceLengthMax: 25,
    passiveVoiceMax: 15,
    adverbsMax: 8,
    keywordDensityMin: 1.0,
    keywordDensityMax: 3.0
  },
  blog: {
    fleschKincaidMin: 5,
    fleschKincaidMax: 8,
    avgSentenceLengthMax: 15,
    passiveVoiceMax: 5,
    adverbsMax: 3,
    keywordDensityMin: 1.0,
    keywordDensityMax: 2.5
  },
  academic: {
    fleschKincaidMin: 12,
    fleschKincaidMax: 18,
    avgSentenceLengthMax: 30,
    passiveVoiceMax: 20,
    adverbsMax: 10,
    keywordDensityMin: 0.5,
    keywordDensityMax: 1.5
  }
};

/**
 * Count words in text, handling punctuation and edge cases
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  
  // Split by whitespace and filter out empty strings
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words.length;
}

/**
 * Count unique words (case-insensitive)
 */
export function countUniqueWords(text: string): number {
  if (!text.trim()) return 0;
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return new Set(words).size;
}

/**
 * Count characters including spaces
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Count characters excluding spaces
 */
export function countCharactersNoSpaces(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * Count sentences, handling abbreviations and edge cases
 */
export function countSentences(text: string): number {
  if (!text.trim()) return 0;
  
  // Common abbreviations that shouldn't end sentences
  const abbreviations = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd|Corp|Co|St|Ave|Blvd|Rd|Apt|No|Vol|Ch|Fig|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun|AM|PM|a\.m|p\.m|i\.e|e\.g|cf|viz|al|et)\./gi;
  
  // Replace abbreviations with placeholders to avoid false sentence breaks
  let processedText = text.replace(abbreviations, (match) => 
    match.replace('.', '___DOT___')
  );
  
  // Count sentence-ending punctuation
  const sentences = processedText.match(/[.!?]+/g);
  return sentences ? sentences.length : 0;
}

/**
 * Count paragraphs (separated by double line breaks)
 */
export function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  
  // Split by double line breaks and filter out empty paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter(para => para.trim().length > 0);
  
  return paragraphs.length;
}

/**
 * Count lines (including empty lines)
 */
export function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Get sentences as an array for analysis
 */
export function getSentences(text: string): string[] {
  if (!text.trim()) return [];
  
  // Handle abbreviations
  const abbreviations = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd|Corp|Co|St|Ave|Blvd|Rd|Apt|No|Vol|Ch|Fig|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun|AM|PM|a\.m|p\.m|i\.e|e\.g|cf|viz|al|et)\./gi;
  
  let processedText = text.replace(abbreviations, (match) => 
    match.replace('.', '___DOT___')
  );
  
  // Split by sentence-ending punctuation
  const sentences = processedText
    .split(/[.!?]+/)
    .map(sentence => sentence.replace(/___DOT___/g, '.').trim())
    .filter(sentence => sentence.length > 0);
  
  return sentences;
}

/**
 * Calculate longest sentence in words
 */
export function getLongestSentence(text: string): number {
  const sentences = getSentences(text);
  if (sentences.length === 0) return 0;
  
  return Math.max(...sentences.map(sentence => countWords(sentence)));
}

/**
 * Calculate shortest sentence in words
 */
export function getShortestSentence(text: string): number {
  const sentences = getSentences(text);
  if (sentences.length === 0) return 0;
  
  return Math.min(...sentences.map(sentence => countWords(sentence)));
}

/**
 * Calculate average sentence length in words
 */
export function getAvgSentenceLength(text: string): number {
  const sentences = getSentences(text);
  if (sentences.length === 0) return 0;
  
  const totalWords = sentences.reduce((sum, sentence) => sum + countWords(sentence), 0);
  return Math.round((totalWords / sentences.length) * 10) / 10;
}

/**
 * Calculate average sentence length in characters
 */
export function getAvgSentenceLengthChars(text: string): number {
  const sentences = getSentences(text);
  if (sentences.length === 0) return 0;
  
  const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  return Math.round((totalChars / sentences.length) * 10) / 10;
}

/**
 * Calculate average word length in characters
 */
export function getAvgWordLength(text: string): number {
  if (!text.trim()) return 0;
  
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  if (words.length === 0) return 0;
  
  const totalChars = words.reduce((sum, word) => sum + word.length, 0);
  return Math.round((totalChars / words.length) * 10) / 10;
}

/**
 * Count syllables in a word using regex-based approach
 */
export function countSyllablesInWord(word: string): number {
  if (!word) return 0;
  
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  
  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let syllables = vowelGroups ? vowelGroups.length : 0;
  
  // Subtract silent 'e' at the end
  if (word.endsWith('e') && syllables > 1) {
    syllables--;
  }
  
  // Handle special cases
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    syllables++;
  }
  
  // Ensure at least 1 syllable
  return Math.max(1, syllables);
}

/**
 * Count total syllables in text
 */
export function countSyllables(text: string): number {
  if (!text.trim()) return 0;
  
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words.reduce((total, word) => total + countSyllablesInWord(word), 0);
}

/**
 * Calculate Flesch-Kincaid Grade Level
 */
export function calculateFleschKincaidGrade(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const syllables = countSyllables(text);
  
  if (sentences === 0 || words === 0) return 0;
  
  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  const grade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
  return Math.round(Math.max(0, grade) * 10) / 10;
}

/**
 * Count complex words (3+ syllables)
 */
export function countComplexWords(text: string): number {
  if (!text.trim()) return 0;
  
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words.filter(word => countSyllablesInWord(word) >= 3).length;
}

/**
 * Calculate Gunning Fog Index
 */
export function calculateGunningFogIndex(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const complexWords = countComplexWords(text);
  
  if (sentences === 0 || words === 0) return 0;
  
  const avgSentenceLength = words / sentences;
  const complexWordPercentage = (complexWords / words) * 100;
  
  const fogIndex = 0.4 * (avgSentenceLength + complexWordPercentage);
  return Math.round(Math.max(0, fogIndex) * 10) / 10;
}

/**
 * Calculate SMOG Index (requires polysyllabic words - 3+ syllables)
 */
export function calculateSmogIndex(text: string): number {
  const sentences = countSentences(text);
  const polysyllabicWords = countComplexWords(text); // Same as complex words
  
  if (sentences === 0) return 0;
  
  // SMOG formula: 3 + sqrt((polysyllabic words * 30) / sentences)
  const smogIndex = 3 + Math.sqrt((polysyllabicWords * 30) / sentences);
  return Math.round(Math.max(0, smogIndex) * 10) / 10;
}

/**
 * Calculate Coleman-Liau Index
 */
export function calculateColemanLiauIndex(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const characters = text.replace(/\s/g, '').length;
  
  if (words === 0) return 0;
  
  // Coleman-Liau formula: 0.0588 * L - 0.296 * S - 15.8
  // Where L = average letters per 100 words, S = average sentences per 100 words
  const avgLettersPer100Words = (characters / words) * 100;
  const avgSentencesPer100Words = (sentences / words) * 100;
  
  const cliIndex = 0.0588 * avgLettersPer100Words - 0.296 * avgSentencesPer100Words - 15.8;
  return Math.round(Math.max(0, cliIndex) * 10) / 10;
}

/**
 * Calculate lexical density (uniqueWords / totalWords * 100)
 */
export function calculateLexicalDensity(text: string): number {
  const totalWords = countWords(text);
  const uniqueWords = countUniqueWords(text);
  
  if (totalWords === 0) return 0;
  
  const density = (uniqueWords / totalWords) * 100;
  return Math.round(density * 100) / 100; // 2 decimal places
}

// Common filler words that weaken writing
const FILLER_WORDS = new Set([
  'just', 'really', 'basically', 'actually', 'quite', 'very', 'rather',
  'pretty', 'somewhat', 'kind of', 'sort of', 'a bit', 'a little',
  'totally', 'completely', 'absolutely', 'definitely', 'certainly',
  'obviously', 'clearly', 'literally', 'honestly', 'frankly',
  'simply', 'merely', 'only', 'even', 'still', 'yet', 'already',
  'perhaps', 'maybe', 'probably', 'possibly', 'apparently',
  'seemingly', 'supposedly', 'allegedly', 'virtually', 'essentially'
]);

/**
 * Detect filler words in text with their positions
 */
export function detectFillerWords(text: string): Array<{ word: string; startIndex: number; endIndex: number }> {
  const results: Array<{ word: string; startIndex: number; endIndex: number }> = [];
  
  if (!text.trim()) return results;
  
  // Handle multi-word filler phrases first
  const multiWordFillers = ['kind of', 'sort of', 'a bit', 'a little'];
  multiWordFillers.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        word: phrase,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });
  
  // Then handle single words
  const singleWordFillers = Array.from(FILLER_WORDS).filter(word => !word.includes(' '));
  singleWordFillers.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Skip if this position is already covered by a multi-word phrase
      const alreadyCovered = results.some(result => 
        match.index >= result.startIndex && match.index < result.endIndex
      );
      
      if (!alreadyCovered) {
        results.push({
          word: word,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
  });
  
  return results.sort((a, b) => a.startIndex - b.startIndex);
}

// Common redundant phrases
const REDUNDANT_PHRASES = [
  'each and every', 'absolutely essential', 'completely surrounded',
  'totally unique', 'very unique', 'exact same', 'completely finished',
  'end result', 'final outcome', 'advance planning', 'future plans',
  'past history', 'true facts', 'close proximity', 'general consensus',
  'mutual cooperation', 'personal opinion', 'serious crisis',
  'terrible tragedy', 'unexpected surprise', 'added bonus',
  'first priority', 'join together', 'merge together', 'combine together',
  'connect together', 'gather together', 'mix together', 'blend together'
];

/**
 * Detect redundant phrases in text with their positions
 */
export function detectRedundantPhrases(text: string): Array<{ phrase: string; startIndex: number; endIndex: number }> {
  const results: Array<{ phrase: string; startIndex: number; endIndex: number }> = [];
  
  if (!text.trim()) return results;
  
  REDUNDANT_PHRASES.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        phrase: phrase,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });
  
  return results.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Find long sentences that may be run-on sentences
 */
export function findLongSentences(text: string, wordThreshold: number = 35): Array<{ sentence: string; startIndex: number; endIndex: number }> {
  const results: Array<{ sentence: string; startIndex: number; endIndex: number }> = [];
  
  if (!text.trim()) return results;
  
  // Split text into sentences with their positions
  const sentenceRegex = /[.!?]+/g;
  let lastIndex = 0;
  let match;
  
  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = text.slice(lastIndex, match.index + match[0].length).trim();
    
    if (sentence) {
      // Count words in this sentence
      const words = sentence.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 0);
      
      if (words.length > wordThreshold) {
        results.push({
          sentence: sentence,
          startIndex: lastIndex,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Handle the last sentence if it doesn't end with punctuation
  if (lastIndex < text.length) {
    const sentence = text.slice(lastIndex).trim();
    if (sentence) {
      const words = sentence.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 0);
      
      if (words.length > wordThreshold) {
        results.push({
          sentence: sentence,
          startIndex: lastIndex,
          endIndex: text.length
        });
      }
    }
  }
  
  return results;
}

/**
 * Count question marks in text
 */
export function countQuestions(text: string): number {
  if (!text.trim()) return 0;
  
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

/**
 * Count exclamation marks in text
 */
export function countExclamations(text: string): number {
  if (!text.trim()) return 0;
  
  const matches = text.match(/!/g);
  return matches ? matches.length : 0;
}

/**
 * Estimate token count for GPT-3.5/4 models
 * Based on approximation: ~4 characters per token for English text
 */
export function estimateGPTTokens(text: string): number {
  if (!text.trim()) return 0;
  
  // More accurate approximation accounting for:
  // - Whitespace and punctuation
  // - Word boundaries
  // - Special characters
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const approximateTokens = Math.ceil(cleanText.length / 4);
  
  // Add slight buffer for tokenizer overhead
  return Math.max(1, Math.ceil(approximateTokens * 1.1));
}

/**
 * Estimate token count for Claude models
 * Claude tends to be slightly more efficient than GPT models
 */
export function estimateClaudeTokens(text: string): number {
  if (!text.trim()) return 0;
  
  // Claude is roughly 10-15% more efficient in tokenization
  const gptEstimate = estimateGPTTokens(text);
  return Math.max(1, Math.ceil(gptEstimate * 0.9));
}

/**
 * Estimate token count for LLaMA models
 * Similar to GPT but with different tokenizer characteristics
 */
export function estimateLlamaTokens(text: string): number {
  if (!text.trim()) return 0;
  
  // LLaMA tends to be slightly less efficient than GPT
  const gptEstimate = estimateGPTTokens(text);
  return Math.max(1, Math.ceil(gptEstimate * 1.05));
}

/**
 * Estimate token count for Google Gemini models
 * Similar efficiency to Claude
 */
export function estimateGeminiTokens(text: string): number {
  if (!text.trim()) return 0;
  
  // Gemini has similar efficiency to Claude
  const gptEstimate = estimateGPTTokens(text);
  return Math.max(1, Math.ceil(gptEstimate * 0.92));
}

/**
 * Calculate LLM token counts for all major models
 */
export function calculateLLMTokens(text: string): LLMTokenCounts {
  const safeText = text ?? '';
  
  if (!safeText.trim()) {
    return {
      gpt35: 0,
      gpt4: 0,
      claude: 0,
      llama: 0,
      gemini: 0
    };
  }
  
  const gptTokens = estimateGPTTokens(safeText);
  
  return {
    gpt35: gptTokens,
    gpt4: gptTokens, // GPT-4 uses same tokenizer as GPT-3.5
    claude: estimateClaudeTokens(safeText),
    llama: estimateLlamaTokens(safeText),
    gemini: estimateGeminiTokens(safeText)
  };
}

/**
 * Get sentence length distribution grouped into buckets
 */
export function getSentenceLengthDistribution(text: string): Array<{ bucket: string; count: number }> {
  if (!text.trim()) return [];
  
  // Get all sentences with their word counts
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(sentence => {
      const words = sentence.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 0);
      return words.length;
    });
  
  // Define buckets
  const buckets = [
    { range: '1-5 words', min: 1, max: 5 },
    { range: '6-10 words', min: 6, max: 10 },
    { range: '11-15 words', min: 11, max: 15 },
    { range: '16-20 words', min: 16, max: 20 },
    { range: '21-25 words', min: 21, max: 25 },
    { range: '26-30 words', min: 26, max: 30 },
    { range: '31+ words', min: 31, max: Infinity }
  ];
  
  // Count sentences in each bucket
  const distribution = buckets.map(bucket => ({
    bucket: bucket.range,
    count: sentences.filter(length => length >= bucket.min && length <= bucket.max).length
  }));
  
  // Only return buckets that have at least one sentence
  return distribution.filter(item => item.count > 0);
}

/**
 * Calculate reading time (225 WPM average)
 */
export function calculateReadingTime(text: string): { minutes: number; seconds: number } {
  const words = countWords(text);
  const totalSeconds = Math.round((words / 225) * 60);
  
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  };
}

/**
 * Calculate speaking time (180 WPM average)
 */
export function calculateSpeakingTime(text: string): { minutes: number; seconds: number } {
  const words = countWords(text);
  const totalSeconds = Math.round((words / 180) * 60);
  
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  };
}

/**
 * Calculate handwriting time (13 WPM average)
 */
export function calculateHandwritingTime(text: string): { hours: number; minutes: number } {
  const words = countWords(text);
  const totalMinutes = Math.round(words / 13);
  
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60
  };
}

/**
 * Get word frequency map (excluding stop words)
 */
export function getWordFrequency(text: string): Map<string, number> {
  const frequency = new Map<string, number>();
  
  if (!text.trim()) return frequency;
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOP_WORDS.has(word));
  
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  
  return frequency;
}

/**
 * Get n-gram frequency (2-word or 3-word phrases)
 */
export function getNGramFrequency(text: string, n: number): Map<string, number> {
  const frequency = new Map<string, number>();
  
  if (!text.trim()) return frequency;
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n);
    
    // Skip n-grams that are entirely stop words
    if (ngram.every(word => STOP_WORDS.has(word))) continue;
    
    const phrase = ngram.join(' ');
    frequency.set(phrase, (frequency.get(phrase) || 0) + 1);
  }
  
  return frequency;
}

/**
 * Get top keywords with density
 */
export function getTopKeywords(text: string, limit: number = 5): Array<{ word: string; count: number; density: number }> {
  const frequency = getWordFrequency(text);
  const totalWords = countWords(text);
  
  if (totalWords === 0) return [];
  
  return Array.from(frequency.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / totalWords) * 10000) / 100 // Percentage with 2 decimal places
    }));
}

/**
 * Calculate keyword density for any specific keyword (even if not in top keywords)
 */
export function calculateKeywordDensity(text: string, keyword: string): { count: number; density: number } {
  const safeText = text ?? '';
  const safeKeyword = keyword ?? '';
  
  if (!safeText || !safeKeyword) return { count: 0, density: 0 };
  
  // Count all words including stop words for total word count
  const allWords = safeText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  const totalWords = allWords.length;
  if (totalWords === 0) return { count: 0, density: 0 };
  
  // Count occurrences of the specific keyword
  const keywordLower = safeKeyword.toLowerCase();
  const count = allWords.filter(word => word === keywordLower).length;
  
  const density = Math.round((count / totalWords) * 10000) / 100; // Percentage with 2 decimal places
  
  return { count, density };
}

/**
 * Get top n-grams with density
 */
export function getTopNGrams(text: string, n: number, limit: number = 5): Array<{ phrase: string; count: number; density: number }> {
  const frequency = getNGramFrequency(text, n);
  const totalWords = countWords(text);
  
  if (totalWords === 0) return [];
  
  return Array.from(frequency.entries())
    .filter(([, count]) => count >= 2) // Only show phrases with 2 or more occurrences
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([phrase, count]) => ({
      phrase,
      count,
      density: Math.round((count / totalWords) * 10000) / 100 // Percentage with 2 decimal places
    }));
}

/**
 * Find all instances of a keyword or phrase in text with their positions
 */
export function findKeywordInstances(text: string, keyword: string): Array<{ word: string; startIndex: number; endIndex: number }> {
  const instances: Array<{ word: string; startIndex: number; endIndex: number }> = [];
  const safeText = text ?? '';
  const safeKeyword = keyword ?? '';
  
  if (!safeText || !safeKeyword) return instances;
  
  // Escape special regex characters in the keyword
  const escapedKeyword = safeKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex with word boundaries to match whole words only
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
  let match;
  
  while ((match = regex.exec(safeText)) !== null) {
    instances.push({
      word: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return instances;
}

/**
 * Find the longest sentence with its position in the text
 */
export function findLongestSentence(text: string): { sentence: string; startIndex: number; endIndex: number } | null {
  const safeText = text ?? '';
  if (!safeText.trim()) return null;
  
  const sentences = getSentences(safeText);
  if (sentences.length === 0) return null;
  
  let longestSentence = '';
  let longestWordCount = 0;
  let longestIndex = -1;
  
  sentences.forEach((sentence, index) => {
    const wordCount = countWords(sentence);
    if (wordCount > longestWordCount) {
      longestWordCount = wordCount;
      longestSentence = sentence;
      longestIndex = index;
    }
  });
  
  if (longestIndex === -1) return null;
  
  // Find the position of this sentence in the original text
  const startIndex = safeText.indexOf(longestSentence);
  const endIndex = startIndex + longestSentence.length;
  
  return {
    sentence: longestSentence,
    startIndex,
    endIndex
  };
}

/**
 * Find the shortest sentence with its position in the text
 */
export function findShortestSentence(text: string): { sentence: string; startIndex: number; endIndex: number } | null {
  const safeText = text ?? '';
  if (!safeText.trim()) return null;
  
  const sentences = getSentences(safeText);
  if (sentences.length === 0) return null;
  
  let shortestSentence = '';
  let shortestWordCount = Infinity;
  let shortestIndex = -1;
  
  sentences.forEach((sentence, index) => {
    const wordCount = countWords(sentence);
    if (wordCount < shortestWordCount) {
      shortestWordCount = wordCount;
      shortestSentence = sentence;
      shortestIndex = index;
    }
  });
  
  if (shortestIndex === -1) return null;
  
  // Find the position of this sentence in the original text
  const startIndex = safeText.indexOf(shortestSentence);
  const endIndex = startIndex + shortestSentence.length;
  
  return {
    sentence: shortestSentence,
    startIndex,
    endIndex
  };
}

/**
 * Detect passive voice sentences in text
 */
export function detectPassiveVoice(text: string): Array<{ sentence: string; startIndex: number; endIndex: number }> {
  const safeText = text ?? '';
  if (!safeText.trim()) return [];
  
  const passiveVoice: Array<{ sentence: string; startIndex: number; endIndex: number }> = [];
  const sentences = getSentences(safeText);
  
  // Common passive voice patterns
  const passivePatterns = [
    /\b(was|were|is|are|am|be|been|being)\s+\w*ed\b/i,
    /\b(was|were|is|are|am|be|been|being)\s+\w*en\b/i,
    /\b(was|were|is|are|am|be|been|being)\s+(given|taken|made|done|seen|heard|felt|known|shown|told|asked|brought|sent|found|left|kept|held|put|set|cut|hit|hurt|let|met|read|said|sold|paid|laid|led|fed|built|caught|taught|thought|bought|fought|sought|brought)\b/i
  ];
  
  let currentIndex = 0;
  sentences.forEach(sentence => {
    const startIndex = safeText.indexOf(sentence, currentIndex);
    const endIndex = startIndex + sentence.length;
    
    // Check if sentence contains passive voice patterns
    const hasPassiveVoice = passivePatterns.some(pattern => pattern.test(sentence));
    
    if (hasPassiveVoice) {
      passiveVoice.push({
        sentence: sentence.trim(),
        startIndex,
        endIndex
      });
    }
    
    currentIndex = endIndex;
  });
  
  return passiveVoice;
}

/**
 * Count adverbs (words ending in -ly) with smart filtering
 */
export function countAdverbs(text: string): Array<{ word: string; startIndex: number; endIndex: number }> {
  const safeText = text ?? '';
  if (!safeText.trim()) return [];
  
  const adverbs: Array<{ word: string; startIndex: number; endIndex: number }> = [];
  
  // Words ending in -ly that are NOT adverbs
  const nonAdverbs = new Set([
    'family', 'early', 'daily', 'weekly', 'monthly', 'yearly', 'holy', 'jolly',
    'belly', 'jelly', 'silly', 'hilly', 'billy', 'lily', 'july', 'supply',
    'apply', 'reply', 'comply', 'imply', 'multiply', 'butterfly', 'assembly',
    'elderly', 'friendly', 'lovely', 'lonely', 'likely', 'unlikely', 'lively',
    'deadly', 'costly', 'mostly', 'partly', 'nearly', 'barely', 'rarely'
  ]);
  
  // Find all words ending in -ly
  const lyWordPattern = /\b\w+ly\b/gi;
  let match;
  
  while ((match = lyWordPattern.exec(safeText)) !== null) {
    const word = match[0].toLowerCase();
    
    // Skip if it's in the non-adverbs list
    if (!nonAdverbs.has(word)) {
      adverbs.push({
        word: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }
  
  return adverbs;
}

/**
 * Detect weakening phrases that undermine confidence
 */
export function detectWeakeningPhrases(text: string): Array<{ phrase: string; startIndex: number; endIndex: number }> {
  const safeText = text ?? '';
  if (!safeText.trim()) return [];
  
  const weakeningPhrases: Array<{ phrase: string; startIndex: number; endIndex: number }> = [];
  
  // Common weakening phrases
  const phrases = [
    'I think', 'I believe', 'I feel', 'I guess', 'I suppose',
    'Maybe', 'Perhaps', 'Possibly', 'Probably', 'Likely',
    'Sort of', 'Kind of', 'Somewhat', 'Rather', 'Quite',
    'It seems', 'It appears', 'It looks like', 'It might be',
    'In my opinion', 'I would say', 'I tend to think',
    'To some extent', 'To a certain degree', 'More or less',
    'Pretty much', 'Fairly', 'Relatively', 'Basically'
  ];
  
  phrases.forEach(phrase => {
    const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match;
    
    while ((match = pattern.exec(safeText)) !== null) {
      weakeningPhrases.push({
        phrase: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  });
  
  return weakeningPhrases;
}

/**
 * Calculate number of standard pages (250 words per page)
 */
export function calculatePages(text: string): number {
  const words = countWords(text);
  return Math.ceil(words / 250);
}

/**
 * Calculate number of screenfuls based on device type with realistic text rendering
 */
export function calculateScreenfuls(text: string, deviceType: DeviceType): number {
  const config = DEVICE_CONFIGS[deviceType];
  const safeText = text ?? '';
  
  if (!safeText.trim()) return 0;
  
  // Account for UI padding and margins (reduce available space by ~20%)
  const availableWidth = Math.floor(config.viewportWidth * 0.8);
  const availableHeight = Math.floor(config.viewportHeight * 0.8);
  
  // Calculate usable lines per screen
  const linesPerScreen = Math.floor(availableHeight / config.lineHeight);
  
  // Calculate characters per line accounting for word wrapping
  const charsPerLine = Math.floor(availableWidth / config.avgCharWidth);
  
  // Split text into paragraphs and process each
  const paragraphs = safeText.split(/\n\s*\n/);
  let totalLines = 0;
  
  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) {
      totalLines += 1; // Empty paragraph = 1 line
      return;
    }
    
    // Split paragraph into words for realistic line wrapping
    const words = paragraph.trim().split(/\s+/);
    let currentLineLength = 0;
    let paragraphLines = 0;
    
    words.forEach(word => {
      const wordLength = word.length + 1; // +1 for space
      
      if (currentLineLength + wordLength > charsPerLine) {
        // Start new line
        paragraphLines++;
        currentLineLength = wordLength;
      } else {
        currentLineLength += wordLength;
      }
    });
    
    // Add the last line if there's content
    if (currentLineLength > 0) {
      paragraphLines++;
    }
    
    totalLines += Math.max(1, paragraphLines); // At least 1 line per paragraph
  });
  
  // Add extra spacing between paragraphs (0.5 line per paragraph break)
  const paragraphBreaks = Math.max(0, paragraphs.length - 1);
  totalLines += Math.ceil(paragraphBreaks * 0.5);
  
  // Calculate screenfuls with device-specific adjustments
  let screenfuls = Math.ceil(totalLines / linesPerScreen);
  
  // Device-specific adjustments for scrolling behavior
  switch (deviceType) {
    case 'mobile':
      // Mobile users scroll more frequently, count partial screens
      screenfuls = Math.ceil(totalLines / (linesPerScreen * 0.7));
      break;
    case 'tablet':
      // Tablet users scroll in larger chunks
      screenfuls = Math.ceil(totalLines / (linesPerScreen * 0.8));
      break;
    case 'desktop':
      // Desktop users typically view full screens
      screenfuls = Math.ceil(totalLines / linesPerScreen);
      break;
  }
  
  return Math.max(1, screenfuls);
}

/**
 * Calculate reading time adjusted for device type and reading patterns
 */
export function calculateDeviceReadingTime(text: string, deviceType: DeviceType): { minutes: number; seconds: number } {
  const safeText = text ?? '';
  const words = countWords(safeText);
  const config = DEVICE_CONFIGS[deviceType];
  
  if (words === 0) return { minutes: 0, seconds: 0 };
  
  let adjustedWPM = config.readingWPM;
  
  // Device-specific reading pattern adjustments
  switch (deviceType) {
    case 'mobile':
      // Mobile users scan more and read in bursts, but also get distracted
      // Account for scrolling pauses and smaller screen context
      const sentences = countSentences(safeText);
      const avgSentenceLength = words / Math.max(1, sentences);
      
      // Longer sentences slow down mobile reading
      if (avgSentenceLength > 20) {
        adjustedWPM *= 0.85; // 15% slower for complex sentences
      }
      break;
      
    case 'tablet':
      // Tablet reading is comfortable and consistent - no adjustment needed
      break;
      
    case 'desktop':
      // Desktop allows for focused reading, but account for text density
      const paragraphs = countParagraphs(safeText);
      const avgWordsPerParagraph = words / Math.max(1, paragraphs);
      
      // Dense paragraphs slow down desktop reading
      if (avgWordsPerParagraph > 100) {
        adjustedWPM *= 0.9; // 10% slower for dense text
      }
      break;
      
    case 'standard':
    default:
      // Standard calculation remains unchanged
      break;
  }
  
  const totalSeconds = Math.round((words / adjustedWPM) * 60);
  
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  };
}

/**
 * Detect paragraphs that would be "wall of text" on mobile devices
 */
export function detectWallOfTextParagraphs(text: string): Array<{ startIndex: number; endIndex: number }> {
  const safeText = text ?? '';
  if (!safeText.trim()) return [];
  
  const wallOfTextParagraphs: Array<{ startIndex: number; endIndex: number }> = [];
  const paragraphs = safeText.split(/\n\s*\n/);
  
  let currentIndex = 0;
  paragraphs.forEach(paragraph => {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) {
      currentIndex += paragraph.length + 2; // Account for paragraph separator
      return;
    }
    
    const startIndex = safeText.indexOf(trimmedParagraph, currentIndex);
    const endIndex = startIndex + trimmedParagraph.length;
    
    // Check if paragraph is too dense for mobile reading
    const wordCount = countWords(trimmedParagraph);
    const charCount = trimmedParagraph.length;
    const sentences = getSentences(trimmedParagraph);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
    
    // Criteria for "wall of text":
    // 1. More than 150 words, OR
    // 2. More than 800 characters, OR  
    // 3. Average sentence length > 25 words
    if (wordCount > 150 || charCount > 800 || avgSentenceLength > 25) {
      wallOfTextParagraphs.push({
        startIndex,
        endIndex
      });
    }
    
    currentIndex = endIndex + 2; // Account for paragraph separator
  });
  
  return wallOfTextParagraphs;
}

/**
 * Main function to calculate all word count statistics
 */
export function analyzeText(text: string, deviceType: DeviceType = 'standard', targetKeyword?: string): WordCountStats {
  // Defensive check: ensure text is always a string
  const safeText = text ?? '';
  
  return {
    // Core counts
    words: countWords(safeText),
    uniqueWords: countUniqueWords(safeText),
    characters: countCharacters(safeText),
    charactersNoSpaces: countCharactersNoSpaces(safeText),
    sentences: countSentences(safeText),
    paragraphs: countParagraphs(safeText),
    lines: countLines(safeText),
    pages: calculatePages(safeText),
    screenfuls: calculateScreenfuls(safeText, deviceType),
    
    // Averages & lengths
    longestSentence: getLongestSentence(safeText),
    shortestSentence: getShortestSentence(safeText),
    avgSentenceLength: getAvgSentenceLength(safeText),
    avgSentenceLengthChars: getAvgSentenceLengthChars(safeText),
    avgWordLength: getAvgWordLength(safeText),
    
    // Readability & time
    syllables: countSyllables(safeText),
    fleschKincaidGrade: calculateFleschKincaidGrade(safeText),
    gunningFogIndex: calculateGunningFogIndex(safeText),
    smogIndex: calculateSmogIndex(safeText),
    colemanLiauIndex: calculateColemanLiauIndex(safeText),
    lexicalDensity: calculateLexicalDensity(safeText),
    readingTime: calculateDeviceReadingTime(safeText, deviceType),
    speakingTime: calculateSpeakingTime(safeText),
    handwritingTime: calculateHandwritingTime(safeText),
    
    // LLM token counts
    llmTokens: calculateLLMTokens(safeText),
    
    // SEO & keywords
    topKeywords: getTopKeywords(safeText, 5),
    topBigrams: getTopNGrams(safeText, 2, 5),
    topTrigrams: getTopNGrams(safeText, 3, 5),
    targetKeywordDensity: targetKeyword ? calculateKeywordDensity(safeText, targetKeyword) : undefined,
    
    // Stylistic analysis
    passiveVoiceSentences: detectPassiveVoice(safeText),
    adverbs: countAdverbs(safeText),
    weakeningPhrases: detectWeakeningPhrases(safeText),
    fillerWords: detectFillerWords(safeText),
    redundantPhrases: detectRedundantPhrases(safeText),
    longSentences: findLongSentences(safeText),
    
    // Punctuation analysis
    questionCount: countQuestions(safeText),
    exclamationCount: countExclamations(safeText),
    
    // Mobile readability
    wallOfTextParagraphs: detectWallOfTextParagraphs(safeText)
  };
}

/**
 * Evaluate how a metric value compares to its target range
 */
export function evaluateMetricTarget(
  value: number, 
  target: { min?: number; max?: number }
): 'good' | 'warning' | 'poor' {
  const { min, max } = target;
  
  // If both min and max are defined (range target)
  if (min !== undefined && max !== undefined) {
    if (value >= min && value <= max) {
      return 'good';
    }
    // Check if close to boundaries (within 20% tolerance)
    const range = max - min;
    const tolerance = range * 0.2;
    if ((value >= min - tolerance && value < min) || 
        (value > max && value <= max + tolerance)) {
      return 'warning';
    }
    return 'poor';
  }
  
  // If only max is defined (upper limit target)
  if (max !== undefined) {
    if (value <= max) {
      return 'good';
    }
    // Check if close to limit (within 20% tolerance)
    const tolerance = max * 0.2;
    if (value <= max + tolerance) {
      return 'warning';
    }
    return 'poor';
  }
  
  // If only min is defined (lower limit target)
  if (min !== undefined) {
    if (value >= min) {
      return 'good';
    }
    // Check if close to limit (within 20% tolerance)
    const tolerance = min * 0.2;
    if (value >= min - tolerance) {
      return 'warning';
    }
    return 'poor';
  }
  
  // No targets defined
  return 'good';
}
/**
 * Generate a comprehensive export report in Markdown format
 */
export function generateExportReport(
  stats: WordCountStats,
  deviceType: DeviceType,
  writingGoal: WritingGoal,
  targetKeyword?: string,
  text?: string,
  title?: string
): string {
  const targets = WRITING_TARGETS[writingGoal];
  const timestamp = new Date().toLocaleString();
  
  let report = '';
  
  // Add title if provided
  if (title && title.trim()) {
    report += `# ${title.trim()}\n\n`;
    report += `## Word Count Analysis Report\n\n`;
  } else {
    report += `# Word Count Analysis Report\n\n`;
  }
  
  report += `**Generated:** ${timestamp}  \n`;
  report += `**Device Preview:** ${deviceType}  \n`;
  report += `**Writing Goal:** ${writingGoal}  \n`;
  if (targetKeyword) {
    report += `**Target Keyword:** ${targetKeyword}  \n`;
  }
  report += `\n---\n\n`;
  
  // Core Statistics
  report += `## Core Statistics\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Words | ${stats.words.toLocaleString()} |\n`;
  report += `| Unique Words | ${stats.uniqueWords.toLocaleString()} |\n`;
  report += `| Characters | ${stats.characters.toLocaleString()} |\n`;
  report += `| Characters (no spaces) | ${stats.charactersNoSpaces.toLocaleString()} |\n`;
  report += `| Sentences | ${stats.sentences.toLocaleString()} |\n`;
  report += `| Paragraphs | ${stats.paragraphs.toLocaleString()} |\n`;
  report += `| Lines | ${stats.lines.toLocaleString()} |\n`;
  
  if (deviceType === 'standard') {
    report += `| Pages | ${stats.pages} |\n`;
  } else {
    report += `| Screenfuls (${deviceType}) | ${stats.screenfuls} |\n`;
  }
  
  report += `\n`;
  
  // Advanced Readability Analysis
  report += `## Advanced Readability Analysis\n\n`;
  report += `| Metric | Value | Target | Status |\n`;
  report += `|--------|-------|--------|--------|\n`;
  
  const fleschStatus = evaluateMetricTarget(stats.fleschKincaidGrade, {
    min: targets.fleschKincaidMin,
    max: targets.fleschKincaidMax
  });
  const fleschIcon = fleschStatus === 'good' ? '✅' : fleschStatus === 'warning' ? '⚠️' : '❌';
  report += `| Flesch-Kincaid Grade | ${stats.fleschKincaidGrade} | ${targets.fleschKincaidMin}-${targets.fleschKincaidMax} | ${fleschIcon} |\n`;
  
  // Add new readability metrics
  report += `| Gunning Fog Index | ${stats.gunningFogIndex} | - | - |\n`;
  report += `| SMOG Index | ${stats.smogIndex} | - | - |\n`;
  report += `| Coleman-Liau Index | ${stats.colemanLiauIndex} | - | - |\n`;
  report += `| Lexical Density | ${stats.lexicalDensity}% | - | - |\n`;
  report += `| Syllables | ${stats.syllables.toLocaleString()} | - | - |\n`;
  report += `\n`;
  
  // Pacing & Rhythm Analysis
  report += `## Pacing & Rhythm Analysis\n\n`;
  report += `| Metric | Value | Target | Status |\n`;
  report += `|--------|-------|--------|--------|\n`;
  
  const sentenceStatus = evaluateMetricTarget(stats.avgSentenceLength, { max: targets.avgSentenceLengthMax });
  const sentenceIcon = sentenceStatus === 'good' ? '✅' : sentenceStatus === 'warning' ? '⚠️' : '❌';
  report += `| Avg. Sentence Length | ${stats.avgSentenceLength} words | ≤${targets.avgSentenceLengthMax} words | ${sentenceIcon} |\n`;
  report += `| Avg. Sentence Length | ${stats.avgSentenceLengthChars} chars | - | - |\n`;
  report += `| Avg. Word Length | ${stats.avgWordLength} chars | - | - |\n`;
  report += `| Longest Sentence | ${stats.longestSentence} words | - | - |\n`;
  report += `| Shortest Sentence | ${stats.shortestSentence} words | - | - |\n`;
  
  // Add sentence length distribution if text is available
  if (text && text.trim()) {
    const distribution = getSentenceLengthDistribution(text);
    if (distribution.length > 0) {
      const maxCount = Math.max(...distribution.map(item => item.count));
      report += `\n**Sentence Length Distribution:**\n\n`;
      distribution.forEach(item => {
        const barLength = Math.round((item.count / maxCount) * 20); // Scale to max 20 characters
        const bar = '█'.repeat(Math.max(1, barLength)); // Use block character instead of asterisks
        const padding = ' '.repeat(Math.max(0, 15 - item.bucket.length)); // Right-align labels
        report += `${item.bucket}${padding} ${bar} (${item.count})  \n`;
      });
      report += `\n`;
    }
  }
  report += `\n`;
  
  // Time Estimates
  const formatTime = (time: { minutes: number; seconds: number }) => {
    if (time.minutes === 0) return `${time.seconds}s`;
    return `${time.minutes}m ${time.seconds}s`;
  };
  
  const formatHandwritingTime = (time: { hours: number; minutes: number }) => {
    if (time.hours === 0) return `${time.minutes}m`;
    return `${time.hours}h ${time.minutes}m`;
  };
  
  report += `## Time Estimates\n\n`;
  report += `| Activity | Time |\n`;
  report += `|----------|------|\n`;
  report += `| Reading (${deviceType}) | ${formatTime(stats.readingTime)} |\n`;
  report += `| Speaking | ${formatTime(stats.speakingTime)} |\n`;
  report += `| Handwriting | ${formatHandwritingTime(stats.handwritingTime)} |\n`;
  report += `\n`;
  
  // LLM Token Counts
  report += `## LLM Token Estimates\n\n`;
  report += `| Model | Tokens |\n`;
  report += `|-------|--------|\n`;
  report += `| GPT-3.5 | ${stats.llmTokens.gpt35.toLocaleString()} |\n`;
  report += `| GPT-4 | ${stats.llmTokens.gpt4.toLocaleString()} |\n`;
  report += `| Claude | ${stats.llmTokens.claude.toLocaleString()} |\n`;
  report += `| LLaMA | ${stats.llmTokens.llama.toLocaleString()} |\n`;
  report += `| Gemini | ${stats.llmTokens.gemini.toLocaleString()} |\n`;
  report += `\n`;
  
  // Style & Redundancy Analysis
  report += `## Style & Redundancy Analysis\n\n`;
  report += `| Issue | Count | Target | Status |\n`;
  report += `|-------|-------|--------|--------|\n`;
  
  const passiveStatus = evaluateMetricTarget(stats.passiveVoiceSentences.length, { max: targets.passiveVoiceMax });
  const passiveIcon = passiveStatus === 'good' ? '✅' : passiveStatus === 'warning' ? '⚠️' : '❌';
  report += `| Passive Voice Sentences | ${stats.passiveVoiceSentences.length} | ≤${targets.passiveVoiceMax} | ${passiveIcon} |\n`;
  
  const adverbStatus = evaluateMetricTarget(stats.adverbs.length, { max: targets.adverbsMax });
  const adverbIcon = adverbStatus === 'good' ? '✅' : adverbStatus === 'warning' ? '⚠️' : '❌';
  report += `| Adverbs (-ly) | ${stats.adverbs.length} | ≤${targets.adverbsMax} | ${adverbIcon} |\n`;
  
  const weakeningStatus = evaluateMetricTarget(stats.weakeningPhrases.length, { max: 2 });
  const weakeningIcon = weakeningStatus === 'good' ? '✅' : weakeningStatus === 'warning' ? '⚠️' : '❌';
  report += `| Weakening Phrases | ${stats.weakeningPhrases.length} | ≤2 | ${weakeningIcon} |\n`;
  
  // Add new stylistic metrics
  const runOnStatus = evaluateMetricTarget(stats.longSentences.length, { max: 0 });
  const runOnIcon = runOnStatus === 'good' ? '✅' : runOnStatus === 'warning' ? '⚠️' : '❌';
  report += `| Run-on Sentences (35+ words) | ${stats.longSentences.length} | 0 | ${runOnIcon} |\n`;
  
  const fillerStatus = evaluateMetricTarget(stats.fillerWords.length, { max: 5 });
  const fillerIcon = fillerStatus === 'good' ? '✅' : fillerStatus === 'warning' ? '⚠️' : '❌';
  report += `| Filler Words | ${stats.fillerWords.length} | ≤5 | ${fillerIcon} |\n`;
  
  const redundantStatus = evaluateMetricTarget(stats.redundantPhrases.length, { max: 0 });
  const redundantIcon = redundantStatus === 'good' ? '✅' : redundantStatus === 'warning' ? '⚠️' : '❌';
  report += `| Redundant Phrases | ${stats.redundantPhrases.length} | 0 | ${redundantIcon} |\n`;
  
  if (deviceType === 'mobile') {
    const wallStatus = evaluateMetricTarget(stats.wallOfTextParagraphs.length, { max: 0 });
    const wallIcon = wallStatus === 'good' ? '✅' : wallStatus === 'warning' ? '⚠️' : '❌';
    report += `| Wall of Text Paragraphs | ${stats.wallOfTextParagraphs.length} | 0 | ${wallIcon} |\n`;
  }
  
  report += `\n`;
  
  // Punctuation Analysis
  report += `## Punctuation Analysis\n\n`;
  report += `| Type | Count |\n`;
  report += `|------|-------|\n`;
  report += `| Questions | ${stats.questionCount} |\n`;
  report += `| Exclamations | ${stats.exclamationCount} |\n`;
  report += `\n`;
  
  // Keywords Analysis
  if (stats.topKeywords.length > 0) {
    report += `## Top Keywords\n\n`;
    report += `| Rank | Keyword | Count | Density |\n`;
    report += `|------|---------|-------|----------|\n`;
    
    stats.topKeywords.forEach((keyword, index) => {
      let status = '';
      if (targetKeyword && keyword.word.toLowerCase() === targetKeyword.toLowerCase()) {
        const densityStatus = evaluateMetricTarget(keyword.density, {
          min: targets.keywordDensityMin,
          max: targets.keywordDensityMax
        });
        status = densityStatus === 'good' ? ' ✅' : densityStatus === 'warning' ? ' ⚠️' : ' ❌';
      }
      report += `| ${index + 1} | ${keyword.word}${status} | ${keyword.count}× | ${keyword.density}% |\n`;
    });
    report += `\n`;
  }
  
  // Target Keyword Density (for SEO analysis)
  if (targetKeyword && writingGoal === 'blog') {
    report += `## Target Keyword Density\n\n`;
    const keywordData = stats.targetKeywordDensity;
    
    if (!keywordData || keywordData.count === 0) {
      report += `**Target Keyword:** "${targetKeyword}"  \n`;
      report += `**Current Density:** 0% (0 occurrences) ❌  \n`;
      report += `**Target Range:** ${targets.keywordDensityMin}% - ${targets.keywordDensityMax}%  \n`;
      report += `**Status:** Keyword not found in text\n\n`;
    } else {
      const densityStatus = evaluateMetricTarget(keywordData.density, {
        min: targets.keywordDensityMin,
        max: targets.keywordDensityMax
      });
      const statusIcon = densityStatus === 'good' ? '✅' : densityStatus === 'warning' ? '⚠️' : '❌';
      
      report += `**Target Keyword:** "${targetKeyword}"  \n`;
      report += `**Current Density:** ${keywordData.density}% (${keywordData.count} occurrences) ${statusIcon}  \n`;
      report += `**Target Range:** ${targets.keywordDensityMin}% - ${targets.keywordDensityMax}%  \n`;
      
      if (densityStatus === 'good') {
        report += `**Status:** Optimal keyword density for SEO\n\n`;
      } else if (keywordData.density < targets.keywordDensityMin) {
        report += `**Status:** Below target range - consider adding more usage\n\n`;
      } else {
        report += `**Status:** Above target range - may be over-optimized\n\n`;
      }
    }
  }
  
  // Recommendations
  report += `## Recommendations\n\n`;
  const recommendations: string[] = [];
  
  if (fleschStatus !== 'good') {
    if (stats.fleschKincaidGrade > targets.fleschKincaidMax) {
      recommendations.push('📚 **Simplify language**: Your text may be too complex for the target audience. Consider shorter sentences and simpler words.');
    } else {
      recommendations.push('📈 **Add complexity**: Your text may be too simple for the target audience. Consider more varied sentence structures.');
    }
  }
  
  if (sentenceStatus !== 'good') {
    recommendations.push('✂️ **Shorten sentences**: Break up long sentences to improve readability.');
  }
  
  if (passiveStatus !== 'good') {
    recommendations.push('🎯 **Reduce passive voice**: Convert passive constructions to active voice for more engaging writing.');
  }
  
  if (adverbStatus !== 'good') {
    recommendations.push('⚡ **Minimize adverbs**: Replace adverbs with stronger verbs or more specific descriptions.');
  }
  
  if (weakeningStatus !== 'good') {
    recommendations.push('💪 **Strengthen language**: Remove weakening phrases like "I think" or "maybe" to sound more confident.');
  }
  
  // Add recommendations for new metrics
  if (runOnStatus !== 'good') {
    recommendations.push('✂️ **Break up run-on sentences**: Sentences with 35+ words are hard to follow. Split them into shorter, clearer statements.');
  }
  
  if (fillerStatus !== 'good') {
    recommendations.push('🔥 **Remove filler words**: Eliminate words like "just", "really", "basically" that weaken your message.');
  }
  
  if (redundantStatus !== 'good') {
    recommendations.push('🎯 **Eliminate redundancy**: Remove redundant phrases like "each and every" or "absolutely essential" for cleaner writing.');
  }
  
  // Readability recommendations based on new indices
  if (stats.gunningFogIndex > 12) {
    recommendations.push('🌫️ **Reduce complexity**: High Gunning Fog Index suggests text may be too complex. Use simpler words and shorter sentences.');
  }
  
  if (stats.lexicalDensity < 40) {
    recommendations.push('📚 **Increase vocabulary variety**: Low lexical density indicates repetitive word use. Vary your vocabulary for richer content.');
  } else if (stats.lexicalDensity > 70) {
    recommendations.push('🔄 **Balance vocabulary**: Very high lexical density might make text hard to follow. Consider some repetition of key concepts.');
  }
  
  if (deviceType === 'mobile' && stats.wallOfTextParagraphs.length > 0) {
    recommendations.push('📱 **Break up paragraphs**: Large paragraphs are hard to read on mobile. Aim for 2-3 sentences per paragraph.');
  }
  
  if (targetKeyword) {
    // Use the direct keyword density calculation instead of looking in topKeywords
    const keywordData = stats.targetKeywordDensity;
    if (!keywordData || keywordData.count === 0) {
      recommendations.push(`🔍 **Add target keyword**: The keyword "${targetKeyword}" doesn't appear in your text.`);
    } else {
      const densityStatus = evaluateMetricTarget(keywordData.density, {
        min: targets.keywordDensityMin,
        max: targets.keywordDensityMax
      });
      if (densityStatus === 'poor') {
        if (keywordData.density < targets.keywordDensityMin) {
          recommendations.push(`🔍 **Increase keyword density**: Use "${targetKeyword}" more frequently (target: ${targets.keywordDensityMin}-${targets.keywordDensityMax}%).`);
        } else {
          recommendations.push(`🔍 **Reduce keyword density**: You may be over-optimizing for "${targetKeyword}" (target: ${targets.keywordDensityMin}-${targets.keywordDensityMax}%).`);
        }
      }
    }
  }
  
  if (recommendations.length === 0) {
    report += `🎉 **Excellent work!** Your text meets all the targets for ${writingGoal} writing.\n\n`;
  } else {
    recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += `\n`;
  }
  
  report += `---\n\n`;
  report += `*Report generated by Scratch Tabs Word Count Analyzer*`;
  
  return report;
}