import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Edit3, Copy, Eye, EyeOff } from "../../../../components/Icons";

interface MaskedCellProps {
  value: string;
  isSelected: boolean;
  isValid: boolean;
  error?: string;
  startEditing: boolean;
  isMasked: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onEditingChange: (isEditing: boolean) => void;
  onToggleMask: () => void;
  'data-testid'?: string;
  'data-row'?: string;
  'data-col'?: string;
}

export const MaskedCell: React.FC<MaskedCellProps> = React.memo(
  ({
    value,
    isSelected,
    isValid,
    error,
    startEditing,
    isMasked,
    onSelect,
    onStartEdit,
    onChange,
    onEditingChange,
    onToggleMask,
    'data-testid': dataTestId,
    'data-row': dataRow,
    'data-col': dataCol,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isHovered, setIsHovered] = useState(false);
    const [isTemporarilyUnmasked, setIsTemporarilyUnmasked] = useState(false);
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

    const handleToggleMaskClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleMask();
      },
      [onToggleMask],
    );

    const handleMouseEnter = useCallback(() => {
      setIsHovered(true);
      if (isMasked) {
        setIsTemporarilyUnmasked(true);
      }
    }, [isMasked]);

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
      if (isMasked) {
        setIsTemporarilyUnmasked(false);
      }
    }, [isMasked]);

    // Determine if content should be masked
    const shouldShowMasked = isMasked && !isTemporarilyUnmasked && !isEditing;

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={error || "Click to select. Click pencil or press enter to edit"}
        data-testid={dataTestId}
        data-row={dataRow}
        data-col={dataCol}
      >
        <span
          className={`text-sm truncate flex-1 mr-2 select-none transition duration-150 ${shouldShowMasked ? "blur-[3px] hover:blur-none" : "text-gray-200"}`}
          title={shouldShowMasked ? "Hover to reveal" : undefined}
        >
          {value || <span className="text-gray-500 italic">Empty</span>}
        </span>
        <div className="flex items-center space-x-1 w-16 justify-end">
          <button
            className={`p-1 rounded hover:bg-gray-600 transition-all ${
              isHovered || isSelected
                ? "opacity-70 hover:opacity-100"
                : "opacity-0"
            }`}
            onClick={handleToggleMaskClick}
            title={isMasked ? "Unmask column" : "Mask column"}
          >
            {isMasked ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
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
