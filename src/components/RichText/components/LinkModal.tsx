import React, { useState, useRef, useEffect } from 'react';
import { X, Link } from '../../Icons';

interface LinkModalProps {
  isOpen: boolean;
  onSave: (url: string, text?: string) => void;
  onCancel: () => void;
  initialUrl?: string;
  initialText?: string;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onSave,
  onCancel,
  initialUrl = '',
  initialText = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    setUrl(initialUrl);
    setText(initialText);
  }, [initialUrl, initialText]);

  const handleSave = () => {
    if (url.trim()) {
      onSave(url.trim(), text.trim() || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-themed border border-themed rounded-lg p-6 w-96 max-w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Link size={18} className="text-blue-500" />
            <h3 className="text-lg font-medium text-themed">
              {initialUrl ? 'Edit Link' : 'Add Link'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-themed-hover rounded transition-colors"
          >
            <X size={16} className="icon-themed" />
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="text-input" className="block text-sm font-medium text-themed-secondary mb-2">
            Link Text
          </label>
          <input
            ref={inputRef}
            id="text-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Link text (leave empty to use URL)"
            className="w-full px-3 py-2 bg-themed-secondary border border-themed rounded-md text-themed placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="url-input" className="block text-sm font-medium text-themed-secondary mb-2">
            URL
          </label>
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-themed-secondary border border-themed rounded-md text-themed placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-themed-secondary hover:text-themed hover:bg-themed-hover rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};