import React, { useState, useEffect, useRef } from 'react';
import { Search, Copy, Download, Eye, Code, AlertCircle, Check } from 'lucide-react';
import { Tablet, TabletState } from '../types';
import { RegexTesterData, ViewMode } from './types';
import { DEFAULT_FLAGS, executeRegex, validateRegex, explainRegex } from './utils/regexEngine';
import { getSnippetById } from './utils/snippets';
import { RegexEditor } from './components/RegexEditor';
import { MatchPreview } from './components/MatchPreview';
import { ExplanationView } from './components/ExplanationView';
import { SnippetSelector } from './components/SnippetSelector';

interface RegexTabletState extends TabletState {
  type: 'regex';
  data: RegexTesterData;
}

const DEFAULT_PATTERN = '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})';
const DEFAULT_TEST_STRING = `Today is 2024-03-15 and tomorrow will be 2024-03-16.
Meeting scheduled for 2024-04-01 at 14:30.
Project deadline: 2024-12-25`;

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

export const RegexTablet: Tablet = {
  id: 'regex',
  label: 'Regex Tester',
  keywords: ['regex', 'regexp', 'pattern', 'match', 'test', 'validate', 'expression'],

  createInitialState(): RegexTabletState {
    return {
      type: 'regex',
      data: {
        pattern: DEFAULT_PATTERN,
        testString: DEFAULT_TEST_STRING,
        flags: [...DEFAULT_FLAGS],
        matches: [],
        error: null,
        explanation: [],
        selectedSnippet: null,
        diffMode: false,
        diffPattern: '',
        diffName1: 'Regex 1',
        diffName2: 'Regex 2',
        diffResult: null,
        notes: ''
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'regex' && parsed.data) {
        return {
          ...parsed,
          data: {
            ...parsed.data,
            flags: parsed.data.flags || [...DEFAULT_FLAGS],
            matches: parsed.data.matches || [],
            explanation: parsed.data.explanation || [],
            error: parsed.data.error || null
          }
        };
      }
    } catch (e) {
      console.error('Failed to deserialize regex state:', e);
    }
    return RegexTablet.createInitialState();
  },

  render(state: RegexTabletState, onChange) {
    const { data } = state;
    const [viewMode, setViewMode] = useState<ViewMode>('test');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Use refs to avoid stale closures
    const stateRef = useRef(state);
    const onChangeRef = useRef(onChange);
    stateRef.current = state;
    onChangeRef.current = onChange;

    // Extract primitive values to avoid object reference issues
    const pattern = data.pattern;
    const testString = data.testString;
    const flags = data.flags;

    const updateData = (newData: Partial<RegexTesterData>) => {
      onChange({ ...state, data: { ...data, ...newData } });
    };

    // Execute regex when pattern, test string, or flags change
    useEffect(() => {
      let newData: Partial<RegexTesterData>;
      
      if (!pattern) {
        newData = { matches: [], error: null, explanation: [] };
      } else {
        const error = validateRegex(pattern, flags);
        if (error) {
          newData = { error, matches: [], explanation: [] };
        } else {
          const matches = executeRegex(pattern, testString, flags);
          const explanation = explainRegex(pattern);
          newData = { matches, error: null, explanation };
        }
      }
      
      // Get current values from refs
      const currentState = stateRef.current;
      const currentData = currentState.data;
      
      // Only update if there are actual changes
      const hasChanges = 
        JSON.stringify(newData.matches) !== JSON.stringify(currentData.matches) ||
        newData.error?.message !== currentData.error?.message ||
        JSON.stringify(newData.explanation) !== JSON.stringify(currentData.explanation);
        
      if (hasChanges) {
        onChangeRef.current({ ...currentState, data: { ...currentData, ...newData } });
      }
    }, [pattern, testString, JSON.stringify(flags)]);

    const handlePatternChange = (pattern: string) => {
      updateData({ pattern });
    };

    const handleTestStringChange = (testString: string) => {
      updateData({ testString });
    };

    const handleFlagToggle = (flagToToggle: string) => {
      const newFlags = data.flags.map(flag =>
        flag.flag === flagToToggle ? { ...flag, enabled: !flag.enabled } : flag
      );
      updateData({ flags: newFlags });
    };

    const handleSnippetSelect = (snippetId: string) => {
      const snippet = getSnippetById(snippetId);
      if (snippet) {
        updateData({ 
          pattern: snippet.pattern,
          selectedSnippet: snippetId
        });
      }
    };

    const handleCopy = async (text: string, id: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    };

    const handleExport = () => {
      const exportData = {
        pattern: data.pattern,
        flags: data.flags.filter(f => f.enabled).map(f => f.flag).join(''),
        testString: data.testString,
        matches: data.matches,
        explanation: data.explanation,
        notes: data.notes,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
      link.setAttribute('href', url);
      link.setAttribute('download', `regex_test_${timestamp}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="h-full flex flex-col bg-gray-900 text-gray-200">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
              <Search size={20} />
              Regex Tester
            </h1>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50">
                <button
                  onClick={() => setViewMode('test')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'test' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Search size={14} className="inline mr-1" />
                  Test
                </button>
                <button
                  onClick={() => setViewMode('explain')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'explain' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Eye size={14} className="inline mr-1" />
                  Explain
                </button>
                <button
                  onClick={() => setViewMode('export')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'export' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Code size={14} className="inline mr-1" />
                  Export
                </button>
              </div>

              <button
                onClick={handleExport}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors"
                title="Export test data"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* Regex Pattern Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-300">Pattern:</div>
              {data.error && (
                <div className="flex items-center text-red-400 text-xs">
                  <AlertCircle size={14} className="mr-1" />
                  {data.error.message}
                </div>
              )}
            </div>
            
            <RegexEditor
              value={data.pattern}
              onChange={handlePatternChange}
              error={data.error}
            />

            {/* Flags */}
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-300">Flags:</div>
              <div className="flex gap-2">
                {data.flags.map(flag => (
                  <button
                    key={flag.flag}
                    onClick={() => handleFlagToggle(flag.flag)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      flag.enabled
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:text-gray-200'
                    }`}
                    title={flag.description}
                  >
                    {flag.flag}
                  </button>
                ))}
              </div>
              
              <div className="ml-auto">
                <div className="text-xs text-gray-500">
                  {data.matches.length} match{data.matches.length !== 1 ? 'es' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel */}
          <div className="w-1/2 flex flex-col border-r border-gray-700/50">
            {/* Snippets */}
            <div className="flex-shrink-0 border-b border-gray-700/50 p-3">
              <SnippetSelector
                selectedSnippet={data.selectedSnippet}
                onSnippetSelect={handleSnippetSelect}
              />
            </div>

            {/* Test String */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
                <div className="text-sm font-medium text-gray-300">Test String:</div>
                <button
                  onClick={() => handleCopy(data.testString, 'test-string')}
                  className={`p-1 rounded transition-colors ${
                    copiedId === 'test-string'
                      ? 'text-green-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                  title="Copy test string"
                >
                  {copiedId === 'test-string' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              
              <div className="flex-1 p-3">
                <textarea
                  value={data.testString}
                  onChange={(e) => handleTestStringChange(e.target.value)}
                  className="w-full h-full bg-gray-900/50 border border-gray-700/50 rounded-md p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="Enter your test string here..."
                />
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-1/2 flex flex-col">
            {viewMode === 'test' && (
              <MatchPreview
                matches={data.matches}
                testString={data.testString}
                onCopy={handleCopy}
                copiedId={copiedId}
              />
            )}
            
            {viewMode === 'explain' && (
              <ExplanationView
                explanation={data.explanation}
                pattern={data.pattern}
              />
            )}
            
            {viewMode === 'export' && (
              <div className="flex-1 p-4">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 h-full">
                  <h3 className="text-lg font-medium text-gray-100 mb-4">Export</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notes:
                      </label>
                      <textarea
                        value={data.notes}
                        onChange={(e) => updateData({ notes: e.target.value })}
                        className="w-full h-24 bg-gray-900/50 border border-gray-700/50 rounded-md p-3 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                        placeholder="Add notes about this regex pattern..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={handleExport}
                        className="w-full p-3 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        Export Test Data (JSON)
                      </button>
                      
                      <button
                        onClick={() => handleCopy(data.pattern, 'pattern')}
                        className={`w-full p-3 rounded-md transition-colors flex items-center justify-center gap-2 ${
                          copiedId === 'pattern'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700/70'
                        }`}
                      >
                        {copiedId === 'pattern' ? <Check size={16} /> : <Copy size={16} />}
                        Copy Pattern
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
}; 