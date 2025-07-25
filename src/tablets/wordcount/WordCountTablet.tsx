import React, { useState, useMemo } from 'react';
import { Tablet, TabletState } from '../types';
import { FileText } from 'lucide-react';
import { 
  analyzeText, 
  WordCountStats, 
  DeviceType, 
  WritingGoal,
  generateExportReport 
} from './utils/textAnalysis';
import { WordCountInput } from './components/WordCountInput';
import { WordCountDisplay } from './components/WordCountDisplay';
import { useHighlighting } from './hooks/useHighlighting';

interface WordCountTabletState extends TabletState {
  type: 'wordcount';
  data: {
    text: string;
    deviceType: DeviceType;
    writingGoal: WritingGoal;
    targetKeyword: string;
  };
}

const WordCountTabletComponent: React.FC<{
  state: WordCountTabletState;
  onChange: (state: WordCountTabletState) => void;
}> = ({ state, onChange }) => {
  const data = state.data || { text: '', deviceType: 'standard', writingGoal: 'general', targetKeyword: '' };
  const text = data.text || '';
  const deviceType = data.deviceType || 'standard';
  const writingGoal = data.writingGoal || 'general';
  const targetKeyword = data.targetKeyword || '';

  // Memoized text analysis - only recalculates when text changes
  const stats: WordCountStats = useMemo(() => {
    return analyzeText(text, deviceType);
  }, [text, deviceType]);
  
  // Memoized report generation - recalculates when any relevant data changes
  const reportContent: string = useMemo(() => {
    if (!text.trim()) return '';
    return generateExportReport(stats, deviceType, writingGoal, targetKeyword);
  }, [stats, deviceType, writingGoal, targetKeyword, text]);
  
  const {
    activeHighlight,
    handleHighlight,
    setEditorRef
  } = useHighlighting(text, stats);

  const handleTextChange = (newText: string) => {
    onChange({
      ...state,
      data: {
        ...data,
        text: newText,
      },
    });
  };

  const handleDeviceChange = (newDeviceType: DeviceType) => {
    onChange({
      ...state,
      data: {
        ...data,
        deviceType: newDeviceType,
      },
    });
  };

  const handleWritingGoalChange = (newWritingGoal: WritingGoal) => {
    onChange({
      ...state,
      data: {
        ...data,
        writingGoal: newWritingGoal,
      },
    });
  };

  const handleTargetKeywordChange = (newTargetKeyword: string) => {
    onChange({
      ...state,
      data: {
        ...data,
        targetKeyword: newTargetKeyword,
      },
    });
  };

  // Add CSS for highlighting classes
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .highlight-longest-sentence { background-color: rgba(59, 130, 246, 0.3) !important; }
      .highlight-shortest-sentence { background-color: rgba(16, 185, 129, 0.3) !important; }
      .highlight-keyword { background-color: rgba(34, 197, 94, 0.3) !important; }
      .highlight-passive-voice { background-color: rgba(245, 158, 11, 0.3) !important; }
      .highlight-adverb { background-color: rgba(249, 115, 22, 0.3) !important; }
      .highlight-weakening-phrase { background-color: rgba(239, 68, 68, 0.3) !important; }
      .highlight-wall-of-text { background-color: rgba(168, 85, 247, 0.3) !important; }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col overflow-hidden custom-scrollbar">
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

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden custom-scrollbar">
        {/* Left Column - Editor (60% width) */}
        <div className="flex-1 flex flex-col p-4 pr-2 min-w-0">
          <div className="flex-1 min-h-0">
            <WordCountInput
              value={text}
              onChange={handleTextChange}
              onEditorReady={setEditorRef}
              reportContent={reportContent}
            />
          </div>
        </div>

        {/* Right Column - Stats (40% width) */}
        <div className="w-2/5 flex flex-col p-4 pl-2 border-l border-gray-700/30">
          <div className="flex-1 overflow-auto custom-scrollbar">
            {text.trim() ? (
              <WordCountDisplay 
                stats={stats}
                deviceType={deviceType}
                writingGoal={writingGoal}
                targetKeyword={targetKeyword}
                onHighlight={handleHighlight}
                activeHighlight={activeHighlight}
                onDeviceChange={handleDeviceChange}
                onWritingGoalChange={handleWritingGoalChange}
                onTargetKeywordChange={handleTargetKeywordChange}
              />
            ) : (
              <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-6 text-center">
                <FileText size={32} className="mx-auto mb-3 text-gray-600" />
                <h3 className="text-base font-medium text-gray-400 mb-2">
                  No Text to Analyze
                </h3>
                <p className="text-sm text-gray-500">
                  Enter text to see statistics.
                </p>
              </div>
            )}
          </div>
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
        deviceType: 'standard',
        writingGoal: 'general',
        targetKeyword: '',
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
            deviceType: parsed.data.deviceType || 'standard',
            writingGoal: parsed.data.writingGoal || 'general',
            targetKeyword: parsed.data.targetKeyword || '',
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