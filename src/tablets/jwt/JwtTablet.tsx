import React, { useState } from 'react';
import { Tablet, TabletState } from '../types';
import { Key } from 'lucide-react';
import { JwtDecoder } from './components/JwtDecoder';
import { JwtEditor } from './components/JwtEditor';
import { JwtVerifier } from './components/JwtVerifier';
import { JwtKeyManager } from './components/JwtKeyManager';
import { Tabs } from './components/ui/Tabs';
import { JwtHistory } from './components/JwtHistory';
import { JwtState, JwtHistoryItem, StoredKey } from './types';

interface JwtTabletState extends TabletState {
  type: 'jwt';
  data: JwtState;
}

export const JwtTablet: Tablet = {
  id: 'jwt',
  label: 'JWT Tool',
  keywords: ['jwt', 'token', 'json web token', 'decode', 'verify', 'sign'],

  createInitialState(): JwtTabletState {
    return {
      type: 'jwt',
      data: {
        token: '',
        header: {},
        payload: {},
        signature: '',
        isValid: null,
        error: null,
        activeTab: 'decode',
        history: [],
        storedKeys: [],
        verificationKey: '',
        verificationKeyType: 'text',
        signingKey: '',
        signingKeyType: 'text',
        signingAlgorithm: 'HS256'
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'jwt' && parsed.data) {
        // Ensure all required properties exist
        return {
          ...parsed,
          data: {
            token: parsed.data.token || '',
            header: parsed.data.header || {},
            payload: parsed.data.payload || {},
            signature: parsed.data.signature || '',
            isValid: parsed.data.isValid || null,
            error: parsed.data.error || null,
            activeTab: parsed.data.activeTab || 'decode',
            history: Array.isArray(parsed.data.history) ? parsed.data.history : [],
            storedKeys: Array.isArray(parsed.data.storedKeys) ? parsed.data.storedKeys : [],
            verificationKey: parsed.data.verificationKey || '',
            verificationKeyType: parsed.data.verificationKeyType || 'text',
            signingKey: parsed.data.signingKey || '',
            signingKeyType: parsed.data.signingKeyType || 'text',
            signingAlgorithm: parsed.data.signingAlgorithm || 'HS256'
          }
        };
      }
    } catch (e) {
      console.error("Failed to deserialize JWT state:", e);
    }
    return this.createInitialState();
  },

  render(state: JwtTabletState, onChange) {
    const { data } = state;
    
    const updateState = (newData: Partial<JwtState>) => {
      onChange({
        ...state,
        data: {
          ...data,
          ...newData
        }
      });
    };
    
    const handleTabChange = (tab: string) => {
      updateState({ activeTab: tab });
    };
    
    const addToHistory = (item: JwtHistoryItem) => {
      // Check if token already exists in history
      const exists = data.history.some(historyItem => historyItem.token === item.token);
      if (exists) return;
      
      // Add to history, limit to 20 items
      const newHistory = [item, ...data.history].slice(0, 20);
      updateState({ history: newHistory });
    };
    
    const clearHistory = () => {
      updateState({ history: [] });
    };
    
    const loadFromHistory = (item: JwtHistoryItem) => {
      updateState({
        token: item.token,
        header: item.header,
        payload: item.payload,
        signature: item.signature
      });
    };
    
    const addStoredKey = (key: StoredKey) => {
      // Check if key with same name already exists
      const exists = data.storedKeys.some(k => k.name === key.name);
      if (exists) {
        // Update existing key
        const newKeys = data.storedKeys.map(k => 
          k.name === key.name ? key : k
        );
        updateState({ storedKeys: newKeys });
      } else {
        // Add new key
        updateState({ storedKeys: [...data.storedKeys, key] });
      }
    };
    
    const removeStoredKey = (name: string) => {
      const newKeys = data.storedKeys.filter(k => k.name !== name);
      updateState({ storedKeys: newKeys });
    };
    
    const clearStoredKeys = () => {
      updateState({ storedKeys: [] });
    };
    
    const useStoredKey = (key: StoredKey, purpose: 'verification' | 'signing') => {
      if (purpose === 'verification') {
        updateState({
          verificationKey: key.value,
          verificationKeyType: key.type
        });
      } else {
        updateState({
          signingKey: key.value,
          signingKeyType: key.type,
          signingAlgorithm: key.algorithm || data.signingAlgorithm
        });
      }
    };
    
    return (
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex-none p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <Key className="text-gray-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-100">JWT Tool</h2>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex-none border-b border-gray-700/50">
          <Tabs
            tabs={[
              { id: 'decode', label: 'Decode' },
              { id: 'verify', label: 'Verify' },
              { id: 'edit', label: 'Edit & Sign' },
              { id: 'keys', label: 'Key Manager' },
              { id: 'history', label: 'History' }
            ]}
            activeTab={data.activeTab}
            onTabChange={handleTabChange}
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {data.activeTab === 'decode' && (
            <JwtDecoder
              token={data.token}
              header={data.header}
              payload={data.payload}
              signature={data.signature}
              error={data.error}
              onTokenChange={(token, header, payload, signature, error) => {
                updateState({ token, header, payload, signature, error });
                if (token && !error) {
                  addToHistory({
                    token,
                    header,
                    payload,
                    signature,
                    timestamp: Date.now()
                  });
                }
              }}
            />
          )}
          
          {data.activeTab === 'verify' && (
            <JwtVerifier
              token={data.token}
              header={data.header}
              verificationKey={data.verificationKey}
              verificationKeyType={data.verificationKeyType}
              isValid={data.isValid}
              onVerificationKeyChange={(key, type) => {
                updateState({ verificationKey: key, verificationKeyType: type });
              }}
              onVerificationResult={(isValid) => {
                updateState({ isValid });
              }}
              storedKeys={data.storedKeys}
              onUseStoredKey={(key) => useStoredKey(key, 'verification')}
            />
          )}
          
          {data.activeTab === 'edit' && (
            <JwtEditor
              header={data.header}
              payload={data.payload}
              signingKey={data.signingKey}
              signingKeyType={data.signingKeyType}
              signingAlgorithm={data.signingAlgorithm}
              onHeaderChange={(header) => {
                updateState({ header });
              }}
              onPayloadChange={(payload) => {
                updateState({ payload });
              }}
              onSigningKeyChange={(key, type) => {
                updateState({ signingKey: key, signingKeyType: type });
              }}
              onSigningAlgorithmChange={(algorithm) => {
                updateState({ signingAlgorithm: algorithm });
              }}
              onTokenGenerated={(token, header, payload, signature) => {
                updateState({ token, header, payload, signature });
                addToHistory({
                  token,
                  header,
                  payload,
                  signature,
                  timestamp: Date.now()
                });
              }}
              storedKeys={data.storedKeys}
              onUseStoredKey={(key) => useStoredKey(key, 'signing')}
            />
          )}
          
          {data.activeTab === 'keys' && (
            <JwtKeyManager
              storedKeys={data.storedKeys}
              onAddKey={addStoredKey}
              onRemoveKey={removeStoredKey}
              onClearKeys={clearStoredKeys}
            />
          )}
          
          {data.activeTab === 'history' && (
            <JwtHistory
              history={data.history}
              onClearHistory={clearHistory}
              onLoadItem={loadFromHistory}
            />
          )}
        </div>
      </div>
    );
  }
};