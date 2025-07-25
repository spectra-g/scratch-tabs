// Text analysis utilities for word count statistics
// Pure functions with no React dependencies

// Device configuration for different screen types
export type DeviceType = 'standard' | 'desktop' | 'tablet' | 'mobile';
export type WritingGoal = 'general' | 'technical' | 'blog' | 'academic';

export interface DeviceConfig {
  viewportWidth: number;
  viewportHeight: number;
  avgCharWidth: number;
  lineHeight: number;
  readingWPM: number;
}

export interface WritingTarget {
  fleschKincaidMin: number;
  fleschKincaidMax: number;
  avgSentenceLengthMax: number;
  passiveVoiceMax: number;
  adverbsMax: number;
  keywordDensityMin: number;
  keywordDensityMax: number;
}

export const DEVICE_CONFIGS: Record<DeviceType, DeviceConfig> = {
  standard: {
    viewportWidth: 800,
    viewportHeight: 600,
    avgCharWidth: 8,
    lineHeight: 20,
    readingWPM: 225
  },
  desktop: {
    viewportWidth: 1200,
    viewportHeight: 800,
    avgCharWidth: 8,
    lineHeight: 22,
    readingWPM: 250
  },
  tablet: {
    viewportWidth: 768,
    viewportHeight: 1024,
    avgCharWidth: 9,
    lineHeight: 24,
    readingWPM: 200
  },
  mobile: {
    viewportWidth: 375,
    viewportHeight: 667,
    avgCharWidth: 10,
    lineHeight: 26,
    readingWPM: 180
  }
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
  readingTime: { minutes: number; seconds: number };
  speakingTime: { minutes: number; seconds: number };
  handwritingTime: { hours: number; minutes: number };
  
  // SEO & keywords
  topKeywords: Array<{ word: string; count: number; density: number }>;
  topBigrams: Array<{ phrase: string; count: number; density: number }>;
  topTrigrams: Array<{ phrase: string; count: number; density: number }>;
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
 * Get top n-grams with density
 */
export function getTopNGrams(text: string, n: number, limit: number = 5): Array<{ phrase: string; count: number; density: number }> {
  const frequency = getNGramFrequency(text, n);
  const totalWords = countWords(text);
  
  if (totalWords === 0) return [];
  
  return Array.from(frequency.entries())
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
  
  const lowerText = safeText.toLowerCase();
  const lowerKeyword = safeKeyword.toLowerCase();
  
  let startIndex = 0;
  while (true) {
    const index = lowerText.indexOf(lowerKeyword, startIndex);
    if (index === -1) break;
    
    instances.push({
      word: safeText.substring(index, index + safeKeyword.length),
      startIndex: index,
      endIndex: index + safeKeyword.length
    });
    
    startIndex = index + 1;
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
 * Calculate number of screenfuls based on device type
 */
export function calculateScreenfuls(text: string, deviceType: DeviceType): number {
  const config = DEVICE_CONFIGS[deviceType];
  const characters = countCharacters(text);
  
  // Estimate characters per screenful based on device config
  const charsPerLine = Math.floor(config.viewportWidth / config.avgCharWidth);
  const linesPerScreen = Math.floor(config.viewportHeight / config.lineHeight);
  const charsPerScreen = charsPerLine * linesPerScreen;
  
  return Math.ceil(characters / charsPerScreen);
}

/**
 * Calculate reading time adjusted for device type
 */
export function calculateDeviceReadingTime(text: string, deviceType: DeviceType): { minutes: number; seconds: number } {
  const words = countWords(text);
  const config = DEVICE_CONFIGS[deviceType];
  const totalSeconds = Math.round((words / config.readingWPM) * 60);
  
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
export function analyzeText(text: string, deviceType: DeviceType = 'standard'): WordCountStats {
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
    readingTime: calculateDeviceReadingTime(safeText, deviceType),
    speakingTime: calculateSpeakingTime(safeText),
    handwritingTime: calculateHandwritingTime(safeText),
    
    // SEO & keywords
    topKeywords: getTopKeywords(safeText, 5),
    topBigrams: getTopNGrams(safeText, 2, 5),
    topTrigrams: getTopNGrams(safeText, 3, 5),
    
    // Stylistic analysis
    passiveVoiceSentences: detectPassiveVoice(safeText),
    adverbs: countAdverbs(safeText),
    weakeningPhrases: detectWeakeningPhrases(safeText),
    
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
  targetKeyword?: string
): string {
  const targets = WRITING_TARGETS[writingGoal];
  const timestamp = new Date().toLocaleString();
  
  let report = `# Word Count Analysis Report\n\n`;
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
  
  // Readability Analysis
  report += `## Readability Analysis\n\n`;
  report += `| Metric | Value | Target | Status |\n`;
  report += `|--------|-------|--------|--------|\n`;
  
  const fleschStatus = evaluateMetricTarget(stats.fleschKincaidGrade, {
    min: targets.fleschKincaidMin,
    max: targets.fleschKincaidMax
  });
  const fleschIcon = fleschStatus === 'good' ? '✅' : fleschStatus === 'warning' ? '⚠️' : '❌';
  report += `| Flesch-Kincaid Grade | ${stats.fleschKincaidGrade} | ${targets.fleschKincaidMin}-${targets.fleschKincaidMax} | ${fleschIcon} |\n`;
  
  const sentenceStatus = evaluateMetricTarget(stats.avgSentenceLength, { max: targets.avgSentenceLengthMax });
  const sentenceIcon = sentenceStatus === 'good' ? '✅' : sentenceStatus === 'warning' ? '⚠️' : '❌';
  report += `| Avg. Sentence Length | ${stats.avgSentenceLength} words | ≤${targets.avgSentenceLengthMax} words | ${sentenceIcon} |\n`;
  
  report += `| Syllables | ${stats.syllables.toLocaleString()} | - | - |\n`;
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
  
  // Stylistic Analysis
  report += `## Stylistic Analysis\n\n`;
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
  
  if (deviceType === 'mobile') {
    const wallStatus = evaluateMetricTarget(stats.wallOfTextParagraphs.length, { max: 0 });
    const wallIcon = wallStatus === 'good' ? '✅' : wallStatus === 'warning' ? '⚠️' : '❌';
    report += `| Wall of Text Paragraphs | ${stats.wallOfTextParagraphs.length} | 0 | ${wallIcon} |\n`;
  }
  
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
  
  if (deviceType === 'mobile' && stats.wallOfTextParagraphs.length > 0) {
    recommendations.push('📱 **Break up paragraphs**: Large paragraphs are hard to read on mobile. Aim for 2-3 sentences per paragraph.');
  }
  
  if (targetKeyword) {
    const keywordMatch = stats.topKeywords.find(k => k.word.toLowerCase() === targetKeyword.toLowerCase());
    if (!keywordMatch) {
      recommendations.push(`🔍 **Add target keyword**: The keyword "${targetKeyword}" doesn't appear in your text.`);
    } else {
      const densityStatus = evaluateMetricTarget(keywordMatch.density, {
        min: targets.keywordDensityMin,
        max: targets.keywordDensityMax
      });
      if (densityStatus === 'poor') {
        if (keywordMatch.density < targets.keywordDensityMin) {
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