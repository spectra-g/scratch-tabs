import { useCallback, useRef, useState } from 'react';
import { 
  findLongestSentence, 
  findShortestSentence, 
  findKeywordInstances,
  WordCountStats 
} from '../utils/textAnalysis';

export interface HighlightRange {
  startIndex: number;
  endIndex: number;
  className: string;
}

export const useHighlighting = (text: string, stats: WordCountStats) => {
  const [activeHighlight, setActiveHighlight] = useState<string>('');
  const [highlights, setHighlights] = useState<HighlightRange[]>([]);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const clearHighlights = useCallback(() => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
    setHighlights([]);
    setActiveHighlight('');
  }, []);

  const applyHighlights = useCallback((ranges: HighlightRange[], highlightType: string) => {
    if (!editorRef.current) {
      setHighlights(ranges);
      setActiveHighlight(highlightType);
      return;
    }

    // Clear existing decorations
    if (decorationsRef.current.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }

    // Apply new decorations
    const decorations = ranges.map(range => {
      const startPos = editorRef.current.getModel().getPositionAt(range.startIndex);
      const endPos = editorRef.current.getModel().getPositionAt(range.endIndex);
      
      return {
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        options: {
          className: range.className,
          isWholeLine: false,
        },
      };
    });

    decorationsRef.current = editorRef.current.deltaDecorations([], decorations);
    setHighlights(ranges);
    setActiveHighlight(highlightType);
  }, []);

  const handleHighlight = useCallback((type: string, data?: any) => {
    // If clicking the same type, clear highlights
    if (activeHighlight === type || (type === 'keyword' && activeHighlight === `keyword-${data}`)) {
      clearHighlights();
      return;
    }

    let ranges: HighlightRange[] = [];
    let highlightType = type;

    switch (type) {
      case 'longest-sentence': {
        const longest = findLongestSentence(text);
        if (longest) {
          ranges = [{
            startIndex: longest.startIndex,
            endIndex: longest.endIndex,
            className: 'highlight-longest-sentence'
          }];
        }
        break;
      }
      
      case 'shortest-sentence': {
        const shortest = findShortestSentence(text);
        if (shortest) {
          ranges = [{
            startIndex: shortest.startIndex,
            endIndex: shortest.endIndex,
            className: 'highlight-shortest-sentence'
          }];
        }
        break;
      }
      
      case 'keyword': {
        const instances = findKeywordInstances(text, data);
        ranges = instances.map(instance => ({
          startIndex: instance.startIndex,
          endIndex: instance.endIndex,
          className: 'highlight-keyword'
        }));
        highlightType = `keyword-${data}`;
        break;
      }
      
      case 'passive-voice': {
        ranges = stats.passiveVoiceSentences.map(sentence => ({
          startIndex: sentence.startIndex,
          endIndex: sentence.endIndex,
          className: 'highlight-passive-voice'
        }));
        break;
      }
      
      case 'adverbs': {
        ranges = stats.adverbs.map(adverb => ({
          startIndex: adverb.startIndex,
          endIndex: adverb.endIndex,
          className: 'highlight-adverb'
        }));
        break;
      }
      
      case 'weakening-phrases': {
        ranges = stats.weakeningPhrases.map(phrase => ({
          startIndex: phrase.startIndex,
          endIndex: phrase.endIndex,
          className: 'highlight-weakening-phrase'
        }));
        break;
      }
    }

    if (ranges.length > 0) {
      applyHighlights(ranges, highlightType);
    }
  }, [text, stats, activeHighlight, applyHighlights, clearHighlights]);

  const setEditorRef = useCallback((editor: any) => {
    editorRef.current = editor;
    
    case 'wall-of-text': {
      ranges = stats.wallOfTextParagraphs.map(paragraph => ({
        startIndex: paragraph.startIndex,
        endIndex: paragraph.endIndex,
        className: 'highlight-wall-of-text'
      }));
      break;
    }
    
    // Apply any pending highlights
    if (highlights.length > 0) {
      applyHighlights(highlights, activeHighlight);
    }
  }, [highlights, activeHighlight, applyHighlights]);

  return {
    activeHighlight,
    highlights,
    handleHighlight,
    clearHighlights,
    setEditorRef
  };
};