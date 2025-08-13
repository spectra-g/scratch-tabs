import React, { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit3,
  Copy,
  Trash2,
  AlertTriangle,
  Folder,
  FolderOpen,
  Settings,
} from "../../../../components/Icons";
import { IniTreeNode, IniValidationIssue } from "../types";

interface IniTreeViewProps {
  treeNodes: IniTreeNode[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  onAddSection: (name: string, afterSectionId?: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string, newName: string) => void;
  onRenameSection: (sectionId: string, newName: string) => void;
  onReorderSections: (sectionIds: string[]) => void;
  validationIssues: IniValidationIssue[];
}

export const IniTreeView: React.FC<IniTreeViewProps> = ({
  treeNodes,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onDeleteSection,
  onDuplicateSection,
  onRenameSection,
  onReorderSections,
  validationIssues,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleNodeClick = useCallback((node: IniTreeNode) => {
    if (node.type === 'root') {
      onSelectSection(null);
    } else {
      onSelectSection(node.sectionId || null);
    }
  }, [onSelectSection]);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      nodeId,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const startEditing = useCallback((nodeId: string, currentName: string) => {
    setEditingNodeId(nodeId);
    setEditingValue(currentName);
    closeContextMenu();
  }, [closeContextMenu]);

  const saveEdit = useCallback(() => {
    if (editingNodeId && editingValue.trim()) {
      const node = treeNodes.find(n => n.id === editingNodeId);
      if (node && node.sectionId) {
        onRenameSection(node.sectionId, editingValue.trim());
      }
    }
    setEditingNodeId(null);
    setEditingValue("");
  }, [editingNodeId, editingValue, treeNodes, onRenameSection]);

  const cancelEdit = useCallback(() => {
    setEditingNodeId(null);
    setEditingValue("");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleAddSection = useCallback(() => {
    if (newSectionName.trim()) {
      onAddSection(newSectionName.trim());
      setNewSectionName("");
      setShowAddForm(false);
    }
  }, [newSectionName, onAddSection]);

  const handleDuplicate = useCallback((nodeId: string) => {
    const node = treeNodes.find(n => n.id === nodeId);
    if (node && node.sectionId) {
      const newName = `${node.name}_copy`;
      onDuplicateSection(node.sectionId, newName);
    }
    closeContextMenu();
  }, [treeNodes, onDuplicateSection, closeContextMenu]);

  const handleDelete = useCallback((nodeId: string) => {
    const node = treeNodes.find(n => n.id === nodeId);
    if (node && node.sectionId) {
      onDeleteSection(node.sectionId);
    }
    closeContextMenu();
  }, [treeNodes, onDeleteSection, closeContextMenu]);

  const getNodeIcon = (node: IniTreeNode) => {
    if (node.type === 'root') {
      return expandedNodes.has(node.id) ? <FolderOpen size={16} /> : <Folder size={16} />;
    }
    return <Settings size={16} />;
  };

  const getNodeIssues = (nodeId: string) => {
    return validationIssues.filter(issue => 
      issue.sectionId === nodeId || 
      (nodeId === 'root' && !issue.sectionId)
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Sections</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Add new section"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Add Section Form */}
        {showAddForm && (
          <div className="space-y-2">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Section name"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddSection();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewSectionName("");
                }
              }}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddSection}
                disabled={!newSectionName.trim()}
                className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewSectionName("");
                }}
                className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tree Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {treeNodes.map((node) => {
          const isSelected = node.type === 'root' 
            ? selectedSectionId === null 
            : selectedSectionId === node.sectionId;
          const isExpanded = expandedNodes.has(node.id);
          const nodeIssues = getNodeIssues(node.sectionId || 'root');
          const hasErrors = nodeIssues.some(issue => issue.type === 'error');
          const hasWarnings = nodeIssues.some(issue => issue.type === 'warning');

          return (
            <div key={node.id} className="mb-1">
              <div
                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-500/20 text-blue-400"
                    : "hover:bg-gray-700/50 text-gray-300"
                }`}
                onClick={() => handleNodeClick(node)}
                onContextMenu={(e) => node.type !== 'root' && handleContextMenu(e, node.id)}
              >
                {/* Expand/Collapse Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(node.id);
                  }}
                  className="mr-2 text-gray-400 hover:text-gray-200"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Node Icon */}
                <div className="mr-2 text-gray-400">
                  {getNodeIcon(node)}
                </div>

                {/* Node Name */}
                <div className="flex-1 min-w-0">
                  {editingNodeId === node.id ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-gray-800 border border-blue-500 rounded px-1 py-0.5 text-sm text-gray-200 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium truncate">
                      {node.name}
                    </span>
                  )}
                </div>

                {/* Key Count Badge */}
                <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded ml-2">
                  {node.keyCount}
                </span>

                {/* Validation Issues */}
                {(hasErrors || hasWarnings) && (
                  <div className="ml-2">
                    <AlertTriangle 
                      size={14} 
                      className={hasErrors ? "text-red-400" : "text-yellow-400"} 
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[150px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 200),
            }}
          >
            <button
              onClick={() => {
                const node = treeNodes.find(n => n.id === contextMenu.nodeId);
                if (node) {
                  startEditing(node.id, node.name);
                }
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <Edit3 size={14} />
              <span>Rename</span>
            </button>
            <button
              onClick={() => handleDuplicate(contextMenu.nodeId)}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <Copy size={14} />
              <span>Duplicate</span>
            </button>
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={() => handleDelete(contextMenu.nodeId)}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Validation Panel */}
      {showValidationPanel && (
        <IniValidationPanel
          issues={validationIssues}
          onClose={() => setShowValidationPanel(false)}
          onSelectSection={setSelectedSectionId}
        />
      )}
    </div>
  );
};