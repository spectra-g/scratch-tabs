import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldX, ShieldAlert, Key } from 'lucide-react';
import { verifyJwt } from '../utils/jwtUtils';
import { KeyInput } from './ui/KeyInput';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { KeyType, StoredKey } from '../types';

interface JwtVerifierProps {
  token: string;
  header: Record<string, any>;
  verificationKey: string;
  verificationKeyType: KeyType;
  isValid: boolean | null;
  onVerificationKeyChange: (key: string, type: KeyType) => void;
  onVerificationResult: (isValid: boolean | null, error?: string) => void;
  storedKeys: StoredKey[];
  onUseStoredKey: (key: StoredKey) => void;
}

export const JwtVerifier: React.FC<JwtVerifierProps> = ({
  token,
  header,
  verificationKey,
  verificationKeyType,
  isValid,
  onVerificationKeyChange,
  onVerificationResult,
  storedKeys,
  onUseStoredKey
}) => {
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const onVerificationResultRef = useRef(onVerificationResult);

  useEffect(() => {
    onVerificationResultRef.current = onVerificationResult;
  }, [onVerificationResult]);

  // Get the algorithm from the header
  const algorithm = header?.alg || '';
  const isAsymmetric = algorithm.startsWith('RS') || algorithm.startsWith('ES') || algorithm.startsWith('PS');

  // Filter stored keys based on algorithm
  const filteredStoredKeys = storedKeys.filter(key => {
    // For symmetric algorithms (HS*), we need a secret key
    if (algorithm.startsWith('HS')) {
      return !key.algorithm || key.algorithm.startsWith('HS');
    }

    // For asymmetric algorithms, we need a public key
    if (isAsymmetric) {
      return key.isPublic && (!key.algorithm || key.algorithm === algorithm);
    }

    return true;
  });

  // Verify token when key changes
  useEffect(() => {
    if (!token || !verificationKey) {
      onVerificationResultRef.current(null, undefined)
      setVerificationError(null);
      return;
    }

    const verifyToken = async () => {
      setIsVerifying(true);
      setVerificationError(null);
      try {
        const result = await verifyJwt(token, verificationKey, verificationKeyType);
        onVerificationResultRef.current(result.isValid, result.error);
        setVerificationError(result.error || null);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onVerificationResultRef.current(false, errorMsg);
        setVerificationError(errorMsg);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, verificationKey, verificationKeyType, header]);

  // Render verification status
  const renderVerificationStatus = () => {
    if (isVerifying) {
      return (
        <Alert variant="info" title="Verifying...">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            <span>Verifying token signature...</span>
          </div>
        </Alert>
      );
    }

    if (!token) {
      return (
        <Alert variant="info" title="No Token">
          <p>Enter a token in the Decode tab to verify.</p>
        </Alert>
      );
    }

    if (!verificationKey) {
      return (
        <Alert variant="warning" title="Key Required">
          <div className="flex items-center">
            <ShieldAlert size={18} className="mr-2" />
            <span>Enter a {isAsymmetric ? 'public key' : 'secret'} to verify the token.</span>
          </div>
        </Alert>
      );
    }

    if (isValid === true) {
      return (
        <Alert variant="success" title="Signature Valid">
          <div className="flex items-center">
            <ShieldCheck size={18} className="mr-2" />
            <span>The token signature is valid.</span>
          </div>
        </Alert>
      );
    }

    if (isValid === false) {
      return (
        <Alert variant="error" title="Signature Invalid">
          <div className="flex items-center">
            <ShieldX size={18} className="mr-2" />
            <span>{verificationError || 'The token signature is invalid.'}</span>
          </div>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Token Info */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Token Information</h3>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Algorithm</p>
              <p className="text-sm font-medium text-gray-200">{algorithm || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Key Type</p>
              <p className="text-sm font-medium text-gray-200">
                {isAsymmetric ? 'Asymmetric (Public/Private Key)' : 'Symmetric (Secret)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Key */}
      <div className="space-y-2">
        <KeyInput
          value={verificationKey}
          onChange={onVerificationKeyChange}
          type={verificationKeyType}
          onTypeChange={(type) => onVerificationKeyChange(verificationKey, type)}
          label={isAsymmetric ? 'Public Key' : 'Secret'}
          placeholder={isAsymmetric ? 'Enter public key...' : 'Enter secret...'}
          isPrivate={false}
        />
      </div>

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
                      {key.algorithm || 'Any'} • {key.type}
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

      {/* Verification Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Verification Status</h3>
        {renderVerificationStatus()}
      </div>

      {/* Security Notice */}
      <div className="pt-2">
        <Alert variant="info">
          <p>All verification is performed client-side. No data is sent to any server.</p>
        </Alert>
      </div>
    </div>
  );
};