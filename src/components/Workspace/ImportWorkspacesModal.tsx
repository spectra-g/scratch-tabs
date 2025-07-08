import React, { useState, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImportExportService } from '../../features/import-export/ImportExportService';
import { ImportProcessSummary } from '../../features/import-export/types';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { X, UploadCloud, AlertTriangle, CheckCircle } from 'lucide-react';

interface ImportWorkspacesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'selectFile' | 'loading' | 'summary';

export const ImportWorkspacesModal: React.FC<ImportWorkspacesModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<ImportStep>('selectFile');
  const [summary, setSummary] = useState<ImportProcessSummary | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const service = useMemo(() => new ImportExportService(), []);
  const workspaceStore = useWorkspaceStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      if (!file.name.endsWith('.scratch')) {
        setProcessingError("Invalid file type. Please select a '.scratch' file.");
        setStep('selectFile'); // Stay on select file step
        return;
      }
      
      setProcessingError(null);
      setStep('loading');
      setSummary(null);
      
      try {
        const importResult = await service.importWorkspaces(file);
        setSummary(importResult);
        setStep('summary');
      } catch (error) {
        console.error('Import error:', error);
        setProcessingError(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
        setStep('selectFile');
      }
    }
  }, [service]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/octet-stream': ['.scratch'] }, // More specific if possible
    multiple: false,
    disabled: step === 'loading' || step === 'summary',
  });

  const handleClose = () => {
    // If we're closing from the summary step, update the workspace list and switch to imported workspace
    if (step === 'summary' && summary && summary.importedWorkspaces.length > 0) {
      // First, load all workspaces to get the updated list
      workspaceStore.loadWorkspaces().then(() => {
        // Find the most recently imported workspace (it will have the highest lastAccessed timestamp)
        const { workspaces } = useWorkspaceStore.getState();
        if (workspaces.length > 0) {
          // Sort by lastAccessed to find the most recently imported workspace
          const sortedWorkspaces = [...workspaces].sort((a, b) => b.lastAccessed - a.lastAccessed);
          const mostRecentWorkspace = sortedWorkspaces[0];
          
          // Switch to the most recently imported workspace
          useWorkspaceStore.getState().switchWorkspace(mostRecentWorkspace.id);
        }
      });
    } else if (step === 'summary') {
      // If no workspaces were imported, just refresh the workspace list
      workspaceStore.loadWorkspaces();
    }
    setStep('selectFile');
    setSummary(null);
    setProcessingError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700/50 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Import Workspaces</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {step === 'selectFile' && (
          <div {...getRootProps()} className={`mt-4 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center text-center">
              <UploadCloud size={48} className="text-gray-400 mb-3" />
              {isDragActive ? (
                <p className="text-blue-400">Drop the .scratch file here...</p>
              ) : (
                <p className="text-gray-400">Drag & drop a '.scratch' file here, or click to select</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Only .scratch files are accepted</p>
            </div>
          </div>
        )}
        {processingError && step === 'selectFile' && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md flex items-center">
            <AlertTriangle size={18} className="mr-2" /> {processingError}
          </p>
        )}


        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-300">Processing import file...</p>
          </div>
        )}

        {step === 'summary' && summary && (
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
            <h3 className="text-lg font-medium text-gray-100 mb-3">Import Summary</h3>
            {summary.errors.length > 0 && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <h4 className="font-semibold text-red-300 mb-1 flex items-center"><AlertTriangle size={18} className="mr-2" />Errors:</h4>
                <ul className="list-disc list-inside text-sm text-red-400 space-y-1">
                  {summary.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}
            {summary.importedWorkspaces.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-200 mb-1">Successfully Processed Workspaces:</h4>
                {summary.importedWorkspaces.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-700/50 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle size={18} className="mr-2 text-green-400" />
                        <span className="text-gray-100">{item.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{item.tabCount} tab{item.tabCount === 1 ? '' : 's'}</span>
                    </div>
                    {item.status === 'merged' && item.reason && (
                      <p className="text-xs text-yellow-400/80 mt-1 ml-6">{item.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {summary.errors.length === 0 && summary.importedWorkspaces.length === 0 && (
              <p className="text-center text-gray-400 py-4">No workspaces were imported. The file might have been empty or contained no new data.</p>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-gray-700/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
          >
            {step === 'summary' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};