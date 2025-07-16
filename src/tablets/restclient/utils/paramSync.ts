import { HttpRequest, KeyValuePair } from "../types";
import { parseUrl } from "./requestUtils";

export type SyncSource = 'url' | 'params' | 'external';

export interface SyncResult {
  url: string;
  params: KeyValuePair[];
}

/**
 * Central parameter synchronization manager
 * Ensures URL and params array stay in sync regardless of which one changes
 */
export class ParameterSyncManager {
  
  /**
   * Sync parameters when URL changes (user types in URL bar or curl update)
   */
  static syncFromUrl(newUrl: string, currentParams: KeyValuePair[]): SyncResult {
    try {
      const { baseUrl, params: parsedParams } = parseUrl(newUrl);
      
      // Create a map of existing params for lookup
      const existingParamsMap = new Map(currentParams.map(p => [p.key, p]));
      
      // Build new params list
      const newParams: KeyValuePair[] = [];
      
      // Add parsed params from URL (enabled)
      parsedParams.forEach(parsedParam => {
        newParams.push({
          ...parsedParam,
          enabled: true
        });
      });
      
      // Add existing params that weren't in the URL (disabled)
      currentParams.forEach(existingParam => {
        if (!parsedParams.some(p => p.key === existingParam.key)) {
          newParams.push({
            ...existingParam,
            enabled: false
          });
        }
      });
      
      return {
        url: newUrl, // Return the original full URL that user typed
        params: newParams
      };
    } catch (error) {
      // If parsing fails, disable all params and keep URL as-is
      return {
        url: newUrl,
        params: currentParams.map(p => ({ ...p, enabled: false }))
      };
    }
  }
  
  /**
   * Sync URL when parameters change (user edits in params tab)
   */
  static syncFromParams(newParams: KeyValuePair[], currentUrl: string): SyncResult {
    // Extract base URL without query parameters
    const baseUrl = currentUrl.split('?')[0];
    
    // Build new URL from enabled parameters
    const enabledParams = newParams.filter(p => p.enabled);
    const newUrl = enabledParams.length > 0
      ? `${baseUrl}?${enabledParams.map(p => `${p.key}=${p.value}`).join('&')}`
      : baseUrl;
    
    return {
      url: newUrl,
      params: newParams
    };
  }
  
  /**
   * Handle external updates (like curl parsing) that may change both URL and params
   */
  static syncFromExternal(
    parsedRequest: Partial<HttpRequest>,
    currentRequest: HttpRequest
  ): Partial<HttpRequest> {
    // If both URL and params are provided, URL takes precedence
    if (parsedRequest.url) {
      const syncResult = this.syncFromUrl(parsedRequest.url, currentRequest.params);
      
      return {
        ...parsedRequest,
        url: syncResult.url,
        params: syncResult.params
      };
    }
    
    // If only params are provided, sync URL
    if (parsedRequest.params) {
      const syncResult = this.syncFromParams(parsedRequest.params, currentRequest.url);
      
      return {
        ...parsedRequest,
        url: syncResult.url,
        params: syncResult.params
      };
    }
    
    // No URL or params changes, return as-is
    return parsedRequest;
  }
}