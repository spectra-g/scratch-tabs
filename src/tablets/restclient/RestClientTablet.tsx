import { useState, useEffect } from 'react';
import { Tablet, TabletState } from '../types';
import { Network } from 'lucide-react';
import { RequestBuilder } from './components/RequestBuilder';
import { RequestConverter } from './components/RequestConverter';
import { ResponseViewer } from './components/ResponseViewer';
import { ResponseHistory } from './components/ResponseHistory';
import { RequestHistoryViewer } from './components/RequestHistoryViewer'; 
import {
  HttpRequest,
  RestClientState,
  ResponseHistoryItem,
  HttpRequestHistoryItem,
  ExplanationLevel
} from './types';
import { executeRequest } from './utils/requestUtils';
import { SensitiveDataManager } from '../../utils/sensitiveDataManager';

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
            { key: 'token', value: SensitiveDataManager.mask('your-token-here'), enabled: true },
            { key: 'user', value: 'testuser', enabled: true },
            { key: 'password', value: SensitiveDataManager.mask('password123'), enabled: true }
          ]
        },
        response: null,
        responseHistory: [],
        requestHistory: [], 
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
        // Ensure new fields have default values if loading old state
        if (!parsed.data.requestHistory) {
          parsed.data.requestHistory = [];
        }

        // Migrate sensitive data in authentication parameters
        if (parsed.data.request?.auth?.params) {
          const authParams = parsed.data.request.auth.params;
          const sensitiveAuthFields = ['password', 'token', 'value', 'secret'];
          for (const field of sensitiveAuthFields) {
            if (authParams[field]) {
              authParams[field] = SensitiveDataManager.migrateField(authParams[field]);
            }
          }
        }

        // Migrate sensitive data in variables
        if (parsed.data.request?.variables && Array.isArray(parsed.data.request.variables)) {
          parsed.data.request.variables = parsed.data.request.variables.map((variable: any) => {
            // Only mask values for keys that are likely sensitive
            const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'api', 'access'];
            const shouldMask = sensitiveKeys.some(sensitiveKey => 
              variable.key.toLowerCase().includes(sensitiveKey)
            );
            
            if (shouldMask && typeof variable.value === 'string') {
              return {
                ...variable,
                value: SensitiveDataManager.migrateField(variable.value)
              };
            }
            return variable;
          });
        }

        // Migrate sensitive data in request history
        if (parsed.data.requestHistory && Array.isArray(parsed.data.requestHistory)) {
          parsed.data.requestHistory = parsed.data.requestHistory.map((historyItem: HttpRequestHistoryItem) => {
            if (historyItem.request) {
              // Migrate auth params
              if (historyItem.request.auth?.params) {
                const authParams = historyItem.request.auth.params;
                const sensitiveAuthFields = ['password', 'token', 'value', 'secret'];
                for (const field of sensitiveAuthFields) {
                  if (authParams[field]) {
                    authParams[field] = SensitiveDataManager.migrateField(authParams[field]);
                  }
                }
              }

                             // Migrate variables
               if (historyItem.request.variables && Array.isArray(historyItem.request.variables)) {
                 historyItem.request.variables = historyItem.request.variables.map((variable: any) => {
                   const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'api', 'access'];
                   const shouldMask = sensitiveKeys.some(sensitiveKey => 
                     variable.key.toLowerCase().includes(sensitiveKey)
                   );
                   
                   if (shouldMask && typeof variable.value === 'string') {
                     return {
                       ...variable,
                       value: SensitiveDataManager.migrateField(variable.value)
                     };
                   }
                   return variable;
                 });
               }
            }
            return historyItem;
          });
        }

        return parsed;
      }
    } catch (e) {
      console.error('Failed to deserialize REST client state:', e);
    }
    return this.createInitialState();
  },

  render(state: RestClientTabletState, onChange) {
    const { data } = state;
    const currentRequestHistory = data.requestHistory || []; // This line is key!

    const [showResponseHistory, setShowResponseHistory] = useState(false);
    const [showRequestHistory, setShowRequestHistory] = useState(false); 

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

      // Create a deep copy of the request and unmask sensitive data for execution
      const requestForExecution: HttpRequest = JSON.parse(JSON.stringify(data.request));
      
      // Unmask auth parameters
      if (requestForExecution.auth?.params) {
        const authParams = requestForExecution.auth.params;
        const sensitiveAuthFields = ['password', 'token', 'value', 'secret'];
        for (const field of sensitiveAuthFields) {
          if (authParams[field]) {
            authParams[field] = SensitiveDataManager.unmask(authParams[field]);
          }
        }
      }

      // Unmask variable values
      if (requestForExecution.variables && Array.isArray(requestForExecution.variables)) {
        requestForExecution.variables = requestForExecution.variables.map(variable => ({
          ...variable,
          value: SensitiveDataManager.unmask(variable.value)
        }));
      }

      const requestHistoryItem: HttpRequestHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        request: JSON.parse(JSON.stringify(data.request)), // Store the masked version in history
        isPinned: false,
      };

      try {
        const response = await executeRequest(requestForExecution);

        // Create a response history item
        const responseHistoryItem: ResponseHistoryItem = {
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

        updateState({
          response,
          isExecuting: false,
          responseHistory: [responseHistoryItem, ...data.responseHistory],
          requestHistory: [requestHistoryItem, ...currentRequestHistory] 
        });
      } catch (error) {
        console.error('Request execution error:', error);
        updateState({
          isExecuting: false,
          error: error instanceof Error ? error.message : 'Failed to execute request',
          // Still save request to history even if it fails
          requestHistory: [requestHistoryItem, ...currentRequestHistory]
        });
      }
    };

    // --- Response History Handlers ---
    const handlePinResponseHistoryItem = (id: string, isPinned: boolean) => {
      const updatedHistory = data.responseHistory.map(item =>
        item.id === id ? { ...item, isPinned } : item
      );
      updateState({ responseHistory: updatedHistory });
    };

    const handleDeleteResponseHistoryItem = (id: string) => {
      const updatedHistory = data.responseHistory.filter(item => item.id !== id);
      updateState({ responseHistory: updatedHistory });
    };

    const handleRestoreResponseHistoryItem = (historyItem: ResponseHistoryItem) => {
      updateState({ response: historyItem.response });
      setShowResponseHistory(false);
    };

    // --- Request History Handlers ---
    const handlePinRequestHistoryItem = (id: string, isPinned: boolean) => {
      const updatedHistory = currentRequestHistory.map(item =>
        item.id === id ? { ...item, isPinned } : item
      );
      updateState({ requestHistory: updatedHistory });
    };

    const handleDeleteRequestHistoryItem = (id: string) => {
      const updatedHistory = currentRequestHistory.filter(item => item.id !== id);
      updateState({ requestHistory: updatedHistory });
    };

    const handleRestoreRequestHistoryItem = (historyItem: HttpRequestHistoryItem) => {
      // Restore the request details to the main request object
      updateRequest(JSON.parse(JSON.stringify(historyItem.request)));
      setShowRequestHistory(false);
    };


    const handleSetExplanationLevel = (level: ExplanationLevel) => {
      updateState({ explanationLevel: level });
    };

    const handleSetConversionFormat = (format: string) => {
      updateState({ conversionFormat: format });
    };

    useEffect(() => {
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;

      const filteredResponseHistory = data.responseHistory.filter(item =>
        item.isPinned || (now - item.timestamp) < ONE_HOUR
      );
      const filteredRequestHistory = currentRequestHistory.filter(item =>
        item.isPinned || (now - item.timestamp) < ONE_HOUR
      );

      if (filteredResponseHistory.length !== data.responseHistory.length ||
          filteredRequestHistory.length !== currentRequestHistory.length) {
        updateState({
            responseHistory: filteredResponseHistory,
            requestHistory: filteredRequestHistory
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.responseHistory, currentRequestHistory]); 

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
              explanationLevel={data.explanationLevel}
              onExplanationLevelChange={handleSetExplanationLevel}
            />
          </div>

          {/* Right Panel - Conversion, Response */}
          <div className="w-full md:w-1/2 flex flex-col overflow-hidden">
            {/* Conversion Panel / Request History */}
            <div className="flex-none p-4 border-b border-gray-700/50">
              {showRequestHistory ? (
                <RequestHistoryViewer
                  history={currentRequestHistory}
                  onPinItem={handlePinRequestHistoryItem}
                  onDeleteItem={handleDeleteRequestHistoryItem}
                  onRestoreItem={handleRestoreRequestHistoryItem}
                  onClose={() => setShowRequestHistory(false)}
                />
              ) : (
                <RequestConverter
                  request={data.request}
                  format={data.conversionFormat}
                  onFormatChange={handleSetConversionFormat}
                  onUpdateRequest={updateRequest}
                  onShowRequestHistory={() => setShowRequestHistory(true)}
                  requestHistoryCount={currentRequestHistory.length}
                />
              )}
            </div>

            {/* Response Panel / Response History */}
            <div className="flex-1 overflow-hidden">
              {showResponseHistory ? (
                <ResponseHistory
                  history={data.responseHistory}
                  onPinItem={handlePinResponseHistoryItem}
                  onDeleteItem={handleDeleteResponseHistoryItem}
                  onRestoreItem={handleRestoreResponseHistoryItem}
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