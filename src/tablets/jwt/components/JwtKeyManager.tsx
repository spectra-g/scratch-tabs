import React, { useState } from 'react';
import { Key, Plus, Trash2, AlertTriangle, Copy, Check, Download } from 'lucide-react';
import { generateKeyPair, generateSecret, isPemFormat, isBase64 } from '../utils/jwtUtils';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { StoredKey, KeyType, SUPPORTED_ALGORITHMS } from '../types';

interface JwtKeyManagerProps {
  storedKeys: StoredKey[];
  onAddKey: (key: StoredKey) => void;
  onRemoveKey: (name: string) => void;
  onClearKeys: () => void;
}

export const JwtKeyManager: React.FC<JwtKeyManagerProps> = ({
  storedKeys,
  onAddKey,
  onRemoveKey,
  onClearKeys
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPublicKey, setGeneratedPublicKey] = useState('');
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [generationAlgorithm, setGenerationAlgorithm] = useState('HS256');
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyType, setKeyType] = useState<KeyType>('text');
  const [keyAlgorithm, setKeyAlgorithm] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Generate key pair
  const handleGenerateKeyPair = async () => {
    if (!generationAlgorithm) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const { publicKey, privateKey } = await generateKeyPair(generationAlgorithm);
      setGeneratedPublicKey(publicKey);
      setGeneratedPrivateKey(privateKey);
      setGeneratedSecret('');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Generate secret
  const handleGenerateSecret = () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const secret = generateSecret(32);
      setGeneratedSecret(secret);
      setGeneratedPublicKey('');
      setGeneratedPrivateKey('');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Store key
  const handleStoreKey = () => {
    if (!keyName.trim()) {
      setError('Key name is required');
      return;
    }
    
    if (!keyValue.trim()) {
      setError('Key value is required');
      return;
    }
    
    // Validate key format
    if (keyType === 'pem' && !isPemFormat(keyValue)) {
      setError('Invalid PEM format');
      return;
    }
    
    if (keyType === 'base64' && !isBase64(keyValue)) {
      setError('Invalid Base64 format');
      return;
    }
    
    const newKey: StoredKey = {
      name: keyName.trim(),
      value: keyValue.trim(),
      type: keyType,
      algorithm: keyAlgorithm || undefined,
      isPublic,
      createdAt: Date.now()
    };
    
    onAddKey(newKey);
    
    // Reset form
    setKeyName('');
    setKeyValue('');
    setKeyType('text');
    setKeyAlgorithm('');
    setIsPublic(false);
    setError(null);
  };
  
  // Store generated key
  const handleStoreGeneratedKey = (key: string, isPublic: boolean) => {
    if (!key) return;
    
    setKeyName(`${generationAlgorithm} ${isPublic ? 'Public' : 'Private'} Key`);
    setKeyValue(key);
    setKeyType('pem');
    setKeyAlgorithm(generationAlgorithm);
    setIsPublic(isPublic);
  };
  
  // Store generated secret
  const handleStoreGeneratedSecret = () => {
    if (!generatedSecret) return;
    
    setKeyName(`${generationAlgorithm} Secret`);
    setKeyValue(generatedSecret);
    setKeyType('base64');
    setKeyAlgorithm(generationAlgorithm);
    setIsPublic(false);
  };
  
  // Copy key to clipboard
  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy key:', error);
    }
  };
  
  // Download key as file
  const handleDownloadKey = (key: string, filename: string) => {
    const blob = new Blob([key], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Key Generation */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Generate Keys</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Algorithm
          </label>
          <select
            value={generationAlgorithm}
            onChange={(e) => setGenerationAlgorithm(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
          >
            {SUPPORTED_ALGORITHMS.map((alg) => (
              <option key={alg.id} value={alg.id}>
                {alg.name} ({alg.id})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleGenerateKeyPair}
            variant="primary"
            size="md"
            disabled={isGenerating || generationAlgorithm.startsWith('HS')}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                Generating...
              </>
            ) : (
              'Generate Key Pair'
            )}
          </Button>
          
          <Button
            onClick={handleGenerateSecret}
            variant="primary"
            size="md"
            disabled={isGenerating || !generationAlgorithm.startsWith('HS')}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                Generating...
              </>
            ) : (
              'Generate Secret'
            )}
          </Button>
        </div>
        
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}
        
        {/* Generated Keys */}
        {generatedPublicKey && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Public Key</h4>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleCopyKey(generatedPublicKey)}
                  variant="secondary"
                  size="sm"
                  icon={copiedKey === generatedPublicKey ? Check : Copy}
                  title={copiedKey === generatedPublicKey ? 'Copied!' : 'Copy to clipboard'}
                >
                  {copiedKey === generatedPublicKey ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  onClick={() => handleDownloadKey(generatedPublicKey, 'public_key.pem')}
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  title="Download as file"
                >
                  Download
                </Button>
                <Button
                  onClick={() => handleStoreGeneratedKey(generatedPublicKey, true)}
                  variant="secondary"
                  size="sm"
                  icon={Key}
                  title="Store key"
                >
                  Store
                </Button>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
              <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap break-all">
                {generatedPublicKey}
              </pre>
            </div>
          </div>
        )}
        
        {generatedPrivateKey && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Private Key</h4>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleCopyKey(generatedPrivateKey)}
                  variant="secondary"
                  size="sm"
                  icon={copiedKey === generatedPrivateKey ? Check : Copy}
                  title={copiedKey === generatedPrivateKey ? 'Copied!' : 'Copy to clipboard'}
                >
                  {copiedKey === generatedPrivateKey ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  onClick={() => handleDownloadKey(generatedPrivateKey, 'private_key.pem')}
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  title="Download as file"
                >
                  Download
                </Button>
                <Button
                  onClick={() => handleStoreGeneratedKey(generatedPrivateKey, false)}
                  variant="secondary"
                  size="sm"
                  icon={Key}
                  title="Store key"
                >
                  Store
                </Button>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
              <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap break-all">
                {generatedPrivateKey}
              </pre>
            </div>
            <Alert variant="warning" title="Security Warning">
              <div className="flex items-center">
                <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
                <span>
                  Never share your private key. For production use, store private keys securely and never in client-side code.
                </span>
              </div>
            </Alert>
          </div>
        )}
        
        {generatedSecret && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Secret</h4>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleCopyKey(generatedSecret)}
                  variant="secondary"
                  size="sm"
                  icon={copiedKey === generatedSecret ? Check : Copy}
                  title={copiedKey === generatedSecret ? 'Copied!' : 'Copy to clipboard'}
                >
                  {copiedKey === generatedSecret ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  onClick={() => handleDownloadKey(generatedSecret, 'secret.txt')}
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  title="Download as file"
                >
                  Download
                </Button>
                <Button
                  onClick={handleStoreGeneratedSecret}
                  variant="secondary"
                  size="sm"
                  icon={Key}
                  title="Store key"
                >
                  Store
                </Button>
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
              <div className="font-mono text-sm text-gray-300 break-all">
                {generatedSecret}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Store Key */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Store Key</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Key Name
            </label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Enter a name for this key"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Algorithm (Optional)
            </label>
            <select
              value={keyAlgorithm}
              onChange={(e) => setKeyAlgorithm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              <option value="">Any</option>
              {SUPPORTED_ALGORITHMS.map((alg) => (
                <option key={alg.id} value={alg.id}>
                  {alg.name} ({alg.id})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">
              Key Value
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setKeyType('text')}
                className={`px-2 py-1 text-xs rounded-md ${
                  keyType === 'text'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setKeyType('base64')}
                className={`px-2 py-1 text-xs rounded-md ${
                  keyType === 'base64'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                Base64
              </button>
              <button
                type="button"
                onClick={() => setKeyType('pem')}
                className={`px-2 py-1 text-xs rounded-md ${
                  keyType === 'pem'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                PEM
              </button>
            </div>
          </div>
          <textarea
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder="Enter key value..."
            rows={5}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700"
          />
          <label htmlFor="isPublic" className="ml-2 text-sm text-gray-300">
            This is a public key
          </label>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleStoreKey}
            variant="primary"
            size="md"
            icon={Plus}
            disabled={!keyName.trim() || !keyValue.trim()}
          >
            Store Key
          </Button>
          
          {error && (
            <span className="text-sm text-red-400">{error}</span>
          )}
        </div>
      </div>
      
      {/* Stored Keys */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Stored Keys</h3>
          {storedKeys.length > 0 && (
            <Button
              onClick={onClearKeys}
              variant="danger"
              size="sm"
              icon={Trash2}
            >
              Clear All
            </Button>
          )}
        </div>
        
        {storedKeys.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-4 text-center">
            <p className="text-sm text-gray-400">No keys stored yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {storedKeys.map((key) => (
              <div key={key.name} className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-200">{key.name}</h4>
                    <p className="text-xs text-gray-400">
                      {key.algorithm || 'Any'} • {key.type} • {key.isPublic ? 'Public' : 'Private/Secret'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleCopyKey(key.value)}
                      variant="secondary"
                      size="sm"
                      icon={copiedKey === key.value ? Check : Copy}
                      title={copiedKey === key.value ? 'Copied!' : 'Copy to clipboard'}
                    />
                    <Button
                      onClick={() => onRemoveKey(key.name)}
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      title="Remove key"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Security Notice */}
      <div className="pt-2">
        <Alert variant="warning" title="Security Warning">
          <p>
            Keys are stored in your browser's local storage and are not sent to any server. However, it's best practice to avoid storing sensitive keys in the browser. Consider using a secure key management system for production use.
          </p>
        </Alert>
      </div>
    </div>
  );
};