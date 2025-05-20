import React, { useState, useEffect } from 'react';
import { Tablet, TabletState } from '../types';
import { Network } from 'lucide-react';
import { RequestBuilder } from './components/RequestBuilder';
import { RequestConverter } from './components/RequestConverter';
import { RequestExplainer } from './components/RequestExplainer';
import { ResponseViewer } from './components/ResponseViewer';
import { ResponseHistory } from './components/ResponseHistory';
import { 
  HttpRequest, 
  HttpResponse, 
  RestClientState, 
  ResponseHistoryItem,
  ExplanationLevel
} from './types';
import { executeRequest } from './utils/requestUtils';

interface RestClientTabletState extends TabletState {
  type: 'restclient';
  data: RestClientState;
}

export const RestClientTablet: Tablet = {
  id: 'restclient',
  label: 'REST Client',
  keywords: ['api', 'http', 'rest', 'client', 'curl', 'request', 'postman'],

  createInitialState(): RestClientTabletState {
    return {
      type: 'restclient',
      data: {
        request: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          headers: [],
          auth: {
            type: 'none',
            params: {}
          },
          params: [],
          body: {
            type: 'none',
            content: '',
            params: []
          },
          variables: [
            { key: 'host', value: 'jsonplaceholder.typicode.com', enabled: true },
            { key: 'token', value: 'your-token-here', enabled: true },
            { key: 'user', value: 'testuser', enabled: true },
            { key: 'password', value: 'password123', enabled: true }
          ]
        },
        response: null,
        responseHistory: [],
        conversionFormat: 'curl',
        explanationLevel: 'medium',
        isExecuting: false,
        error: null
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'restclient' && parsed.data) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to deserialize REST client state:', e);
    }
    return this.createInitialState();
  },

  render(state: RestClientTabletState, onChange) {
    const { data } = state;
    const [showResponseHistory, setShowResponseHistory] = useState(false);

    const updateRequest = (request: Partial<HttpRequest>) => {
      onChange({
        ...state,
        data: {
          ...data,
          request: {
            ...data.request,
            ...request
          }
        }
      });
    };

    const updateState = (newData: Partial<RestClientState>) => {
      onChange({
        ...state,
        data: {
          ...data,
          ...newData
        }
      });
    };

    const handleExecuteRequest = async () => {
      updateState({ isExecuting: true, error: null });
      
      try {
        const response = await executeRequest(data.request);
        
        // Create a history item
        const historyItem: ResponseHistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          method: data.request.method,
          url: data.request.url,
          status: response.status,
          statusText: response.statusText,
          duration: response.timing.total,
          isPinned: false,
          response
        };
        
        // Update state with response and add to history
        updateState({ 
          response, 
          isExecuting: false,
          responseHistory: [historyItem, ...data.responseHistory]
        });
      } catch (error) {
        console.error('Request execution error:', error);
        updateState({ 
          isExecuting: false, 
          error: error instanceof Error ? error.message : 'Failed to execute request'
        });
      }
    };

    const handlePinHistoryItem = (id: string, isPinned: boolean) => {
      const updatedHistory = data.responseHistory.map(item => 
        item.id === id ? { ...item, isPinned } : item
      );
      
      updateState({ responseHistory: updatedHistory });
    };

    const handleDeleteHistoryItem = (id: string) => {
      const updatedHistory = data.responseHistory.filter(item => item.id !== id);
      updateState({ responseHistory: updatedHistory });
    };

    const handleRestoreHistoryItem = (historyItem: ResponseHistoryItem) => {
      updateState({ response: historyItem.response });
      setShowResponseHistory(false);
    };

    const handleSetExplanationLevel = (level: ExplanationLevel) => {
      updateState({ explanationLevel: level });
    };

    const handleSetConversionFormat = (format: string) => {
      updateState({ conversionFormat: format });
    };

    // Clean up expired history items (non-pinned items older than 1 hour)
    useEffect(() => {
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;
      
      const filteredHistory = data.responseHistory.filter(item => 
        item.isPinned || (now - item.timestamp) < ONE_HOUR
      );
      
      if (filteredHistory.length !== data.responseHistory.length) {
        updateState({ responseHistory: filteredHistory });
      }
    }, [data.responseHistory]);

    return (
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <Network className="text-gray-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-100">REST Client</h2>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel - Request Builder */}
          <div className="w-full md:w-1/2 flex flex-col overflow-hidden border-r border-gray-700/50">
            <RequestBuilder 
              request={data.request}
              onUpdateRequest={updateRequest}
              onExecute={handleExecuteRequest}
              isExecuting={data.isExecuting}
            />
          </div>
          
          {/* Right Panel - Conversion, Explanation, Response */}
          <div className="w-full md:w-1/2 flex flex-col overflow-hidden">
            {/* Conversion Panel */}
            <div className="flex-none p-4 border-b border-gray-700/50">
              <RequestConverter 
                request={data.request}
                format={data.conversionFormat}
                onFormatChange={handleSetConversionFormat}
                onUpdateRequest={updateRequest}
              />
            </div>
            
            {/* Explanation Panel */}
            <div className="flex-none p-4 border-b border-gray-700/50">
              <RequestExplainer 
                request={data.request}
                level={data.explanationLevel}
                onLevelChange={handleSetExplanationLevel}
              />
            </div>
            
            {/* Response Panel / History */}
            <div className="flex-1 overflow-hidden">
              {showResponseHistory ? (
                <ResponseHistory 
                  history={data.responseHistory}
                  onPinItem={handlePinHistoryItem}
                  onDeleteItem={handleDeleteHistoryItem}
                  onRestoreItem={handleRestoreHistoryItem}
                  onClose={() => setShowResponseHistory(false)}
                />
              ) : (
                <ResponseViewer 
                  response={data.response}
                  error={data.error}
                  isLoading={data.isExecuting}
                  onShowHistory={() => setShowResponseHistory(true)}
                  historyCount={data.responseHistory.length}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
};