import React, { useState, useRef, useCallback } from "react";
import { Plus, Trash2, MessageSquare, Eye, EyeOff, Copy, AlertTriangle, Key, Check } from "../../../../components/Icons";
import { PropertyPair, PropertiesValidation } from "../types";

interface PropertiesEditorProps {
  pairs: PropertyPair[];
  selectedNodeId: string | null;
  validation: PropertiesValidation;
  onUpdatePair: (pairId: string, key: string, value: string, comment?: string) => void;
  onAddPair: (key: string, value: string, comment?: string, afterPairId?: string) => void;
  onDeletePair: (pairId: string) => void;
  onAddComment: (comment: string, afterPairId?: string) => void;
}

interface EditingState {
  pairId: string;
  field: 'key' | 'value' | 'comment';
}

// Sensitive key patterns for masking
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key$/i,
  /api[-_]?key/i,
  /auth[-_]?key/i,
  /credential/i,
  /private[-_]?key/i,
];

const isSensitiveKey = (key: string): boolean => {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
};

export const PropertiesEditor: React.FC<PropertiesEditorProps> = ({
  pairs,
  selectedNodeId,
  validation,
  onUpdatePair,
  onAddPair,
  onDeletePair,
  onAddComment: _onAddComment,
}) => {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState("");
  const [maskedKeys, setMaskedKeys] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newComment, setNewComment] = useState("");
  const [copiedValueId, setCopiedValueId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect and mask sensitive keys
  React.useEffect(() => {
    const newMaskedKeys = new Set<string>();
    pairs.forEach(pair => {
      if (isSensitiveKey(pair.key)) {
        newMaskedKeys.add(pair.key);
      }
    });
    setMaskedKeys(newMaskedKeys);
  }, [pairs]);

  const startEditing = useCallback((pairId: string, field: 'key' | 'value' | 'comment', currentValue: string) => {
    setEditingState({ pairId, field });
    setEditValue(currentValue);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingState) return;

    const pair = pairs.find(p => p.id === editingState.pairId);
    if (!pair) return;

    const updatedPair = { ...pair };
    updatedPair[editingState.field] = editValue;

    onUpdatePair(
      editingState.pairId,
      updatedPair.key,
      updatedPair.value,
      updatedPair.comment
    );

    setEditingState(null);
    setEditValue("");
  }, [editingState, editValue, pairs, onUpdatePair]);

  const cancelEdit = useCallback(() => {
    setEditingState(null);
    setEditValue("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [commitEdit, cancelEdit]);

  const toggleMask = useCallback((key: string) => {
    setMaskedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const handleAddPair = useCallback(() => {
    if (!newKey.trim()) return;

    // Add prefix if we're in a filtered context
    const finalKey = selectedNodeId && selectedNodeId !== 'root'
      ? `${selectedNodeId}.${newKey.trim()}`
      : newKey.trim();

    onAddPair(finalKey, newValue.trim(), newComment.trim() || undefined);

    setNewKey("");
    setNewValue("");
    setNewComment("");
    setShowAddForm(false);
  }, [newKey, newValue, newComment, selectedNodeId, onAddPair]);

  const copyValue = useCallback(async (value: string, pairId: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValueId(pairId);
      setTimeout(() => setCopiedValueId(null), 2000);
    } catch (err) {
      console.error('Failed to copy value:', err);
    }
  }, []);

  React.useEffect(() => {
    if (editingState && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingState]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-3 border-b border-base flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-main">
            {selectedNodeId === 'root' || !selectedNodeId
              ? 'All Properties'
              : `Properties: ${selectedNodeId}`}
          </h3>
          <div className="text-xs text-secondary mt-1">
            {pairs.length} key-value pairs
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
        >
          <Plus size={14} />
          <span>Add Property</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="flex-none p-3 border-b border-base bg-surface/50">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Key"
              className="bg-element border border-base rounded px-2 py-1 text-sm text-main focus:outline-none focus:border-focus"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="bg-element border border-base rounded px-2 py-1 text-sm text-main focus:outline-none focus:border-focus"
            />
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Comment (optional)"
              className="bg-element border border-base rounded px-2 py-1 text-sm text-main focus:outline-none focus:border-focus"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-2 py-1 text-xs text-secondary hover:text-main"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPair}
              disabled={!newKey.trim()}
              className="px-2 py-1 text-xs bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-600/30 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Properties List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {pairs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-secondary">
            <div className="text-center">
              <Key size={48} className="mx-auto mb-4 opacity-50" />
              <p>No properties found</p>
              <p className="text-sm mt-1">
                {selectedNodeId && selectedNodeId !== 'root'
                  ? `No properties match the filter "${selectedNodeId}"`
                  : "Add a property to get started"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {pairs.map((pair) => {
              const isDuplicate = validation.duplicateKeys.includes(pair.key);
              const isEmpty = validation.emptyValues.includes(pair.key);
              const isInvalid = validation.invalidKeys.includes(pair.key);
              const isMasked = maskedKeys.has(pair.key);
              const isSensitive = isSensitiveKey(pair.key);
              const hasIssues = isDuplicate || isEmpty || isInvalid;

              return (
                <div
                  key={pair.id}
                  className={`border rounded-lg p-3 transition-colors ${hasIssues
                    ? "border-warning/50 bg-warning/5"
                    : "border-base bg-surface/30 hover:bg-surface/50"
                    }`}
                >
                  {/* Key Row */}
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1 flex-1">
                      <Key size={12} className="text-secondary flex-shrink-0" />
                      {editingState?.pairId === pair.id && editingState.field === 'key' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={commitEdit}
                          className="flex-1 bg-element border border-focus rounded px-2 py-1 text-sm text-main focus:outline-none"
                        />
                      ) : (
                        <span
                          className="flex-1 font-mono text-sm text-info cursor-pointer hover:bg-element-hover px-1 py-0.5 rounded"
                          onClick={() => startEditing(pair.id, 'key', pair.key)}
                          title="Click to edit key"
                        >
                          {pair.key}
                        </span>
                      )}

                      {hasIssues && (
                        <AlertTriangle size={12} className="text-warning" />
                      )}
                    </div>

                    <button
                      onClick={() => onDeletePair(pair.id)}
                      className="p-1 text-danger hover:text-danger/80 hover:bg-danger/20 rounded transition-colors"
                      title="Delete property"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Value Row */}
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4" /> {/* Spacer for alignment */}
                    <div className="flex items-center space-x-1 flex-1">
                      {editingState?.pairId === pair.id && editingState.field === 'value' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={commitEdit}
                          className="flex-1 bg-element border border-focus rounded px-2 py-1 text-sm text-main focus:outline-none"
                        />
                      ) : (
                        <span
                          className={`flex-1 font-mono text-sm cursor-pointer hover:bg-element-hover px-1 py-0.5 rounded ${isMasked ? "text-muted" : "text-main"
                            }`}
                          onClick={() => startEditing(pair.id, 'value', pair.value)}
                          title="Click to edit value"
                        >
                          {isMasked ? '••••••••' : (pair.value || <em className="text-muted">empty</em>)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {isSensitive && (
                        <button
                          onClick={() => toggleMask(pair.key)}
                          className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                          title={isMasked ? "Show value" : "Hide value"}
                        >
                          {isMasked ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                      )}

                      <button
                        onClick={() => copyValue(pair.value, pair.id)}
                        className={`p-1 rounded transition-colors ${copiedValueId === pair.id
                          ? "text-success bg-success/20"
                          : "text-secondary hover:text-main hover:bg-element-hover"
                          }`}
                        title={copiedValueId === pair.id ? "Copied!" : "Copy value"}
                      >
                        {copiedValueId === pair.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Comment Row */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4" /> {/* Spacer for alignment */}
                    <div className="flex items-center space-x-1 flex-1">
                      <MessageSquare size={12} className="text-muted flex-shrink-0" />
                      {editingState?.pairId === pair.id && editingState.field === 'comment' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={commitEdit}
                          placeholder="Add comment..."
                          className="flex-1 bg-element border border-focus rounded px-2 py-1 text-sm text-main focus:outline-none"
                        />
                      ) : (
                        <span
                          className="flex-1 text-sm text-secondary cursor-pointer hover:bg-element-hover px-1 py-0.5 rounded"
                          onClick={() => startEditing(pair.id, 'comment', pair.comment || '')}
                          title="Click to edit comment"
                        >
                          {pair.comment || <em className="text-muted">Click to add comment</em>}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Validation Issues */}
                  {hasIssues && (
                    <div className="mt-2 pt-2 border-t border-warning/30">
                      <div className="flex items-center space-x-1 text-xs text-warning">
                        <AlertTriangle size={12} />
                        <span>
                          {isDuplicate && "Duplicate key"}
                          {isDuplicate && (isEmpty || isInvalid) && " • "}
                          {isEmpty && "Empty value"}
                          {(isDuplicate || isEmpty) && isInvalid && " • "}
                          {isInvalid && "Invalid key format"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};