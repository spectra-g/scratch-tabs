import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Edit3, Copy } from "../../../../components/Icons";

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
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
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
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(value);
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
        className={`h-full min-h-[35px] flex items-center px-2 cursor-cell transition-colors relative group ${
          isSelected
            ? "bg-blue-900/30 ring-1 ring-blue-500"
            : "hover:bg-gray-700/20"
        } ${!isValid ? "bg-red-900/20" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={error || "Click to select. Click pencil or press enter to edit"}
      >
        <span className="text-sm truncate flex-1 text-gray-200 mr-2">
          {value || <span className="text-gray-500 italic">Empty</span>}
        </span>
        <div className="flex items-center space-x-1 w-14 justify-end">
          <button
            className={`p-1 rounded hover:bg-gray-600 transition-all ${
              isHovered || isSelected
                ? "opacity-70 hover:opacity-100"
                : "opacity-0"
            }`}
            onClick={handleCopyClick}
            title="Copy cell value"
          >
            <Copy size={12} />
          </button>
          <button
            className={`p-1 rounded hover:bg-gray-600 transition-all ${
              isHovered || isSelected
                ? "opacity-70 hover:opacity-100"
                : "opacity-0"
            }`}
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
