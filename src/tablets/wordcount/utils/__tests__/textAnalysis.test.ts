import {
  countWords,
  countUniqueWords,
  countCharacters,
  countCharactersNoSpaces,
  countSentences,
  countParagraphs,
  countLines,
  getSentences,
  getLongestSentence,
  getShortestSentence,
  getAvgSentenceLength,
  getAvgSentenceLengthChars,
  getAvgWordLength,
  countSyllablesInWord,
  countSyllables,
  calculateFleschKincaidGrade,
  calculateReadingTime,
  calculateSpeakingTime,
  calculateHandwritingTime,
  getWordFrequency,
  getNGramFrequency,
  getTopKeywords,
  getTopNGrams,
  analyzeText
} from '../textAnalysis';

describe('textAnalysis', () => {
  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  Hello   world  ')).toBe(2);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('One')).toBe(1);
    });

    it('should handle punctuation', () => {
      expect(countWords('Hello, world!')).toBe(2);
      expect(countWords("Don't count this as three words")).toBe(6);
    });
  });

  describe('countUniqueWords', () => {
    it('should count unique words case-insensitively', () => {
      expect(countUniqueWords('Hello world hello')).toBe(2);
      expect(countUniqueWords('Hello World HELLO')).toBe(2);
      expect(countUniqueWords('')).toBe(0);
    });

    it('should handle punctuation', () => {
      expect(countUniqueWords('Hello, world! Hello.')).toBe(2);
    });
  });

  describe('countCharacters', () => {
    it('should count all characters including spaces', () => {
      expect(countCharacters('Hello world')).toBe(11);
      expect(countCharacters('')).toBe(0);
      expect(countCharacters('   ')).toBe(3);
    });
  });

  describe('countCharactersNoSpaces', () => {
    it('should count characters excluding spaces', () => {
      expect(countCharactersNoSpaces('Hello world')).toBe(10);
      expect(countCharactersNoSpaces('   ')).toBe(0);
      expect(countCharactersNoSpaces('a b c')).toBe(3);
    });
  });

  describe('countSentences', () => {
    it('should count sentences correctly', () => {
      expect(countSentences('Hello world.')).toBe(1);
      expect(countSentences('Hello world. How are you?')).toBe(2);
      expect(countSentences('Great! Really? Yes.')).toBe(3);
      expect(countSentences('')).toBe(0);
    });

    it('should handle abbreviations', () => {
      expect(countSentences('Mr. Smith went home.')).toBe(1);
      expect(countSentences('Dr. Jones is here. Mrs. Smith left.')).toBe(2);
    });
  });

  describe('countParagraphs', () => {
    it('should count paragraphs correctly', () => {
      expect(countParagraphs('Hello world')).toBe(1);
      expect(countParagraphs('Hello world\n\nSecond paragraph')).toBe(2);
      expect(countParagraphs('')).toBe(0);
    });

    it('should handle multiple line breaks', () => {
      expect(countParagraphs('Para 1\n\n\nPara 2')).toBe(2);
    });
  });

  describe('countLines', () => {
    it('should count lines correctly', () => {
      expect(countLines('Hello world')).toBe(1);
      expect(countLines('Hello\nworld')).toBe(2);
      expect(countLines('')).toBe(0);
      expect(countLines('Line 1\nLine 2\nLine 3')).toBe(3);
    });
  });

  describe('getSentences', () => {
    it('should split text into sentences', () => {
      const sentences = getSentences('Hello world. How are you? Fine!');
      expect(sentences).toEqual(['Hello world', 'How are you', 'Fine']);
    });

    it('should handle abbreviations', () => {
      const sentences = getSentences('Mr. Smith is here. He left.');
      expect(sentences).toEqual(['Mr. Smith is here', 'He left']);
    });
  });

  describe('sentence length calculations', () => {
    const text = 'Short. This is a longer sentence with more words. Medium length.';

    it('should find longest sentence', () => {
      expect(getLongestSentence(text)).toBe(9);
    });

    it('should find shortest sentence', () => {
      expect(getShortestSentence(text)).toBe(1);
    });

    it('should calculate average sentence length', () => {
      expect(getAvgSentenceLength(text)).toBe(4.3);
    });
  });

  describe('countSyllablesInWord', () => {
    it('should count syllables correctly', () => {
      expect(countSyllablesInWord('hello')).toBe(2);
      expect(countSyllablesInWord('world')).toBe(1);
      expect(countSyllablesInWord('beautiful')).toBe(3);
      expect(countSyllablesInWord('a')).toBe(1);
      expect(countSyllablesInWord('')).toBe(0);
    });

    it('should handle silent e', () => {
      expect(countSyllablesInWord('make')).toBe(1);
      expect(countSyllablesInWord('table')).toBe(2);
    });
  });

  describe('countSyllables', () => {
    it('should count total syllables in text', () => {
      expect(countSyllables('hello world')).toBe(3);
      expect(countSyllables('')).toBe(0);
    });
  });

  describe('calculateFleschKincaidGrade', () => {
    it('should calculate grade level', () => {
      const simpleText = 'The cat sat on the mat.';
      const grade = calculateFleschKincaidGrade(simpleText);
      expect(grade).toBeGreaterThan(0);
      expect(grade).toBeLessThan(20);
    });

    it('should handle empty text', () => {
      expect(calculateFleschKincaidGrade('')).toBe(0);
    });
  });

  describe('time calculations', () => {
    const text = 'This is a sample text with exactly ten words here.';

    it('should calculate reading time', () => {
      const time = calculateReadingTime(text);
      expect(time.minutes).toBe(0);
      expect(time.seconds).toBeGreaterThan(0);
    });

    it('should calculate speaking time', () => {
      const time = calculateSpeakingTime(text);
      expect(time.minutes).toBe(0);
      expect(time.seconds).toBeGreaterThan(0);
    });

    it('should calculate handwriting time', () => {
      const time = calculateHandwritingTime(text);
      expect(time.hours).toBe(0);
      expect(time.minutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('keyword analysis', () => {
    const text = 'The quick brown fox jumps over the lazy dog. The fox is quick.';

    it('should get word frequency', () => {
      const frequency = getWordFrequency(text);
      expect(frequency.get('fox')).toBe(2);
      expect(frequency.get('quick')).toBe(2);
      expect(frequency.has('the')).toBe(false); // Stop word
    });

    it('should get top keywords', () => {
      const keywords = getTopKeywords(text, 3);
      expect(keywords.length).toBeLessThanOrEqual(3);
      expect(keywords[0].word).toBe('fox');
      expect(keywords[0].count).toBe(2);
      expect(keywords[0].density).toBeGreaterThan(0);
    });

    it('should get n-grams', () => {
      const bigrams = getTopNGrams(text, 2, 3);
      expect(bigrams.length).toBeGreaterThan(0);
      expect(bigrams[0].phrase).toContain(' ');
    });
  });

  describe('analyzeText', () => {
    it('should return complete analysis', () => {
      const text = 'Hello world. This is a test.';
      const stats = analyzeText(text);
      
      expect(stats.words).toBe(6);
      expect(stats.sentences).toBe(2);
      expect(stats.characters).toBe(28);
      expect(stats.topKeywords).toBeDefined();
      expect(stats.readingTime).toBeDefined();
      expect(stats.fleschKincaidGrade).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty text', () => {
      const stats = analyzeText('');
      expect(stats.words).toBe(0);
      expect(stats.sentences).toBe(0);
      expect(stats.topKeywords).toEqual([]);
    });
  });
});