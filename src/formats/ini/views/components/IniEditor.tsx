import React, { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  MessageSquare,
  Settings,
} from "../../../../components/Icons";
import { IniSection, IniLine, IniValidationIssue } from "../types";
import { isSensitiveKey } from "../hooks/useIniData";

interface IniEditorProps {
  selectedSection: IniSection | null;
  selectedSectionId: string | null;
  sections: IniSection[];
  onAddKeyValue: (sectionId: string, key: string, value: string, comment?: string) => void;
  onUpdateKeyValue: (sectionId: string, lineId: string, key: string, value: string, comment?: string) => void;
  onDeleteKeyValue: (sectionId: string, lineId: string) => void;
  validationIssues: IniValidationIssue[];
  onAddSection?: (name: string) => void;
}

interface EditingState {
  lineId: string;
  field: 'key' | 'value' | 'comment';
  value: string;
}

export const IniEditor: React.FC<IniEditorProps> = ({
  selectedSection,
  selectedSectionId,
  sections,
  onAddKeyValue,
  onUpdateKeyValue,
  onDeleteKeyValue,
  validationIssues,
  onAddSection,
}) => {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newComment, setNewComment] = useState("");
  const [maskedKeys, setMaskedKeys] = useState<Set<string>>(new Set());
  
  // Add Section form state
  const [showAddSectionForm, setShowAddSectionForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Get all key-value pairs from all sections if no section is selected
  const displayLines = selectedSection 
    ? selectedSection.lines.filter(line => line.type === 'PAIR')
    : sections.flatMap(section => 
        section.lines
          .filter(line => line.type === 'PAIR')
          .map(line => ({ ...line, sectionName: section.name }))
      );

  const startEditing = useCallback((lineId: string, field: 'key' | 'value' | 'comment', currentValue: string) => {
    setEditingState({ lineId, field, value: currentValue });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingState) return;

    // Find the line across all sections if no specific section is selected
    let targetSectionId = selectedSectionId;
    let line: IniLine | null = null;

    if (selectedSectionId && selectedSection) {
      // Look in the specific selected section
      line = selectedSection.lines.find(l => l.id === editingState.lineId);
    } else {
      // Look across all sections to find the line
      for (const section of sections) {
        line = section.lines.find(l => l.id === editingState.lineId);
        if (line) {
          targetSectionId = section.id;
          break;
        }
      }
    }

    if (line && line.type === 'PAIR' && targetSectionId) {
      const updatedKey = editingState.field === 'key' ? editingState.value : line.key || '';
      const updatedValue = editingState.field === 'value' ? editingState.value : line.value || '';
      const updatedComment = editingState.field === 'comment' ? editingState.value : line.comment;

      onUpdateKeyValue(targetSectionId, editingState.lineId, updatedKey, updatedValue, updatedComment);
    }
    
    setEditingState(null);
  }, [editingState, selectedSection, selectedSectionId, sections, onUpdateKeyValue]);

  const cancelEdit = useCallback(() => {
    setEditingState(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleAddKeyValue = useCallback(() => {
    if (!newKey.trim()) return;

    // If no section is selected, we need to choose a section or create one
    let targetSectionId = selectedSectionId;
    
    if (!targetSectionId) {
      // If no section is selected and we're in "All Sections" view,
      // try to add to the first available section or create a global section
      if (sections.length > 0) {
        targetSectionId = sections[0].id;
      } else {
        // No sections exist, we might need to create one
        // For now, just return silently as this is a valid state
        return;
      }
    }

    onAddKeyValue(targetSectionId, newKey.trim(), newValue.trim(), newComment.trim() || undefined);
    setNewKey("");
    setNewValue("");
    setNewComment("");
    setShowAddForm(false);
  }, [selectedSectionId, sections, newKey, newValue, newComment, onAddKeyValue]);

  const handleAddSection = useCallback(() => {
    if (!newSectionName.trim() || !onAddSection) return;

    onAddSection(newSectionName.trim());
    setNewSectionName("");
    setShowAddSectionForm(false);
  }, [newSectionName, onAddSection]);

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

  const copyValue = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Silently fail if clipboard access is not available
      // This is common in some browser environments
    }
  }, []);

  const getLineIssues = (lineId: string) => {
    return validationIssues.filter(issue => issue.lineId === lineId);
  };

  const renderValue = (line: IniLine & { sectionName?: string }) => {
    if (!line.key || !line.value) return null;

    const isSensitive = isSensitiveKey(line.key);
    const isMasked = isSensitive && !maskedKeys.has(line.key);
    const displayValue = isMasked ? '••••••••' : line.value;
    const isEditing = editingState?.lineId === line.id && editingState.field === 'value';
    const lineIssues = getLineIssues(line.id);
    const hasError = lineIssues.some(issue => issue.type === 'error');

    return (
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editingState.value}
            onChange={(e) => setEditingState(prev => prev ? { ...prev, value: e.target.value } : null)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-gray-800 border border-blue-500 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
            autoFocus
          />
        ) : (
          <span
            onClick={() => startEditing(line.id, 'value', line.value || '')}
            className={`flex-1 text-sm cursor-pointer hover:bg-gray-700/30 px-2 py-1 rounded transition-colors truncate ${
              hasError ? 'text-red-400' : 'text-gray-200'
            }`}
            title={isMasked ? 'Click to edit (value is masked)' : 'Click to edit'}
          >
            {displayValue}
          </span>
        )}

        {/* Mask toggle for sensitive keys */}
        {isSensitive && (
          <button
            onClick={() => toggleMask(line.key!)}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            title={isMasked ? 'Show value' : 'Hide value'}
          >
            {isMasked ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        )}

        {/* Copy button */}
        <button
          onClick={() => copyValue(line.value || '')}
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
          title="Copy value"
        >
          <Copy size={12} />
        </button>
      </div>
    );
  };

  if (!selectedSectionId) {
    // Show all sections overview
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-200">All Sections Overview</h3>
              <p className="text-sm text-gray-400 mt-1">
                Select a section from the left panel to edit its contents
              </p>
            </div>
            {/* Add Section button in All Sections Overview */}
            {onAddSection && (
              <button
                onClick={() => setShowAddSectionForm(!showAddSectionForm)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                title="Add new section"
              >
                <Plus size={14} />
                <span>Add Section</span>
              </button>
            )}
          </div>

          {/* Add Section Form in All Sections Overview */}
          {showAddSectionForm && onAddSection && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Section Name</label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="section_name"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-green-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSection();
                    } else if (e.key === 'Escape') {
                      setShowAddSectionForm(false);
                      setNewSectionName("");
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={handleAddSection}
                  disabled={!newSectionName.trim()}
                  className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 disabled:opacity-50"
                >
                  Add Section
                </button>
                <button
                  onClick={() => {
                    setShowAddSectionForm(false);
                    setNewSectionName("");
                  }}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="space-y-4">
            {sections.map(section => (
              <div
                key={section.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-200">
                    [{section.name || 'Global'}]
                  </h4>
                  <span className="text-xs text-gray-500">
                    {section.lines.filter(l => l.type === 'PAIR').length} keys
                  </span>
                </div>
                
                {section.comment && (
                  <p className="text-sm text-gray-400 mb-2">
                    {section.comment}
                  </p>
                )}
                
                <div className="text-sm text-gray-500">
                  {section.lines.filter(l => l.type === 'PAIR').slice(0, 3).map(line => (
                    <div key={line.id} className="truncate">
                      {line.key} = {line.value}
                    </div>
                  ))}
                  {section.lines.filter(l => l.type === 'PAIR').length > 3 && (
                    <div className="text-gray-600">
                      ... and {section.lines.filter(l => l.type === 'PAIR').length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-200">
              [{selectedSection?.name || 'Global'}]
            </h3>
            {selectedSection?.comment && (
              <p className="text-sm text-gray-400 mt-1">
                {selectedSection.comment}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            title="Add key-value pair"
          >
            <Plus size={14} />
            <span>Add Key</span>
          </button>
        </div>

        {/* Add Key-Value Form */}
        {showAddForm && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="key_name"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Value</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="value"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Comment (optional)</label>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="comment"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleAddKeyValue}
                disabled={!newKey.trim()}
                className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKey("");
                  setNewValue("");
                  setNewComment("");
                }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Key-Value List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Settings size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No keys in this section</p>
            <p className="text-sm">Click "Add Key" to create your first key-value pair</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {displayLines.map((line: IniLine) => {
              const lineIssues = getLineIssues(line.id);
              const hasError = lineIssues.some(issue => issue.type === 'error');
              const hasWarning = lineIssues.some(issue => issue.type === 'warning');
              // const isSensitive = line.key && isSensitiveKey(line.key);

              return (
                <div
                  key={line.id}
                  className={`bg-gray-800/50 rounded-lg p-3 border transition-colors ${
                    hasError 
                      ? 'border-red-500/50 bg-red-500/5' 
                      : hasWarning 
                      ? 'border-yellow-500/50 bg-yellow-500/5'
                      : 'border-gray-700/50 hover:border-gray-600/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Key */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-400 mb-1">Key</label>
                      {editingState?.lineId === line.id && editingState.field === 'key' ? (
                        <input
                          type="text"
                          value={editingState.value}
                          onChange={(e) => setEditingState(prev => prev ? { ...prev, value: e.target.value } : null)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => startEditing(line.id, 'key', line.key || '')}
                          className={`text-sm cursor-pointer hover:bg-gray-700/30 px-2 py-1 rounded transition-colors font-medium ${
                            hasError ? 'text-red-400' : 'text-blue-300'
                          }`}
                        >
                          {line.key}
                        </div>
                      )}
                    </div>

                    {/* Value */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-400 mb-1">Value</label>
                      {renderValue(line)}
                    </div>

                    {/* Comment */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-400 mb-1">Comment</label>
                      {editingState?.lineId === line.id && editingState.field === 'comment' ? (
                        <input
                          type="text"
                          value={editingState.value}
                          onChange={(e) => setEditingState(prev => prev ? { ...prev, value: e.target.value } : null)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => startEditing(line.id, 'comment', line.comment || '')}
                          className="text-sm cursor-pointer hover:bg-gray-700/30 px-2 py-1 rounded transition-colors text-gray-400 min-h-[28px] flex items-center"
                        >
                          {line.comment ? (
                            <span className="flex items-center">
                              <MessageSquare size={12} className="mr-1" />
                              {line.comment}
                            </span>
                          ) : (
                            <span className="italic text-gray-600">Add comment...</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      {/* Validation indicator */}
                      {(hasError || hasWarning) && (
                        <div
                          className="p-1"
                          title={lineIssues.map(issue => issue.message).join(', ')}
                        >
                          <AlertTriangle 
                            size={14} 
                            className={hasError ? "text-red-400" : "text-yellow-400"} 
                          />
                        </div>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => selectedSectionId && onDeleteKeyValue(selectedSectionId, line.id)}
                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete key-value pair"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};