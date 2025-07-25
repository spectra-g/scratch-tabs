import { renderHook, act } from '@testing-library/react';
import { useHighlighting } from '../useHighlighting';
import { WordCountStats } from '../../utils/textAnalysis';

const mockStats: WordCountStats = {
  words: 10,
  uniqueWords: 8,
  characters: 50,
  charactersNoSpaces: 40,
  sentences: 2,
  paragraphs: 1,
  lines: 2,
  longestSentence: 6,
  shortestSentence: 4,
  avgSentenceLength: 5.0,
  avgSentenceLengthChars: 25.0,
  avgWordLength: 4.0,
  syllables: 15,
  fleschKincaidGrade: 8.0,
  readingTime: { minutes: 0, seconds: 30 },
  speakingTime: { minutes: 0, seconds: 40 },
  handwritingTime: { hours: 0, minutes: 1 },
  topKeywords: [
    { word: 'test', count: 2, density: 20.0 }
  ],
  topBigrams: [],
  topTrigrams: [],
  passiveVoiceSentences: [
    { sentence: 'The ball was thrown', startIndex: 0, endIndex: 19 }
  ],
  adverbs: [
    { word: 'quickly', startIndex: 20, endIndex: 27 }
  ],
  weakeningPhrases: [
    { phrase: 'I think', startIndex: 30, endIndex: 37 }
  ],
};

describe('useHighlighting', () => {
  const mockText = 'The ball was thrown quickly. I think this is a test.';

  it('should initialize with no highlights', () => {
    const { result } = renderHook(() => useHighlighting(mockText, mockStats));
    
    expect(result.current.activeHighlight).toBe('');
    expect(result.current.highlights).toEqual([]);
  });

  it('should handle longest sentence highlighting', () => {
    const { result } = renderHook(() => useHighlighting(mockText, mockStats));
    
    act(() => {
      result.current.handleHighlight('longest-sentence');
    });
    
    expect(result.current.activeHighlight).toBe('longest-sentence');
  });

  it('should handle keyword highlighting', () => {
    const { result } = renderHook(() => useHighlighting(mockText, mockStats));
    
    act(() => {
      result.current.handleHighlight('keyword', 'test');
    });
    
    expect(result.current.activeHighlight).toBe('keyword-test');
  });

  it('should toggle off when clicking same highlight', () => {
    const { result } = renderHook(() => useHighlighting(mockText, mockStats));
    
    // First click
    act(() => {
      result.current.handleHighlight('passive-voice');
    });
    expect(result.current.activeHighlight).toBe('passive-voice');
    
    // Second click should toggle off
    act(() => {
      result.current.handleHighlight('passive-voice');
    });
    expect(result.current.activeHighlight).toBe('');
  });

  it('should handle stylistic analysis highlighting', () => {
    const { result } = renderHook(() => useHighlighting(mockText, mockStats));
    
    act(() => {
      result.current.handleHighlight('adverbs');
    });
    expect(result.current.activeHighlight).toBe('adverbs');
    
    act(() => {
      result.current.handleHighlight('weakening-phrases');
    });
    expect(result.current.activeHighlight).toBe('weakening-phrases');
  });

  it('should clear highlights', () => {
    const { result } = renderHook(() => useHighlighting(mockText, mockStats));
    
    act(() => {
      result.current.handleHighlight('passive-voice');
    });
    expect(result.current.activeHighlight).toBe('passive-voice');
    
    act(() => {
      result.current.clearHighlights();
    });
    expect(result.current.activeHighlight).toBe('');
    expect(result.current.highlights).toEqual([]);
  });
});