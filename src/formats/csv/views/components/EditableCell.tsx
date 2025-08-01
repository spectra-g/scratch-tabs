import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Edit3, Copy, Check } from "../../../../components/Icons";

interface EditableCellProps {
  value: string;
  isSelected: boolean;
  isValid: boolean;
  error?: string;
  startEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onEditingChange: (isEditing: boolean) => void;
  'data-testid'?: string;
  'data-row'?: string;
  'data-col'?: string;
}

export const EditableCell: React.FC<EditableCellProps> = React.memo(
  ({
    value,
    isSelected,
    isValid,
    error,
    startEditing,
    onSelect,
    onStartEdit,
    onChange,
    onEditingChange,
    'data-testid': dataTestId,
    'data-row': dataRow,
    'data-col': dataCol,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [copySuccess, setCopySuccess] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Start editing when triggered
    useEffect(() => {
      if (startEditing && !isEditing) {
        setIsEditing(true);
        setEditValue(value);
        onEditingChange(true);
      }
    }, [startEditing, isEditing, value, onEditingChange]);

    // Focus and position cursor when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        // Position cursor at end
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, [isEditing]);

    const handleCommitChange = useCallback(() => {
      if (isEditing) {
        setIsEditing(false);
        onEditingChange(false);
        if (editValue !== value) {
          onChange(editValue);
        }
      }
    }, [isEditing, editValue, value, onChange, onEditingChange]);

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false);
      setEditValue(value);
      onEditingChange(false);
    }, [value, onEditingChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          handleCommitChange();
        } else if (e.key === "Escape") {
          handleCancelEdit();
        }
      },
      [handleCommitChange, handleCancelEdit],
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        onSelect();
      },
      [onSelect],
    );

    const [isHovered, setIsHovered] = useState(false);

    const handleEditClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onStartEdit();
      },
      [onStartEdit],
    );

    const handleCopyClick = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
          console.error('Failed to copy text:', err);
        }
      },
      [value],
    );

    if (isEditing) {
      return (
        <div className="h-full w-full flex items-center bg-gray-800">
          <input
            ref={inputRef}
            className="w-full h-full bg-transparent border-none outline-none text-sm text-white px-2 focus:outline-none focus:ring-0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCommitChange}
          />
        </div>
      );
    }

    return (
      <div
        className={`h-full min-h-[35px] flex items-center cursor-cell transition-colors relative group ${
          isSelected
            ? "bg-blue-900/30 ring-1 ring-blue-500"
            : "hover:bg-gray-700/20"
        } ${!isValid ? "bg-red-900/20" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={error || "Click to select. Click pencil or press enter to edit"}
        data-testid={dataTestId}
        data-row={dataRow}
        data-col={dataCol}
      >
        <span 
          className={`text-sm truncate w-full text-gray-200 px-2 transition-all duration-150 ${
            isHovered ? "pr-16" : "pr-2"
          }`}
        >
          {value || <span className="text-gray-500 italic">Empty</span>}
        </span>
        <div 
          className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center space-x-1 transition-opacity duration-150 ${
            isHovered ? "opacity-70" : "opacity-0"
          }`}
        >
          <button
            className={`p-1 rounded hover:bg-gray-600 hover:opacity-100 transition-all ${
              copySuccess ? 'text-green-400' : ''
            }`}
            onClick={handleCopyClick}
            title="Copy cell value"
          >
            {copySuccess ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button
            className="p-1 rounded hover:bg-gray-600 hover:opacity-100 transition-all"
            onClick={handleEditClick}
            title="Edit cell"
          >
            <Edit3 size={12} />
          </button>
        </div>
      </div>
    );
  },
);
