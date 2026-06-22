import React, { useState, useEffect, useRef } from "react";
import { Lock } from "../../../components/Icons";

interface PasswordPromptProps {
  entryPath: string;
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const PasswordPrompt: React.FC<PasswordPromptProps> = ({
  entryPath,
  error,
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter") onSubmit(password);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enter archive password"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-surface border border-base rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-warning" />
          <span className="font-medium text-main text-sm">Password protected</span>
        </div>
        <p className="text-secondary text-xs truncate">{entryPath}</p>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter password"
          className="w-full px-3 py-2 rounded border border-base bg-canvas text-main text-sm focus:outline-none focus:ring-1 focus:ring-focus"
        />
        {error && (
          <p className="text-danger text-xs">{error}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded border border-base text-secondary text-sm hover:bg-surface-raised transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(password)}
            className="px-3 py-1.5 rounded bg-primary text-primary-content text-sm hover:bg-primary/90 transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
};
