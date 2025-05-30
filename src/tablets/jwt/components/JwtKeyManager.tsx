import React, { useState } from 'react';
import { Eye, Key, Plus, Trash2, AlertTriangle, Copy, Check, Download, X } from 'lucide-react';
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
  // Local state for key generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPublicKey, setGeneratedPublicKey] = useState('');
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [generationAlgorithm, setGenerationAlgorithm] = useState('HS256');
  
  // Local state for manual key form
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyType, setKeyType] = useState<KeyType>('text');
  const [keyAlgorithm, setKeyAlgorithm] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Shared state
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
  const handleStoreGeneratedKey = (key: string, isKeyPublic: boolean) => {
    if (!key) return;

    // Create and add a new key directly
    const newKey: StoredKey = {
      name: `${generationAlgorithm} ${isKeyPublic ? 'Public' : 'Private'} Key`,
      value: key,
      type: 'pem',
      algorithm: generationAlgorithm,
      isPublic,
      createdAt: Date.now()
    };

    onAddKey(newKey);
    setError(null);
  };

  // Store generated secret
  const handleStoreGeneratedSecret = () => {
    if (!generatedSecret) return;

    // Create and add a new key directly
    const newKey: StoredKey = {
      name: `${generationAlgorithm} Secret`,
      value: generatedSecret,
      type: 'base64',
      algorithm: generationAlgorithm,
      isPublic: false,
      createdAt: Date.now()
    };

    onAddKey(newKey);
    setError(null);
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

  // Clear all generated keys
  const handleClearGeneratedKeys = () => {
    setGeneratedPublicKey('');
    setGeneratedPrivateKey('');
    setGeneratedSecret('');
    setError(null);
  };

  // Use a generated key in the form
  const handleUseKeyInForm = (key: string, isKeyPublic: boolean) => {
    setKeyName(`${generationAlgorithm} ${isKeyPublic ? 'Public' : 'Private'} Key`);
    setKeyValue(key);
    setKeyType('pem');
    setKeyAlgorithm(generationAlgorithm);
    setIsPublic(isKeyPublic);
  };

  // Use a generated secret in the form
  const handleUseSecretInForm = () => {
    setKeyName(`${generationAlgorithm} Secret`);
    setKeyValue(generatedSecret);
    setKeyType('base64');
    setKeyAlgorithm(generationAlgorithm);
    setIsPublic(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Key Generation Section */}
      <div className="space-y-4 border-b border-gray-700/50 pb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Generate Keys</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Algorithm
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {SUPPORTED_ALGORITHMS.map(alg => (
              <Button
                key={alg.id}
                onClick={() => setGenerationAlgorithm(alg.id)}
                variant={generationAlgorithm === alg.id ? 'primary' : 'secondary'}
                size="sm"
              >
                {alg.id}
              </Button>
            ))}
          </div>
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
          
          {(generatedPublicKey || generatedPrivateKey || generatedSecret) && (
            <Button
              onClick={handleClearGeneratedKeys}
              variant="secondary"
              size="md"
              icon={X}
            >
              Clear Generated Keys
            </Button>
          )}
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
                <Button
                  onClick={() => handleUseKeyInForm(generatedPublicKey, true)}
                  variant="secondary"
                  size="sm"
                  title="Use in form below"
                >
                  Use in Form
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
                <Button
                  onClick={() => handleUseKeyInForm(generatedPrivateKey, false)}
                  variant="secondary"
                  size="sm"
                  title="Use in form below"
                >
                  Use in Form
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
                  Never share your private key. For production use, store private keys securely.
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
                <Button
                  onClick={handleUseSecretInForm}
                  variant="secondary"
                  size="sm"
                  title="Use in form below"
                >
                  Use in Form
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

      {/* Manual Key Entry Section */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Store Key</h3>
        
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
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <Button
                key="any"
                onClick={() => setKeyAlgorithm('')}
                variant={keyAlgorithm === '' ? 'primary' : 'secondary'}
                size="sm"
              >
                Any
              </Button>
              {SUPPORTED_ALGORITHMS.map(alg => (
                <Button
                  key={alg.id}
                  onClick={() => setKeyAlgorithm(alg.id)}
                  variant={keyAlgorithm === alg.id ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {alg.id}
                </Button>
              ))}
            </div>
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
                className={`px-2 py-1 text-xs rounded-md ${keyType === 'text'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setKeyType('base64')}
                className={`px-2 py-1 text-xs rounded-md ${keyType === 'base64'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
              >
                Base64
              </button>
              <button
                type="button"
                onClick={() => setKeyType('pem')}
                className={`px-2 py-1 text-xs rounded-md ${keyType === 'pem'
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

      {/* Stored Keys Section */}
      <div className="space-y-4 mt-8 pt-4 border-t border-gray-700/50">
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
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-200">{key.name}</h4>
                    <p className="text-xs text-gray-400">
                      {key.algorithm || 'Any'} • {key.type} • {key.isPublic ? 'Public' : 'Private/Secret'}
                    </p>
                    {/* Add the key value display here with blur/hover */}
                    {!key.isPublic && (
                      <div className="mt-1 group relative">
                        <span
                          className="block text-xs text-gray-500 font-mono break-all truncate filter blur-sm group-hover:blur-none transition-all duration-200 ease-in-out cursor-default"
                          title="Hover to reveal secret/private key"
                        >
                          {key.value}
                        </span>
                        <Eye size={12} className="absolute top-0.5 right-0 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    )}
                    {key.isPublic && (
                      <div className="mt-1">
                        <span className="block text-xs text-gray-500 font-mono break-all truncate">
                          {key.value}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                    <Button
                      onClick={() => handleCopyKey(key.value)}
                      variant="secondary"
                      size="sm"
                      icon={copiedKey === key.value ? Check : Copy}
                      title={copiedKey === key.value ? 'Copied!' : 'Copy to clipboard'}
                    >
                      {copiedKey === key.value ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      onClick={() => onRemoveKey(key.name)}
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      title="Remove key"
                    >
                      Delete
                    </Button>
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
            Keys are stored in your browser's local storage and are not sent to any server. However, it's best practice to delete these from the JWT tablet after use.
          </p>
        </Alert>
      </div>
    </div>
  );
};