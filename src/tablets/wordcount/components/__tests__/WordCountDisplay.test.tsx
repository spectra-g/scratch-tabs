import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordCountDisplay } from '../WordCountDisplay';
import { WordCountStats } from '../../utils/textAnalysis';

const mockStats: WordCountStats = {
  words: 100,
  uniqueWords: 75,
  characters: 500,
  charactersNoSpaces: 400,
  sentences: 5,
  paragraphs: 2,
  lines: 10,
  pages: 2,
  screenfuls: 3,
  longestSentence: 25,
  shortestSentence: 8,
  avgSentenceLength: 20.0,
  avgSentenceLengthChars: 100.0,
  avgWordLength: 5.0,
  syllables: 150,
  fleschKincaidGrade: 8.5,
  gunningFogIndex: 10.2,
  smogIndex: 9.8,
  colemanLiauIndex: 11.5,
  lexicalDensity: 65.5,
  readingTime: { minutes: 2, seconds: 30 },
  speakingTime: { minutes: 3, seconds: 15 },
  handwritingTime: { hours: 1, minutes: 30 },
  topKeywords: [
    { word: 'test', count: 5, density: 5.0 },
    { word: 'example', count: 3, density: 3.0 },
  ],
  topBigrams: [
    { phrase: 'test example', count: 2, density: 2.0 },
  ],
  topTrigrams: [
    { phrase: 'test example phrase', count: 1, density: 1.0 },
  ],
  passiveVoiceSentences: [
    { sentence: 'The ball was thrown', startIndex: 0, endIndex: 19 }
  ],
  adverbs: [
    { word: 'quickly', startIndex: 20, endIndex: 27 }
  ],
  weakeningPhrases: [
    { phrase: 'I think', startIndex: 30, endIndex: 37 }
  ],
  fillerWords: [
    { word: 'just', startIndex: 40, endIndex: 44 }
  ],
  redundantPhrases: [
    { phrase: 'each and every', startIndex: 50, endIndex: 64 }
  ],
  longSentences: [
    { sentence: 'This is a very long sentence that exceeds thirty-five words and should be considered a run-on sentence according to our analysis criteria.', startIndex: 70, endIndex: 210 }
  ],
  questionCount: 2,
  exclamationCount: 1,
  wallOfTextParagraphs: [
    { startIndex: 220, endIndex: 420 }
  ]
};

// Mock functions for required props
const mockProps = {
  deviceType: 'standard' as const,
  writingGoal: 'general' as const,
  text: 'This is a sample text for testing purposes.',
  onHighlight: jest.fn(),
  onDeviceChange: jest.fn(),
  onWritingGoalChange: jest.fn(),
  onTargetKeywordChange: jest.fn(),
};

describe('WordCountDisplay', () => {
  it('should render all core counts', () => {
    render(<WordCountDisplay stats={mockStats} {...mockProps} />);
    
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(3); // Multiple instances of '2'
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should render averages and lengths', () => {
    render(<WordCountDisplay stats={mockStats} {...mockProps} />);
    
    expect(screen.getByText('25 words')).toBeInTheDocument();
    expect(screen.getByText('8 words')).toBeInTheDocument();
    expect(screen.getByText('20 words')).toBeInTheDocument();
    expect(screen.getByText('100 chars')).toBeInTheDocument();
    expect(screen.getByText('5 chars')).toBeInTheDocument();
  });

  it('should render readability and time metrics', () => {
    render(<WordCountDisplay stats={mockStats} {...mockProps} />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('2m 30s')).toBeInTheDocument();
    expect(screen.getByText('3m 15s')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('should render keywords with density', () => {
    render(<WordCountDisplay stats={mockStats} {...mockProps} />);
    
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('5×')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    
    expect(screen.getByText('example')).toBeInTheDocument();
    expect(screen.getByText('3×')).toBeInTheDocument();
    expect(screen.getByText('3%')).toBeInTheDocument();
  });

  it('should render bigrams and trigrams', () => {
    render(<WordCountDisplay stats={mockStats} {...mockProps} />);
    
    expect(screen.getByText('test example')).toBeInTheDocument();
    expect(screen.getByText('test example phrase')).toBeInTheDocument();
  });

  it('should render stylistic suggestions', () => {
    render(<WordCountDisplay stats={mockStats} {...mockProps} />);
    
    expect(screen.getByText('Advanced Readability')).toBeInTheDocument();
    expect(screen.getByText('Passive Voice')).toBeInTheDocument();
    expect(screen.getByText('Adverbs (-ly)')).toBeInTheDocument();
    expect(screen.getByText('Weakening Phrases')).toBeInTheDocument();
  });

  it('should handle empty keywords gracefully', () => {
    const emptyStats = { 
      ...mockStats, 
      topKeywords: [], 
      topBigrams: [], 
      topTrigrams: [],
      passiveVoiceSentences: [],
      adverbs: [],
      weakeningPhrases: []
    };
    render(<WordCountDisplay stats={emptyStats} {...mockProps} />);
    
    expect(screen.getAllByText('No keywords found')).toHaveLength(1);
    expect(screen.getAllByText('No phrases found')).toHaveLength(2);
  });

  it('should format time correctly for seconds only', () => {
    const statsWithSecondsOnly = {
      ...mockStats,
      readingTime: { minutes: 0, seconds: 45 },
      speakingTime: { minutes: 0, seconds: 30 },
    };
    
    render(<WordCountDisplay stats={statsWithSecondsOnly} {...mockProps} />);
    
    expect(screen.getByText('45s')).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('should format handwriting time correctly for minutes only', () => {
    const statsWithMinutesOnly = {
      ...mockStats,
      handwritingTime: { hours: 0, minutes: 45 },
    };
    
    render(<WordCountDisplay stats={statsWithMinutesOnly} {...mockProps} />);
    
    expect(screen.getByText('45m')).toBeInTheDocument();
  });
});