import React from 'react';
import { Editor } from '@monaco-editor/react';
import { BodyType, HttpRequestBody, RawBodyFormat } from '../types';
import { KeyValueEditor } from './KeyValueEditor';

interface BodyEditorProps {
  body: HttpRequestBody;
  onChange: (body: HttpRequestBody) => void;
}

export const BodyEditor: React.FC<BodyEditorProps> = ({
  body,
  onChange
}) => {
  const handleTypeChange = (type: BodyType) => {
    onChange({
      ...body,
      type
    });
  };
  
  const handleFormatChange = (format: RawBodyFormat) => {
    onChange({
      ...body,
      format
    });
  };
  
  const handleContentChange = (content: string | undefined) => {
    onChange({
      ...body,
      content: content || ''
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={() => handleTypeChange('none')}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${body.type === 'none'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }
            transition-colors
          `}
        >
          None
        </button>
        
        <button
          onClick={() => handleTypeChange('form-data')}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${body.type === 'form-data'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }
            transition-colors
          `}
        >
          form-data
        </button>
        
        <button
          onClick={() => handleTypeChange('x-www-form-urlencoded')}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${body.type === 'x-www-form-urlencoded'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }
            transition-colors
          `}
        >
          x-www-form-urlencoded
        </button>
        
        <button
          onClick={() => handleTypeChange('raw')}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${body.type === 'raw'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }
            transition-colors
          `}
        >
          raw
        </button>
        
        <button
          onClick={() => handleTypeChange('binary')}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${body.type === 'binary'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }
            transition-colors
          `}
        >
          binary
        </button>
      </div>
      
      {body.type === 'raw' && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={() => handleFormatChange('json')}
              className={`
                px-3 py-1.5 rounded-md text-sm
                ${body.format === 'json'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
                transition-colors
              `}
            >
              JSON
            </button>
            
            <button
              onClick={() => handleFormatChange('xml')}
              className={`
                px-3 py-1.5 rounded-md text-sm
                ${body.format === 'xml'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
                transition-colors
              `}
            >
              XML
            </button>
            
            <button
              onClick={() => handleFormatChange('html')}
              className={`
                px-3 py-1.5 rounded-md text-sm
                ${body.format === 'html'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
                transition-colors
              `}
            >
              HTML
            </button>
            
            <button
              onClick={() => handleFormatChange('text')}
              className={`
                px-3 py-1.5 rounded-md text-sm
                ${body.format === 'text' || !body.format
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
                transition-colors
              `}
            >
              Text
            </button>
            
            <button
              onClick={() => handleFormatChange('javascript')}
              className={`
                px-3 py-1.5 rounded-md text-sm
                ${body.format === 'javascript'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }
                transition-colors
              `}
            >
              JavaScript
            </button>
          </div>
          
          <div className="border border-gray-700/50 rounded-md overflow-hidden">
            <Editor
              height="200px"
              language={body.format || 'text'}
              value={body.content}
              onChange={handleContentChange}
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
      )}
      
      {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && (
        <KeyValueEditor
          pairs={body.params}
          onChange={(params) => onChange({ ...body, params })}
          placeholder={body.type === 'form-data' ? 'Field name' : 'Parameter name'}
          valuePlaceholder="Value"
        />
      )}
      
      {body.type === 'binary' && (
        <div className="text-center text-gray-400 py-4">
          Binary file upload is not supported in this version.
        </div>
      )}
    </div>
  );
};