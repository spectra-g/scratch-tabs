// Text analysis utilities for word count statistics
// Pure functions with no React dependencies

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