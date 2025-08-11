import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartViewProps } from '../../../../views/registry';
import { parseCurlDocument, ParsedDocument, ParsedBlock, getCurlDocumentSummary } from '../../utils/parser';
import { compileCurlDocument, updateCurlBlockInDocument } from '../../utils/compiler';
import { CurlCard } from './CurlCard';
import { CurlDocumentHeader } from './CurlDocumentHeader';
import { CurlOptionsPalette } from './CurlOptionsPalette';
import { tabletActionService } from '../../../../services/tabletActionService';
import { Plus, FileText, Terminal } from '../../../../components/Icons';

export const CurlSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
}) => {
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  const [showOptionsPalette, setShowOptionsPalette] = useState(false);
  const isInternalUpdateRef = useRef(false);

  // Parse document when content changes (but not during internal updates)
  useEffect(() => {
    // Skip parsing if this is an internal update to avoid regenerating IDs
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    
    try {
      const parsed = parseCurlDocument(content);
      setParsedDoc(parsed);
      
      // Auto-select first curl command if none selected
      if (!activeCardId) {
        const firstCurlBlock = parsed.find(block => block.type === 'curl');
        if (firstCurlBlock) {
          setActiveCardId(firstCurlBlock.id);
        }
      }
    } catch (error) {
      console.error('Failed to parse curl document:', error);
      setParsedDoc([]);
    }
  }, [content]);

  // Get document summary
  const summary = useMemo(() => getCurlDocumentSummary(parsedDoc), [parsedDoc]);

  // Get curl blocks for rendering
  const curlBlocks = useMemo(() => 
    parsedDoc.filter(block => block.type === 'curl') as Array<ParsedBlock & { type: 'curl' }>
  , [parsedDoc]);

  // Get active block
  const activeBlock = useMemo(() => 
    parsedDoc.find(block => block.id === activeCardId)
  , [parsedDoc, activeCardId]);

  // Handle request changes from the builder
  const handleRequestChange = useCallback((newRequest: any) => {
    if (!activeCardId) {
      return;
    }
    
    const updatedDoc = updateCurlBlockInDocument(parsedDoc, activeCardId, newRequest);
    setParsedDoc(updatedDoc);
    
    // Mark this as an internal update to prevent reparsing
    isInternalUpdateRef.current = true;
    
    // Sync back to content
    const newContent = compileCurlDocument(updatedDoc);
    onContentChange(newContent);
  }, [parsedDoc, activeCardId, onContentChange]);

  // Handle opening in Rest Client
  const handleOpenInRestClient = useCallback(() => {
    const activeBlock = parsedDoc.find(block => block.id === activeCardId);
    if (activeBlock?.type === 'curl') {
      tabletActionService.handleAction({
        targetTablet: 'restclient',
        action: 'new-tab',
        payload: activeBlock.request,
        source: { 
          titleHint: `API: ${activeBlock.request.method} ${activeBlock.request.url}`,
          tabId 
        },
      });
    }
  }, [parsedDoc, activeCardId, tabId]);

  // Handle adding new curl command
  const handleAddNewCommand = useCallback(() => {
    const newRequest = {
      method: 'GET',
      url: 'https://api.example.com',
      headers: [],
      body: undefined,
      otherOptions: [],
    };
    
    const newBlock: ParsedBlock = {
      type: 'curl',
      request: newRequest,
      raw: 'curl https://api.example.com',
      id: `curl-new-${Date.now()}`,
    };
    
    const updatedDoc = [...parsedDoc, newBlock];
    setParsedDoc(updatedDoc);
    setActiveCardId(newBlock.id);
    
    // Sync back to content
    const newContent = compileCurlDocument(updatedDoc);
    onContentChange(newContent);
  }, [parsedDoc, onContentChange]);

  // Handle deleting a curl command
  const handleDeleteCommand = useCallback((blockId: string) => {
    const updatedDoc = parsedDoc.filter(block => block.id !== blockId);
    setParsedDoc(updatedDoc);
    
    // If we deleted the active block, clear the active card
    if (activeCardId === blockId) {
      setActiveCardId(null);
    }
    
    // Sync back to content
    const newContent = compileCurlDocument(updatedDoc);
    onContentChange(newContent);
  }, [parsedDoc, activeCardId, onContentChange]);

  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <div className="text-center">
          <Terminal size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-lg mb-2">No Curl commands found</p>
          <p className="text-sm mb-4">Add a Curl command to get started</p>
          <button
            onClick={handleAddNewCommand}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Add Curl Command</span>
          </button>
        </div>
      </div>
    );
  }

  if (curlBlocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-lg mb-2">No valid Curl commands detected</p>
          <p className="text-sm">This document contains text but no parseable Curl commands</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-900 text-gray-200" data-testid="curl-smart-view">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Document header */}
        <CurlDocumentHeader 
          summary={summary}
          onAddCommand={handleAddNewCommand}
          onToggleOptionsPalette={() => setShowOptionsPalette(!showOptionsPalette)}
          showOptionsPalette={showOptionsPalette}
        />

        {/* Command cards */}
        <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-4">
          <AnimatePresence>
            {curlBlocks.map((block) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CurlCard
                  request={block.request}
                  isExpanded={activeCardId === block.id}
                  onClick={() => setActiveCardId(block.id)}
                  onRequestChange={handleRequestChange}
                  onOpenInRestClient={handleOpenInRestClient}
                  onDelete={() => handleDeleteCommand(block.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Options palette sidebar */}
      <AnimatePresence>
        {showOptionsPalette && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-l border-gray-700 bg-gray-800/50 overflow-hidden"
          >
            <CurlOptionsPalette
              onAddOption={(option) => {
                // Add option to active request
                if (activeBlock?.type === 'curl') {
                  const updatedRequest = { ...activeBlock.request };
                  
                  // Handle different option types
                  if (option.category === 'headers') {
                    updatedRequest.headers.push({ key: option.flag.replace('-H', '').trim(), value: '' });
                  } else if (option.category === 'data') {
                    updatedRequest.body = updatedRequest.body || '';
                  } else {
                    updatedRequest.otherOptions.push({ flag: option.flag, value: option.defaultValue });
                  }
                  
                  handleRequestChange(updatedRequest);
                }
              }}
              onClose={() => setShowOptionsPalette(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};