import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { FileDown, FileUp, Trash2, AlertTriangle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { decodeJwt } from '../utils/jwtUtils';
import { CopyButton } from './ui/CopyButton';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

interface JwtDecoderProps {
  token: string;
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  error: string | null;
  onTokenChange: (
    token: string,
    header: Record<string, any>,
    payload: Record<string, any>,
    signature: string,
    error: string | null
  ) => void;
}

export const JwtDecoder: React.FC<JwtDecoderProps> = ({
  token,
  header,
  payload,
  signature,
  error,
  onTokenChange
}) => {
  const [localToken, setLocalToken] = useState(token);
  
  // Update local token when prop changes
  useEffect(() => {
    setLocalToken(token);
  }, [token]);
  
  // Decode token when local token changes
  const decodeToken = useCallback((tokenToDecode: string) => {
    if (!tokenToDecode.trim()) {
      onTokenChange('', {}, {}, '', null);
      return;
    }
    
    try {
      const { header, payload, signature } = decodeJwt(tokenToDecode);
      onTokenChange(tokenToDecode, header, payload, signature, null);
    } catch (error) {
      onTokenChange(
        tokenToDecode,
        {},
        {},
        '',
        error instanceof Error ? error.message : String(error)
      );
    }
  }, [onTokenChange]);
  
  // Handle token input change
  const handleTokenChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newToken = e.target.value;
    setLocalToken(newToken);
    decodeToken(newToken);
  };
  
  // Clear token
  const handleClearToken = () => {
    setLocalToken('');
    onTokenChange('', {}, {}, '', null);
  };
  
  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const reader = new FileReader();
    
    reader.onload = () => {
      const content = reader.result as string;
      setLocalToken(content.trim());
      decodeToken(content.trim());
    };
    
    reader.readAsText(file);
  }, [decodeToken]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.jwt'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    multiple: false
  });
  
  // Download token as file
  const handleDownloadToken = () => {
    if (!token) return;
    
    const blob = new Blob([token], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token.jwt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Token Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-300">
            JWT Token
          </label>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleClearToken}
              variant="secondary"
              size="sm"
              icon={Trash2}
              disabled={!localToken}
              title="Clear token"
            >
              Clear
            </Button>
            <Button
              onClick={handleDownloadToken}
              variant="secondary"
              size="sm"
              icon={FileDown}
              disabled={!token || !!error}
              title="Download token as file"
            >
              Download
            </Button>
          </div>
        </div>
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-md transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <textarea
            value={localToken}
            onChange={handleTokenChange}
            placeholder="Paste your JWT token here or drop a file..."
            rows={4}
            className="w-full bg-transparent px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
          <input {...getInputProps()} />
          
          <div className="px-3 py-2 text-center border-t border-gray-700">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <FileUp size={16} />
              <span>Drop a JWT file here, or click to select a file</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <Alert variant="error" title="Error Decoding JWT">
          {error}
        </Alert>
      )}
      
      {/* Decoded Sections */}
      {token && !error && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Header</h3>
              <CopyButton 
                text={JSON.stringify(header, null, 2)} 
                label="Copy Header" 
              />
            </div>
            <div className="border border-gray-700/50 rounded-md overflow-hidden">
              <Editor
                height="150px"
                language="json"
                value={JSON.stringify(header, null, 2)}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  padding: { top: 8, bottom: 8 },
                }}
              />
            </div>
          </div>
          
          {/* Payload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Payload</h3>
              <CopyButton 
                text={JSON.stringify(payload, null, 2)} 
                label="Copy Payload" 
              />
            </div>
            <div className="border border-gray-700/50 rounded-md overflow-hidden">
              <Editor
                height="250px"
                language="json"
                value={JSON.stringify(payload, null, 2)}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  padding: { top: 8, bottom: 8 },
                }}
              />
            </div>
          </div>
          
          {/* Signature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Signature</h3>
              <CopyButton 
                text={signature} 
                label="Copy Signature" 
              />
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
              <div className="font-mono text-sm text-gray-300 break-all">
                {signature}
              </div>
            </div>
          </div>
          
          {/* Security Notice */}
          <div className="pt-2">
            <Alert variant="info">
              <p>All JWT operations are performed client-side. No data is sent to any server.</p>
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
};