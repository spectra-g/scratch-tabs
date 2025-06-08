import * as React from 'react';
import { useState, useCallback } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Camera,
  Replace,
  X,
  History,
  Download,
  FileText,
  Database,
  Code,
  ChevronDown,
} from 'lucide-react';
import { CsvDiagnostic, CsvSnapshot } from '../types';

interface DuplicateGroup {
  rowString: string;
  rowIds: string[];
  count: number;
}

interface CsvToolbarProps {
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  
  // Snapshots
  snapshots: CsvSnapshot[];
  showSnapshotsPanel: boolean;
  onToggleSnapshotsPanel: (show: boolean) => void;
  onCreateSnapshot: (name: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  
  // Duplicates
  duplicateGroups: DuplicateGroup[];
  showDuplicatesOnly: boolean;
  onFindDuplicates: () => void;
  onToggleDuplicatesOnly: (show: boolean) => void;
  onRemoveDuplicates: () => void;
  onClearDuplicates: () => void;
  
  // Export
  onExportCsv: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportSql: (tableName: string) => void;
  
  // Data info
  rowCount: number;
  columnCount: number;
  diagnostics: CsvDiagnostic[];
  isValid: boolean;
}

export const CsvToolbar: React.FC<CsvToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  snapshots,
  showSnapshotsPanel,
  onToggleSnapshotsPanel,
  onCreateSnapshot,
  duplicateGroups,
  showDuplicatesOnly,
  onFindDuplicates,
  onToggleDuplicatesOnly,
  onRemoveDuplicates,
  onClearDuplicates,
  onExportCsv,
  onExportJson,
  onExportMarkdown,
  onExportSql,
  rowCount,
  columnCount,
  diagnostics,
  isValid
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sqlTableName, setSqlTableName] = useState('my_table');

  const handleExportSql = useCallback(() => {
    onExportSql(sqlTableName);
    setShowExportMenu(false);
  }, [onExportSql, sqlTableName]);

  const handleExportCsv = useCallback(() => {
    onExportCsv();
    setShowExportMenu(false);
  }, [onExportCsv]);

  const handleExportJson = useCallback(() => {
    onExportJson();
    setShowExportMenu(false);
  }, [onExportJson]);

  const handleExportMarkdown = useCallback(() => {
    onExportMarkdown();
    setShowExportMenu(false);
  }, [onExportMarkdown]);

  return (
    <div className="flex-none border-b border-gray-700 p-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Undo/Redo */}
        <button 
          onClick={onUndo} 
          disabled={!canUndo} 
          title="Undo"
          className={`p-2 rounded ${canUndo ? 'hover:bg-gray-700' : 'opacity-50 cursor-not-allowed'}`}
        >
          <RotateCcw size={16} />
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo} 
          title="Redo" 
          className={`p-2 rounded transform scale-x-[-1] ${canRedo ? 'hover:bg-gray-700' : 'opacity-50 cursor-not-allowed'}`}
        >
          <RotateCcw size={16} />
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-2" />
        
        {/* Snapshots */}
        <button 
          onClick={() => onCreateSnapshot(`Snapshot ${snapshots.length + 1}`)} 
          title="Create snapshot"
          className="p-2 rounded hover:bg-gray-700"
        >
          <Camera size={16} />
        </button>
        {snapshots.length > 0 && (
          <button 
            onClick={() => onToggleSnapshotsPanel(!showSnapshotsPanel)}
            title="Manage snapshots"
            className={`p-2 rounded ${showSnapshotsPanel ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700'}`}
          >
            <History size={16} />
          </button>
        )}
        
        <div className="w-px h-6 bg-gray-700 mx-2" />
        
        {/* Export Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export data"
            className={`flex items-center space-x-1 px-3 py-2 rounded ${showExportMenu ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700'}`}
          >
            <Download size={16} />
            <span className="text-sm">Export</span>
            <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {showExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-40 min-w-[200px]">
                <div className="py-1">
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-green-400" />
                      <span>CSV</span>
                    </div>
                    <span className="text-xs text-gray-500">export.csv</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Code size={16} className="text-blue-400" />
                      <span>JSON</span>
                    </div>
                    <span className="text-xs text-gray-500">export.json</span>
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-purple-400" />
                      <span>Markdown</span>
                    </div>
                    <span className="text-xs text-gray-500">export.md</span>
                  </button>
                  <div className="border-t border-gray-700 my-1" />
                  <div className="px-3 py-2">
                    <label className="block text-xs text-gray-400 mb-1">SQL Table Name:</label>
                    <input
                      type="text"
                      value={sqlTableName}
                      onChange={(e) => setSqlTableName(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      placeholder="table_name"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    onClick={handleExportSql}
                    disabled={!sqlTableName.trim()}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-2">
                      <Database size={16} className="text-orange-400" />
                      <span>SQL</span>
                    </div>
                    <span className="text-xs text-gray-500">{sqlTableName || 'table'}_inserts.sql</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="w-px h-6 bg-gray-700 mx-2" />
        
        {/* Duplicates Controls */}
        {duplicateGroups.length === 0 ? (
          <button 
            onClick={onFindDuplicates} 
            title="Find duplicate rows"
            className="p-2 rounded hover:bg-gray-700"
          >
            <Replace size={16} />
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onToggleDuplicatesOnly(!showDuplicatesOnly)}
              title={showDuplicatesOnly ? "Show all rows" : "Show only duplicates"}
              className={`px-3 py-1 rounded text-sm ${
                showDuplicatesOnly 
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showDuplicatesOnly ? 'Show All' : 'Duplicates Only'}
            </button>
            <button 
              onClick={onRemoveDuplicates}
              title="Remove duplicate rows (keep first occurrence)"
              className="px-3 py-1 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              Remove Duplicates
            </button>
            <button 
              onClick={onClearDuplicates}
              title="Clear duplicate analysis"
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      
      {/* Status Info */}
      <div className="flex items-center space-x-4 text-sm text-gray-400">
        <span>{rowCount} rows × {columnCount} columns</span>
        {duplicateGroups.length > 0 && (
          <span className="text-yellow-400">
            {duplicateGroups.reduce((sum, group) => sum + group.count, 0)} duplicate rows in {duplicateGroups.length} groups
          </span>
        )}
        <div className="flex items-center space-x-1">
          {isValid ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-yellow-400" />}
          <span className="text-xs">{diagnostics.filter(d=>d.type==='error').length} errors, {diagnostics.filter(d=>d.type==='warning').length} warnings</span>
        </div>
      </div>
    </div>
  );
}; 