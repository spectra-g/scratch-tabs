import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Globe, FileText, Key, Settings } from '../../../../components/Icons';
import { CurlRequest } from '../../utils/parser';
import { Editor } from '@monaco-editor/react';

interface CurlRequestBuilderProps {
  request: CurlRequest;
  onRequestChange: (newRequest: CurlRequest) => void;
}

type TabType = 'url' | 'headers' | 'body' | 'options';

export const CurlRequestBuilder: React.FC<CurlRequestBuilderProps> = ({
  request,
  onRequestChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('url');

  // Handle method change
  const handleMethodChange = useCallback((method: string) => {
    console.log('🛠️ Method changed', { method, request });
    onRequestChange({ ...request, method });
  }, [request, onRequestChange]);

  // Handle URL change
  const handleUrlChange = useCallback((url: string) => {
    console.log('🌐 URL changed', { url, request });
    onRequestChange({ ...request, url });
  }, [request, onRequestChange]);

  // Handle header changes
  const handleHeaderChange = useCallback((index: number, key: string, value: string) => {
    const newHeaders = [...request.headers];
    newHeaders[index] = { key, value };
    onRequestChange({ ...request, headers: newHeaders });
  }, [request, onRequestChange]);

  const handleAddHeader = useCallback(() => {
    console.log('➕ Adding header', { currentHeaders: request.headers });
    const newHeaders = [...request.headers, { key: '', value: '' }];
    onRequestChange({ ...request, headers: newHeaders });
  }, [request, onRequestChange]);

  const handleRemoveHeader = useCallback((index: number) => {
    const newHeaders = request.headers.filter((_, i) => i !== index);
    onRequestChange({ ...request, headers: newHeaders });
  }, [request, onRequestChange]);

  // Handle body change
  const handleBodyChange = useCallback((body: string) => {
    console.log('📋 Body changed', { body, request });
    onRequestChange({ ...request, body: body || undefined });
  }, [request, onRequestChange]);

  // Handle option changes
  const handleOptionChange = useCallback((index: number, flag: string, value?: string) => {
    const newOptions = [...request.otherOptions];
    newOptions[index] = { flag, value };
    onRequestChange({ ...request, otherOptions: newOptions });
  }, [request, onRequestChange]);

  const handleAddOption = useCallback(() => {
    console.log('➕ Adding option', { currentOptions: request.otherOptions });
    const newOptions = [...request.otherOptions, { flag: '', value: '' }];
    onRequestChange({ ...request, otherOptions: newOptions });
  }, [request, onRequestChange]);

  const handleRemoveOption = useCallback((index: number) => {
    const newOptions = request.otherOptions.filter((_, i) => i !== index);
    onRequestChange({ ...request, otherOptions: newOptions });
  }, [request, onRequestChange]);

  // Method options
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // Tab configuration
  const tabs = [
    { id: 'url' as TabType, label: 'URL & Method', icon: Globe },
    { id: 'headers' as TabType, label: 'Headers', icon: Key, count: request.headers.length },
    { id: 'body' as TabType, label: 'Body', icon: FileText, hasContent: !!request.body },
    { id: 'options' as TabType, label: 'Options', icon: Settings, count: request.otherOptions.length },
  ];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex space-x-1 bg-gray-700/30 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
            {tab.hasContent && (
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-800/50 rounded-lg p-4"
      >
        {activeTab === 'url' && (
          <div className="space-y-4">
            {/* Method selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                HTTP Method
              </label>
              <select
                value={request.method}
                onChange={(e) => handleMethodChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {methods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* URL input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL
              </label>
              <input
                type="text"
                value={request.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Request Headers</h3>
              <button
                onClick={handleAddHeader}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
              >
                <Plus size={12} />
                <span>Add Header</span>
              </button>
            </div>

            <div className="space-y-2">
              {request.headers.map((header, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => handleHeaderChange(index, e.target.value, header.value)}
                    placeholder="Header name"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-500">:</span>
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => handleHeaderChange(index, header.key, e.target.value)}
                    placeholder="Header value"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleRemoveHeader(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
              
              {request.headers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Key size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No headers configured</p>
                  <p className="text-xs">Click "Add Header" to get started</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Request Body</h3>
              <div className="flex items-center space-x-2">
                {request.body && (
                  <span className="text-xs text-gray-500">
                    {request.body.length} characters
                  </span>
                )}
                <button
                  onClick={() => handleBodyChange('')}
                  className="text-xs text-red-400 hover:text-red-300"
                  disabled={!request.body}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="border border-gray-600 rounded-lg overflow-hidden">
              <Editor
                height="200px"
                language="json"
                theme="vs-dark"
                value={request.body || ''}
                onChange={(value) => handleBodyChange(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'options' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">cURL Options</h3>
              <button
                onClick={handleAddOption}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
              >
                <Plus size={12} />
                <span>Add Option</span>
              </button>
            </div>

            <div className="space-y-2">
              {request.otherOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option.flag}
                    onChange={(e) => handleOptionChange(index, e.target.value, option.value)}
                    placeholder="--flag"
                    className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={option.value || ''}
                    onChange={(e) => handleOptionChange(index, option.flag, e.target.value)}
                    placeholder="value (optional)"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
              
              {request.otherOptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Settings size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No additional options configured</p>
                  <p className="text-xs">Click "Add Option" to add cURL flags</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};