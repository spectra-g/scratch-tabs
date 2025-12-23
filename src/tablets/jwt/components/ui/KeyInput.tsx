import React, { useState } from "react";
import { Eye, EyeOff, Key, FileText, Database } from "lucide-react";
import { KeyType } from "../../types";

interface KeyInputProps {
  value: string;
  onChange: (value: string, type: KeyType) => void;
  type: KeyType;
  onTypeChange: (type: KeyType) => void;
  label: string;
  placeholder?: string;
  isPrivate?: boolean;
}

export const KeyInput: React.FC<KeyInputProps> = ({
  value,
  onChange,
  type,
  onTypeChange,
  label,
  placeholder = "Enter key...",
  isPrivate = false,
}) => {
  const [showKey, setShowKey] = useState(false);

  const toggleShowKey = () => {
    setShowKey(!showKey);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-secondary">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onTypeChange("text")}
            className={`px-2 py-1 text-xs rounded-md ${type === "text"
              ? "bg-primary text-primary-foreground"
              : "bg-surface-secondary text-muted hover:bg-element-hover"
              }`}
            title="Plain text"
          >
            <Key size={12} className="inline mr-1" />
            Text
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("base64")}
            className={`px-2 py-1 text-xs rounded-md ${type === "base64"
              ? "bg-primary text-primary-foreground"
              : "bg-surface-secondary text-muted hover:bg-element-hover"
              }`}
            title="Base64 encoded"
          >
            <Database size={12} className="inline mr-1" />
            Base64
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("pem")}
            className={`px-2 py-1 text-xs rounded-md ${type === "pem"
              ? "bg-primary text-primary-foreground"
              : "bg-surface-secondary text-muted hover:bg-element-hover"
              }`}
            title="PEM format"
          >
            <FileText size={12} className="inline mr-1" />
            PEM
          </button>
        </div>
      </div>

      <div className={`relative ${isPrivate ? "group" : ""}`}>
        {isPrivate && !showKey && (
          <div className="absolute right-10 top-2 text-xs text-muted">
            <span className="opacity-70 group-hover:opacity-0 transition-opacity duration-200">
              Hover to reveal
            </span>
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value, type)}
          placeholder={placeholder}
          rows={5}
          className={`w-full bg-surface-secondary border border-base rounded-md px-3 py-2 text-sm text-main font-mono placeholder-muted focus:outline-none focus:border-primary/50 transition-all duration-200 ${isPrivate && !showKey
              ? "filter blur-sm group-hover:blur-none focus:blur-none"
              : ""
            }`}
        />

        {isPrivate && (
          <button
            type="button"
            onClick={toggleShowKey}
            className="absolute right-2 top-2 p-1 text-muted hover:text-main hover:bg-element-hover rounded-md transition-colors"
            title={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};
