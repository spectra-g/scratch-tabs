import React, { useState } from 'react';
import { Tablet, TabletState } from '../types';
import { Editor } from '@monaco-editor/react';
import { Play, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { detectLanguage } from '../../languages';

interface RunCodeState extends TabletState {
  type: 'runcode';
  data: {
    code: string;
    language: string;
    output: string;
    status: 'idle' | 'running' | 'success' | 'error';
    error?: string;
  };
}

// Map our language IDs to Piston's runtime IDs
const languageToRuntime: Record<string, string> = {
  'python': 'python',
  'javascript': 'node-javascript',
  'typescript': 'node-typescript',
  'java': 'java',
  'c': 'c',
  'cpp': 'c++',
  'csharp': 'c#',
  'go': 'go',
  'rust': 'rust',
  'ruby': 'ruby',
  'php': 'php',
};

// Languages supported by Piston
const supportedLanguages = new Set(Object.keys(languageToRuntime));

export const RunCodeTablet: Tablet = {
  id: 'runcode',
  label: 'Run Code',
  keywords: ['code', 'execute', 'run', 'compiler', 'interpreter'],

  createInitialState(): RunCodeState {
    return {
      type: 'runcode',
      data: {
        code: '',
        language: 'plaintext',
        output: '',
        status: 'idle'
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },

  render(state: RunCodeState, onChange) {
    const [isExecuting, setIsExecuting] = useState(false);

    const handleCodeChange = (code: string | undefined) => {
      if (code === undefined) return;

      // Detect language from code
      const detectedLanguage = detectLanguage(code);

      onChange({
        ...state,
        data: {
          ...state.data,
          code,
          language: detectedLanguage,
          status: 'idle',
          output: '',
          error: undefined
        }
      });
    };

    const executeCode = async () => {
      const runtime = languageToRuntime[state.data.language];
      if (!runtime) {
        onChange({
          ...state,
          data: {
            ...state.data,
            status: 'error',
            error: `Language '${state.data.language}' is not supported for execution.`
          }
        });
        return;
      }

      setIsExecuting(true);
      onChange({
        ...state,
        data: {
          ...state.data,
          status: 'running',
          output: '',
          error: undefined
        }
      });

      try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            language: runtime,
            version: '*',
            files: [{
              content: state.data.code
            }]
          })
        });

        const result = await response.json();

        if (result.run?.output) {
          onChange({
            ...state,
            data: {
              ...state.data,
              status: 'success',
              output: result.run.output
            }
          });
        } else if (result.run?.stderr) {
          onChange({
            ...state,
            data: {
              ...state.data,
              status: 'error',
              error: result.run.stderr
            }
          });
        } else {
          onChange({
            ...state,
            data: {
              ...state.data,
              status: 'error',
              error: 'No output received from execution'
            }
          });
        }
      } catch (error) {
        onChange({
          ...state,
          data: {
            ...state.data,
            status: 'error',
            error: 'Failed to execute code. Please try again.'
          }
        });
      } finally {
        setIsExecuting(false);
      }
    };

    const canExecute = supportedLanguages.has(state.data.language) && !isExecuting;

    return (
      <div className="flex h-full bg-gray-900">
        {/* Code Editor */}
        <div className="w-1/2 border-r border-gray-700/50">
          <div className="h-full">
            <Editor
              height="100%"
              language={state.data.language}
              value={state.data.code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <h2 className="text-gray-200 font-medium">Output</h2>
              {state.data.status === 'running' && (
                <Loader2 size={16} className="text-blue-400 animate-spin" />
              )}
              {state.data.status === 'success' && (
                <CheckCircle2 size={16} className="text-green-400" />
              )}
              {state.data.status === 'error' && (
                <AlertCircle size={16} className="text-red-400" />
              )}
            </div>
            <button
              onClick={executeCode}
              disabled={!canExecute}
              className={`
                flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium
                ${canExecute
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                }
                transition-colors
              `}
            >
              <Play size={16} />
              <span>Run</span>
            </button>
          </div>

          {/* Output Content */}
          <div className="flex-1 p-4 overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 hover:scrollbar-thumb-gray-500">
            {state.data.status === 'idle' && (
              <div className="text-gray-500 text-sm">
                {supportedLanguages.has(state.data.language)
                  ? 'Click Run to execute the code'
                  : `Language '${state.data.language}' is not supported for execution`
                }
              </div>
            )}
            {state.data.status === 'running' && (
              <div className="text-gray-400 text-sm">
                Executing code...
              </div>
            )}
            {state.data.status === 'success' && (
              <pre className="font-mono text-sm text-gray-200 whitespace-pre-wrap">
                {state.data.output}
              </pre>
            )}
            {state.data.status === 'error' && (
              <pre className="font-mono text-sm text-red-400 whitespace-pre-wrap">
                {state.data.error}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
};