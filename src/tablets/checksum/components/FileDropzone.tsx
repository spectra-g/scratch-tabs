import React, { useCallback, useState } from 'react';
import { Upload, File, AlertCircle } from '../../../components/Icons';
import { FileInfo } from '../types';
import { formatFileSize } from '../utils/hashing';

interface FileDropzoneProps {
  onFileSelected: (file: File, fileInfo: FileInfo) => void;
  isProcessing: boolean;
  currentFile: FileInfo | null;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  isProcessing,
  currentFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragError(null);

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      setDragError('No files detected');
      return;
    }

    if (files.length > 1) {
      setDragError('Please drop only one file at a time');
      return;
    }

    const file = files[0];
    
    // Check file size (warn for very large files)
    if (file.size > 5 * 1024 * 1024 * 1024) { // 5GB
      setDragError('File is very large (>5GB). Processing may take a long time.');
      // Still allow processing
    }

    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
    };

    onFileSelected(file, fileInfo);
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileInfo: FileInfo = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
    };

    onFileSelected(file, fileInfo);
    
    // Reset input
    e.target.value = '';
  }, [onFileSelected]);

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : isProcessing
            ? 'border-gray-600 bg-gray-800/50'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
        } ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          onChange={handleFileInput}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept="*/*"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload 
              size={48} 
              className={`${
                isDragOver ? 'text-blue-400' : 
                isProcessing ? 'text-gray-500' : 'text-gray-400'
              } transition-colors`} 
            />
          </div>
          
          <div>
            <h3 className={`text-lg font-semibold ${
              isDragOver ? 'text-blue-400' : 
              isProcessing ? 'text-gray-500' : 'text-gray-200'
            }`}>
              {isDragOver ? 'Drop file here' : 
               isProcessing ? 'Processing...' : 'Drop file or click to select'}
            </h3>
            <p className="text-gray-400 mt-2">
              {isProcessing 
                ? 'Please wait while we calculate checksums'
                : 'All processing happens locally in your browser'
              }
            </p>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <div className="text-sm text-gray-300">Processing file...</div>
            </div>
          </div>
        )}
      </div>

      {/* Current File Info */}
      {currentFile && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <File size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-200 truncate">{currentFile.name}</h4>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-400">
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(currentFile.size)}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {currentFile.type || 'Unknown'}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Modified:</span> {new Date(currentFile.lastModified).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {dragError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{dragError}</span>
          </div>
        </div>
      )}

    </div>
  );
};