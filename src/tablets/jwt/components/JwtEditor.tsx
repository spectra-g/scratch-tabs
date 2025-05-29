import React, { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Clock, AlertTriangle, Key, FileDown } from 'lucide-react';
import { signJwt, formatTimestamp, getTimeDifference } from '../utils/jwtUtils';
import { KeyInput } from './ui/KeyInput';
import { Button } from './ui/Button';
import { CopyButton } from './ui/CopyButton';
import { Alert } from './ui/Alert';
import { KeyType, StoredKey, STANDARD_CLAIMS, SUPPORTED_ALGORITHMS, JWT_TEMPLATES } from '../types';

interface JwtEditorProps {
  header: Record<string, any>;
  payload: Record<string, any>;
  signingKey: string;
  signingKeyType: KeyType;
  signingAlgorithm: string;
  onHeaderChange: (header: Record<string, any>) => void;
  onPayloadChange: (payload: Record<string, any>) => void;
  onSigningKeyChange: (key: string, type: KeyType) => void;
  onSigningAlgorithmChange: (algorithm: string) => void;
  onTokenGenerated: (
    token: string,
    header: Record<string, any>,
    payload: Record<string, any>,
    signature: string
  ) => void;
  storedKeys: StoredKey[];
  onUseStoredKey: (key: StoredKey) => void;
}

export const JwtEditor: React.FC<JwtEditorProps> = ({
  header,
  payload,
  signingKey,
  signingKeyType,
  signingAlgorithm,
  onHeaderChange,
  onPayloadChange,
  onSigningKeyChange,
  onSigningAlgorithmChange,
  onTokenGenerated,
  storedKeys,
  onUseStoredKey
}) => {
  const [headerJson, setHeaderJson] = useState('');
  const [payloadJson, setPayloadJson] = useState('');
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Initialize header and payload JSON
  useEffect(() => {
    try {
      setHeaderJson(JSON.stringify(header, null, 2));
    } catch (error) {
      setHeaderJson('{}');
    }
  }, [header]);
  
  useEffect(() => {
    try {
      setPayloadJson(JSON.stringify(payload, null, 2));
    } catch (error) {
      setPayloadJson('{}');
    }
  }, [payload]);
  
  // Update header when JSON changes
  const handleHeaderChange = (value: string | undefined) => {
    setHeaderJson(value || '');
    try {
      const parsed = JSON.parse(value || '{}');
      onHeaderChange(parsed);
      setHeaderError(null);
    } catch (error) {
      setHeaderError('Invalid JSON');
    }
  };
  
  // Update payload when JSON changes
  const handlePayloadChange = (value: string | undefined) => {
    setPayloadJson(value || '');
    try {
      const parsed = JSON.parse(value || '{}');
      onPayloadChange(parsed);
      setPayloadError(null);
    } catch (error) {
      setPayloadError('Invalid JSON');
    }
  };
  
  // Generate token
  const handleGenerateToken = async () => {
    if (headerError || payloadError) {
      setSigningError('Please fix JSON errors before generating token');
      return;
    }
    
    if (!signingKey) {
      setSigningError('Signing key is required');
      return;
    }
    
    setIsGenerating(true);
    setSigningError(null);
    
    try {
      // Ensure header has alg property
      const headerWithAlg = { ...header, alg: signingAlgorithm };
      
      // Sign the token
      const result = await signJwt(headerWithAlg, payload, signingKey, signingKeyType);
      
      if (result.error) {
        setSigningError(result.error);
      } else {
        setGeneratedToken(result.token);
        
        // Split the token to get the signature
        const parts = result.token.split('.');
        const signature = parts.length === 3 ? parts[2] : '';
        
        onTokenGenerated(result.token, headerWithAlg, payload, signature);
      }
    } catch (error) {
      setSigningError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Load template
  const handleLoadTemplate = (templateIndex: number) => {
    const template = JWT_TEMPLATES[templateIndex];
    if (!template) return;
    
    onHeaderChange(template.header);
    onPayloadChange(template.payload);
  };
  
  // Add standard claim
  const handleAddStandardClaim = (claim: string) => {
    try {
      const parsed = JSON.parse(payloadJson);
      
      // If claim already exists, don't overwrite
      if (parsed[claim] !== undefined) return;
      
      // Add claim with default value
      if (STANDARD_CLAIMS[claim].isTimestamp) {
        parsed[claim] = Math.floor(Date.now() / 1000);
      } else {
        parsed[claim] = '';
      }
      
      onPayloadChange(parsed);
    } catch (error) {
      setPayloadError('Invalid JSON');
    }
  };
  
  // Set expiration time
  const handleSetExpiration = (minutes: number) => {
    try {
      const parsed = JSON.parse(payloadJson);
      parsed.exp = Math.floor(Date.now() / 1000) + (minutes * 60);
      onPayloadChange(parsed);
    } catch (error) {
      setPayloadError('Invalid JSON');
    }
  };
  
  // Filter stored keys based on algorithm
  const filteredStoredKeys = storedKeys.filter(key => {
    // For symmetric algorithms (HS*), any key is fine
    if (signingAlgorithm.startsWith('HS')) {
      return !key.algorithm || key.algorithm.startsWith('HS');
    }
    
    // For asymmetric algorithms (RS*, ES*, PS*), we need a private key
    // Private keys have isPublic = false
    return !key.isPublic && 
           // Either the key has no algorithm specified or it matches our selected algorithm
           (!key.algorithm || key.algorithm === signingAlgorithm || 
            // Match algorithm family (RS*, ES*, PS*)
            (key.algorithm && signingAlgorithm.substring(0, 2) === key.algorithm.substring(0, 2)));
  });

  // Download generated token
  const handleDownloadToken = () => {
    if (!generatedToken) return;
    
    const blob = new Blob([generatedToken], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token.jwt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Render timestamp helper for standard claims
  const renderTimestampHelper = (claim: string, value: number) => {
    if (!STANDARD_CLAIMS[claim]?.isTimestamp) return null;
    
    return (
      <div className="text-xs text-gray-400 mt-1">
        <div className="flex items-center">
          <Clock size={12} className="mr-1" />
          <span>{formatTimestamp(value)}</span>
        </div>
        <div className="mt-0.5">
          {getTimeDifference(value)}
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Templates */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Templates</h3>
        <div className="flex flex-wrap gap-2">
          {JWT_TEMPLATES.map((template, index) => (
            <Button
              key={index}
              onClick={() => handleLoadTemplate(index)}
              variant="secondary"
              size="sm"
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Header Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Header</h3>
          {headerError && (
            <span className="text-xs text-red-400">{headerError}</span>
          )}
        </div>
        <div className="border border-gray-700/50 rounded-md overflow-hidden">
          <Editor
            height="150px"
            language="json"
            value={headerJson}
            onChange={handleHeaderChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      </div>
      
      {/* Payload Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Payload</h3>
          {payloadError && (
            <span className="text-xs text-red-400">{payloadError}</span>
          )}
        </div>
        
        {/* Standard Claims Helpers */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs text-gray-400">Add standard claim:</span>
          {Object.keys(STANDARD_CLAIMS).map((claim) => (
            <button
              key={claim}
              onClick={() => handleAddStandardClaim(claim)}
              className="px-2 py-0.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-gray-300 transition-colors"
              title={STANDARD_CLAIMS[claim].description}
            >
              {claim}
            </button>
          ))}
        </div>
        
        {/* Expiration Helpers */}
        {payload.exp && (
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs text-gray-400">Set expiration:</span>
            <button
              key="5min"
              onClick={() => handleSetExpiration(5)}
              className="px-2 py-0.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-gray-300 transition-colors"
            >
              5 min
            </button>
            <button
              key="1hour"
              onClick={() => handleSetExpiration(60)}
              className="px-2 py-0.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-gray-300 transition-colors"
            >
              1 hour
            </button>
            <button
              key="1day"
              onClick={() => handleSetExpiration(1440)}
              className="px-2 py-0.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-gray-300 transition-colors"
            >
              1 day
            </button>
            <button
              key="1week"
              onClick={() => handleSetExpiration(10080)}
              className="px-2 py-0.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-gray-300 transition-colors"
            >
              1 week
            </button>
          </div>
        )}
        
        {/* Timestamp Helpers */}
        {Object.entries(payload).map(([key, value]) => 
          typeof value === 'number' && STANDARD_CLAIMS[key]?.isTimestamp
            ? <div key={key}>{renderTimestampHelper(key, value)}</div>
            : null
        )}
        
        <div className="border border-gray-700/50 rounded-md overflow-hidden">
          <Editor
            height="250px"
            language="json"
            value={payloadJson}
            onChange={handlePayloadChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      </div>
      
      {/* Signing Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Signing Options</h3>
        
        {/* Signing Algorithm */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Signing Algorithm</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {SUPPORTED_ALGORITHMS.map(alg => (
              <Button
                key={alg.id}
                onClick={() => onSigningAlgorithmChange(alg.id)}
                variant={signingAlgorithm === alg.id ? 'primary' : 'secondary'}
                size="sm"
              >
                {alg.id}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Signing Key */}
        <KeyInput
          value={signingKey}
          onChange={onSigningKeyChange}
          type={signingKeyType}
          onTypeChange={(type) => onSigningKeyChange(signingKey, type)}
          label={signingAlgorithm.startsWith('HS') ? 'Secret' : 'Private Key'}
          placeholder={signingAlgorithm.startsWith('HS') ? 'Enter secret...' : 'Enter private key...'}
          isPrivate={true}
        />
        
        {/* Stored Keys */}
        {filteredStoredKeys.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Stored Keys</h3>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
              <div className="space-y-2">
                {filteredStoredKeys.map((key) => (
                  <div key={key.name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{key.name}</p>
                      <p className="text-xs text-gray-400">
                        {key.algorithm || 'Any'} • {key.type} • {key.isPublic ? 'Public' : 'Private'}
                      </p>
                    </div>
                    <Button
                      onClick={() => onUseStoredKey(key)}
                      variant="secondary"
                      size="sm"
                      icon={Key}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Generate Button */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleGenerateToken}
            variant="primary"
            size="md"
            disabled={isGenerating || !!headerError || !!payloadError || !signingKey}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                Generating...
              </>
            ) : (
              'Generate Token'
            )}
          </Button>
          
          {signingError && (
            <span className="text-sm text-red-400">{signingError}</span>
          )}
        </div>
      </div>
      
      {/* Generated Token */}
      {generatedToken && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Generated Token</h3>
            <div className="flex items-center space-x-2">
              <CopyButton 
                text={generatedToken} 
                label="Copy Token" 
              />
              <Button
                onClick={handleDownloadToken}
                variant="secondary"
                size="sm"
                icon={FileDown}
                title="Download token as file"
              >
                Download
              </Button>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
            <div className="font-mono text-sm text-gray-300 break-all">
              {generatedToken}
            </div>
          </div>
        </div>
      )}
      
      {/* Security Warning */}
      <div className="pt-2">
        <Alert variant="warning" title="Security Warning">
          <div className="flex items-center">
            <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
            <span>
              Be careful when using private keys or secrets. All operations are performed client-side, but it's best practice to use test keys only.
            </span>
          </div>
        </Alert>
      </div>
    </div>
  );
};