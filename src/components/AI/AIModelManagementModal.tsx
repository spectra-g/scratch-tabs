import React from 'react';
import { useAIStore } from '../../stores/aiStore';
import { useModalStore } from '../../stores/modalStore';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { Brain, Shield, Wifi, Clock, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Feature flag to control codegen visibility
const ENABLE_CODEGEN_WORKER = false;

interface FileProgress {
  file: string;
  loaded: number;
  total?: number;
  percent?: number;
  status?: string;
  completed: boolean;
  lastUpdateTime: number;
}

export const AIModelManagementModal: React.FC = () => {
  const { isAIModelManagementModalOpen, closeAIModelManagementModal } = useModalStore();
  
  const {
    isReady, isLoading, error, progress, _progressStatus, files, initializeModel,
    isCodegenReady, isCodegenLoading, codegenProgress, _codegenProgressStatus, codegenError, codegenFiles, initializeCodegenModel
  } = useAIStore(state => ({
    isReady: state.ai.isReady,
    isLoading: state.ai.isLoading,
    error: state.ai.error,
    progress: state.ai.progress,
    _progressStatus: state.ai.progressStatus,
    files: state.ai.files,
    initializeModel: state.initializeModel,
    isCodegenReady: state.ai.isCodegenReady,
    isCodegenLoading: state.ai.isCodegenLoading,
    codegenProgress: state.ai.codegenProgress,
    _codegenProgressStatus: state.ai.codegenProgressStatus,
    codegenError: state.ai.codegenError,
    codegenFiles: state.ai.codegenFiles,
    initializeCodegenModel: state.initializeCodegenModel,
  }));

  if (!isAIModelManagementModalOpen) {
    return null;
  }

  // Helper to determine overall AI state
  const getOverallState = () => {
    const hasErrors = error || codegenError;
    const isDownloading = isLoading || isCodegenLoading;
    const bothReady = isReady && isCodegenReady;
    const someReady = isReady || isCodegenReady;

    if (hasErrors) return 'error';
    if (isDownloading) return 'downloading';
    if (bothReady) return 'ready';
    if (someReady) return 'ready'; // If any model is ready, show as ready
    return 'initial';
  };

  const state = getOverallState();

  // Helper to render progress for a specific model
  const renderModelProgress = (modelName: string, _progress: number, files: Record<string, FileProgress>) => {
    const visibleFiles = Object.values(files).filter(file =>
      !file.completed || (Date.now() - file.lastUpdateTime < 10000)
    );

    return (
      <div className="mb-4">
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-300">{modelName}</span>
        </div>
        {visibleFiles.length > 0 && (
          <div className="space-y-2">
            {visibleFiles.map(file => (
              <div key={file.file} className="flex items-center space-x-2">
                <div className="flex-grow bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${file.percent || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 min-w-[35px]">
                  {file.percent !== undefined ? `${file.percent}%` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper to render model status
  const renderModelStatus = (modelName: string, description: string, size: string, isModelReady: boolean, isModelLoading: boolean) => {
    let status = 'Not Downloaded';
    let icon = <Download size={16} className="text-gray-400" />;
    
    if (isModelReady) {
      status = 'Ready';
      icon = <CheckCircle size={16} className="text-green-400" />;
    } else if (isModelLoading) {
      status = 'Downloading...';
      icon = <Loader2 size={16} className="text-blue-400 animate-spin" />;
    }

    return (
      <div className="border border-gray-700 rounded-lg p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-gray-200 mb-1">{modelName}</h4>
            <p className="text-sm text-gray-400 mb-2">{description}</p>
            <p className="text-xs text-gray-500">Download Size: {size}</p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {icon}
            <span className="text-sm text-gray-300">{status}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleDownloadAll = () => {
    if (!isReady && !isLoading) {
      initializeModel();
    }
    if (ENABLE_CODEGEN_WORKER && !isCodegenReady && !isCodegenLoading) {
      initializeCodegenModel();
    }
  };



  const handleRetry = () => {
    // Reset and retry initialization
    if (error) {
      initializeModel();
    }
    if (ENABLE_CODEGEN_WORKER && codegenError) {
      initializeCodegenModel();
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Brain size={48} className="text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">Activate In-Browser AI Features</h2>
              <p className="text-gray-400 mb-6">
                Our AI tools run entirely in your browser. To enable them, you need to download the necessary models. 
                This is a one-time download, and afterward, all AI processing happens locally and offline on your machine.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Shield size={20} className="text-green-400" />
                <div>
                  <span className="text-green-400 font-medium">100% Private:</span>
                  <span className="text-gray-300 ml-2">Your data never leaves your computer.</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Wifi size={20} className="text-blue-400" />
                <div>
                  <span className="text-blue-400 font-medium">Works Offline:</span>
                  <span className="text-gray-300 ml-2">Once downloaded, no internet connection is required.</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock size={20} className="text-yellow-400" />
                <div>
                  <span className="text-yellow-400 font-medium">One-Time Setup:</span>
                  <span className="text-gray-300 ml-2">Models are cached by your browser for future use.</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-200">Available Models</h3>
              {renderModelStatus(
                'Text Summarization Model',
                'Provides concise summaries of long documents or code.',
                'Approx. ~300 MB',
                isReady,
                isLoading
              )}
              {ENABLE_CODEGEN_WORKER && renderModelStatus(
                'Code Generation Model',
                'Generates code based on your instructions.',
                'Approx. ~350 MB',
                isCodegenReady,
                isCodegenLoading
              )}
            </div>

            <button
              onClick={handleDownloadAll}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Download size={16} />
              <span>Download All Models</span>
            </button>
          </div>
        );

      case 'downloading':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Loader2 size={48} className="text-blue-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">Downloading AI Models...</h2>
              <p className="text-gray-400">Please wait while we download the required models. This may take a few minutes.</p>
            </div>

            <div className="space-y-4">
              {(isLoading || isReady) && (
                renderModelProgress('Text Summarization Model', progress, files)
              )}
              {ENABLE_CODEGEN_WORKER && (isCodegenLoading || isCodegenReady) && Object.keys(codegenFiles).length > 0 && (
                renderModelProgress('Code Generation Model', codegenProgress, codegenFiles)
              )}
            </div>

            <div className="text-center text-sm text-gray-400">
              You can close this modal - the download will continue in the background.
            </div>
          </div>
        );



      case 'ready':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">AI Features are Ready!</h2>
              <p className="text-gray-400 mb-6">
                You can now use AI features, such as right-clicking on selected content to get a summary{ENABLE_CODEGEN_WORKER ? ' or generate code' : ''}.
              </p>
            </div>

            <div className="space-y-3">
              {renderModelStatus(
                'Text Summarization Model',
                'Provides concise summaries of long documents or code.',
                'Approx. ~300 MB',
                isReady,
                isLoading
              )}
              {ENABLE_CODEGEN_WORKER && renderModelStatus(
                'Code Generation Model',
                'Generates code based on your instructions.',
                'Approx. ~350 MB',
                isCodegenReady,
                isCodegenLoading
              )}
            </div>

            <button
              onClick={closeAIModelManagementModal}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">An Error Occurred</h2>
              <div className="text-red-300 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                {error || (ENABLE_CODEGEN_WORKER && codegenError)}
              </div>
            </div>

            <button
              onClick={handleRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Download size={16} />
              <span>Retry Download</span>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <BaseModal
      title=""
      onClose={closeAIModelManagementModal}
      maxWidthClass="max-w-2xl"
    >
      <div className="p-6">
        {renderContent()}
      </div>
    </BaseModal>
  );
}; 