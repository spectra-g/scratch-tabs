import React, { useState, useMemo } from 'react';
import { Tablet, TabletState } from '../types';
import { FileText } from 'lucide-react';
import { analyzeText, WordCountStats } from './utils/textAnalysis';
import { WordCountInput } from './components/WordCountInput';
import { WordCountDisplay } from './components/WordCountDisplay';

interface WordCountTabletState extends TabletState {
  type: 'wordcount';
  data: {
    text: string;
  };
}

const WordCountTabletComponent: React.FC<{
  state: WordCountTabletState;
  onChange: (state: WordCountTabletState) => void;
}> = ({ state, onChange }) => {
  const { data } = state;

  // Memoized text analysis - only recalculates when text changes
  const stats: WordCountStats = useMemo(() => {
    return analyzeText(data.text);
  }, [data.text]);

  const handleTextChange = (newText: string) => {
    onChange({
      ...state,
      data: {
        ...data,
        text: newText,
      },
    });
  };

  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b border-gray-700/50 p-4">
        <div className="flex items-center space-x-3">
          <FileText className="text-blue-400" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Word Count</h2>
            <p className="text-sm text-gray-400">
              Comprehensive text analysis and statistics
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Input Section */}
          <WordCountInput
            value={data.text}
            onChange={handleTextChange}
          />

          {/* Stats Display */}
          {data.text.trim() ? (
            <WordCountDisplay stats={stats} />
          ) : (
            <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-8 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                No Text to Analyze
              </h3>
              <p className="text-gray-500">
                Enter or paste some text above to see detailed statistics and analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const WordCountTablet: Tablet = {
  id: 'wordcount',
  label: 'Word Count',
  keywords: [
    'word',
    'count',
    'text',
    'analysis',
    'statistics',
    'readability',
    'writing',
    'seo',
    'keywords',
    'density',
    'flesch',
    'kincaid',
    'syllables',
    'sentences',
    'paragraphs',
    'characters',
  ],

  createInitialState(): WordCountTabletState {
    return {
      type: 'wordcount',
      data: {
        text: '',
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const defaultState = this.createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'wordcount' && parsed.data) {
        return {
          type: 'wordcount',
          data: {
            text: parsed.data.text || '',
          },
        };
      }
    } catch (e) {
      console.error('Failed to deserialize word count state:', e);
    }
    return defaultState;
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const wordCountState = state as WordCountTabletState;
    return (
      <WordCountTabletComponent
        state={wordCountState}
        onChange={onChange as (newState: WordCountTabletState) => void}
      />
    );
  },
};