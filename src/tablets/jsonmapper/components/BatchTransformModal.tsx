import React, { useState, useRef } from 'react';
import { X, Upload, Download, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { MappingConfig, MappingDirection } from '../types';
import { processJsonFile, processZipFile, downloadStringAsFile, downloadZip } from '../utils/fileUtils';
import JSZip from 'jszip';

interface BatchTransformModalProps {
  mapping: MappingConfig;
  onClose: () => void;
  initialDirection?: MappingDirection;
}

export const BatchTransformModal: React.FC<BatchTransformModalProps> = ({
  mapping,
  onClose,
  initialDirection = 'sourceToTarget'
}) => {
  const [direction, setDirection] = useState<MappingDirection>(initialDirection);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ content?: string; zip?: JSZip; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDirectionChange = (newDirection: MappingDirection) => {
    setDirection(newDirection);
    // Reset state when direction changes
    setFile(null);
    setResult(null);
    setProgress(0);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setProgress(0);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setProgress(0);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleTransform = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        // Process single JSON file
        const result = await processJsonFile(file, mapping, direction);
        setResult(result);
      } else if (file.name.toLowerCase().endsWith('.zip')) {
        // Process ZIP file
        const result = await processZipFile(file, mapping, direction, setProgress);
        setResult(result);
      } else {
        setResult({ error: 'Unsupported file type. Please upload a JSON or ZIP file.' });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setResult({ 
        error: error instanceof Error ? error.message : 'Unknown error processing file' 
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDownload = async () => {
    if (!result) return;
    
    if (result.content) {
      // Download single JSON file
      const filename = file?.name.replace(/\.json$/, '') + '_transformed.json';
      downloadStringAsFile(result.content, filename);
    } else if (result.zip) {
      // Download ZIP file
      const filename = file?.name.replace(/\.zip$/, '') + '_transformed.zip';
      await downloadZip(result.zip, filename);
    }
  };
  
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-100">
            Batch Transform: {mapping.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Direction Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transformation Direction
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDirectionChange('sourceToTarget')}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm
                    ${direction === 'sourceToTarget'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }
                    transition-colors
                  `}
                >
                  <span>Source to Target</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleDirectionChange('targetToSource')}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm
                    ${direction === 'targetToSource'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }
                    transition-colors
                  `}
                >
                  <ArrowLeft size={16} />
                  <span>Target to Source</span>
                </button>
              </div>
            </div>
            
            {/* File Upload */}
            {!result && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-700/50 rounded-lg p-8 text-center hover:border-gray-600/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="bg-gray-900/50 border border-gray-700/50 rounded-md px-4 py-2 text-sm text-gray-200">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={handleReset}
                        className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
                      >
                        Change File
                      </button>
                      <button
                        onClick={handleTransform}
                        disabled={isProcessing}
                        className={`
                          flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm
                          ${isProcessing
                            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                          }
                          transition-colors
                        `}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight size={16} />
                            <span>Transform</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {isProcessing && file.name.toLowerCase().endsWith('.zip') && (
                      <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-blue-500 h-2.5 rounded-full"
                          style={{ width: `${progress * 100}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload size={48} className="mx-auto text-gray-500" />
                    <p className="text-gray-400">
                      Drag and drop a file here, or click to select
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
                    >
                      Select File
                    </button>
                    <p className="text-xs text-gray-500">
                      Supported formats: JSON, ZIP (containing JSON files)
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Result */}
            {result && (
              <div className="space-y-4">
                {result.error ? (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    <h3 className="font-medium mb-2">Error</h3>
                    <p>{result.error}</p>
                  </div>
                ) : (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400">
                    <h3 className="font-medium mb-2">Success</h3>
                    <p>
                      {result.content
                        ? 'JSON file transformed successfully.'
                        : 'ZIP file processed successfully.'}
                    </p>
                  </div>
                )}
                
                {!result.error && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleDownload}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
                    >
                      <Download size={16} />
                      <span>Download Result</span>
                    </button>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
                  >
                    Process Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};