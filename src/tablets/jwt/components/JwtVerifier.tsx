import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, ShieldX, ShieldAlert, Key } from "lucide-react";
import { verifyJwt } from "../utils/jwtUtils";
import { KeyInput } from "./ui/KeyInput";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { KeyType, StoredKey } from "../types";
import { SensitiveDataManager } from "../../../utils/sensitiveDataManager";

interface JwtVerifierProps {
  token: string;
  header: Record<string, any>;
  verificationKey: string;
  verificationKeyType: KeyType;
  isValid: boolean | null;
  onVerificationKeyChange: (key: string, type: KeyType) => void;
  onVerificationResult: (
    isValid: boolean | null,
    error?: string,
    warning?: string,
  ) => void;
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
  onUseStoredKey,
}) => {
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [verificationWarning, setVerificationWarning] = useState<string | null>(
    null,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const onVerificationResultRef = useRef(onVerificationResult);

  useEffect(() => {
    onVerificationResultRef.current = onVerificationResult;
  }, [onVerificationResult]);

  // Get the algorithm from the header
  const algorithm = header?.alg || "";
  const isAsymmetric =
    algorithm.startsWith("RS") ||
    algorithm.startsWith("ES") ||
    algorithm.startsWith("PS");

  // Filter stored keys based on algorithm
  const filteredStoredKeys = storedKeys.filter((key) => {
    // For symmetric algorithms (HS*), we need a secret key
    if (algorithm.startsWith("HS")) {
      return !key.algorithm || key.algorithm.startsWith("HS");
    }

    // For asymmetric algorithms, we need a public key
    if (isAsymmetric) {
      return (
        key.isPublic &&
        // Either the key has no algorithm specified or it matches our selected algorithm
        (!key.algorithm ||
          algorithm === key.algorithm ||
          // Match algorithm family (RS*, ES*, PS*)
          (key.algorithm &&
            algorithm.substring(0, 2) === key.algorithm.substring(0, 2)))
      );
    }

    return true;
  });

  // Verify token when key changes
  useEffect(() => {
    if (!token || !verificationKey) {
      onVerificationResultRef.current(null, undefined);
      setVerificationError(null);
      setVerificationWarning(null);
      return;
    }

    const verifyToken = async () => {
      setIsVerifying(true);
      setVerificationError(null);
      setVerificationWarning(null);
      try {
        const unmaskedKey = SensitiveDataManager.unmask(verificationKey);
        const result = await verifyJwt(token, unmaskedKey, verificationKeyType);
        onVerificationResultRef.current(
          result.isValid,
          result.error,
          result.warning,
        );
        setVerificationError(result.error || null);
        setVerificationWarning(result.warning || null);
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
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info mr-2"></div>
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
            <span>
              Enter a {isAsymmetric ? "public key" : "secret"} to verify the
              token.
            </span>
          </div>
        </Alert>
      );
    }

    if (isValid === true) {
      return (
        <Alert
          variant={verificationWarning ? "warning" : "success"}
          title={
            verificationWarning
              ? "Signature Valid (with warnings)"
              : "Signature Valid"
          }
        >
          <div className="flex items-center">
            <ShieldCheck size={18} className="mr-2" />
            <div>
              <span>The token signature is valid.</span>
              {verificationWarning && (
                <div className="mt-1 text-warning">{verificationWarning}</div>
              )}
            </div>
          </div>
        </Alert>
      );
    }

    if (isValid === false) {
      return (
        <Alert variant="error" title="Signature Invalid">
          <div className="flex items-center">
            <ShieldX size={18} className="mr-2" />
            <span>
              {verificationError || "The token signature is invalid."}
            </span>
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
        <h3 className="text-sm font-medium text-secondary">Token Information</h3>
        <div className="bg-surface-raised border border-base rounded-md p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">Algorithm</p>
              <p className="text-sm font-medium text-main">
                {algorithm || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Key Type</p>
              <p className="text-sm font-medium text-main">
                {isAsymmetric
                  ? "Asymmetric (Public/Private Key)"
                  : "Symmetric (Secret)"}
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
          onTypeChange={(type) =>
            onVerificationKeyChange(verificationKey, type)
          }
          label={isAsymmetric ? "Public Key" : "Secret"}
          placeholder={isAsymmetric ? "Enter public key..." : "Enter secret..."}
          isPrivate={false}
        />
      </div>

      {/* Stored Keys */}
      {filteredStoredKeys.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-secondary">Stored Keys</h3>
          <div className="bg-surface-raised border border-base rounded-md p-3">
            <div className="space-y-2">
              {filteredStoredKeys.map((key) => (
                <div
                  key={key.name}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-main">
                      {key.name}
                    </p>
                    <p className="text-xs text-muted">
                      {key.algorithm || "Any"} • {key.type}
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
        <h3 className="text-sm font-medium text-secondary">
          Verification Status
        </h3>
        {renderVerificationStatus()}
      </div>

      {/* Security Notice */}
      <div className="pt-2">
        <Alert variant="info">
          <p>
            All verification is performed client-side. No data is sent to any
            server.
          </p>
        </Alert>
      </div>
    </div>
  );
};
