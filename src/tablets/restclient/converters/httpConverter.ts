import { HttpRequest, RequestConverter } from '../types';
import { resolveVariables } from '../utils/requestUtils';
import { SensitiveDataManager } from '../../../utils/sensitiveDataManager';

/**
 * Helper function to unmask sensitive data in auth parameters
 */
function unmaskAuthParams(auth: HttpRequest['auth']) {
  if (auth.type === 'none') return auth;
  
  const unmaskedParams: Record<string, string> = {};
  const sensitiveFields = ['password', 'token', 'value', 'secret'];
  
  Object.entries(auth.params).forEach(([key, value]) => {
    if (typeof value === 'string' && sensitiveFields.includes(key)) {
      unmaskedParams[key] = SensitiveDataManager.unmask(value);
    } else {
      unmaskedParams[key] = value;
    }
  });
  
  return {
    ...auth,
    params: unmaskedParams
  };
}

/**
 * Helper function to unmask sensitive data in variables
 */
function unmaskVariables(variables: HttpRequest['variables']) {
  return variables.map(variable => {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'api', 'access'];
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      variable.key.toLowerCase().includes(sensitiveKey)
    );
    
    if (isSensitive && SensitiveDataManager.isMasked(variable.value)) {
      return {
        ...variable,
        value: SensitiveDataManager.unmask(variable.value)
      };
    }
    
    return variable;
  });
}

/**
 * Converts an HTTP request to a raw HTTP request string
 */
export function requestToHttp(request: HttpRequest): string {
  // Unmask sensitive data before conversion
  const unmaskedAuth = unmaskAuthParams(request.auth);
  const unmaskedVariables = unmaskVariables(request.variables);
  
  const { method, url, headers, params, body } = request;
  
  // Build the URL with query parameters
  let fullUrl = url;
  if (params.length > 0) {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    params.filter(p => p.enabled).forEach(param => {
      urlObj.searchParams.append(
        param.key, 
        resolveVariables(param.value, unmaskedVariables)
      );
    });
    fullUrl = urlObj.toString();
  }
  
  // Resolve variables in the URL
  fullUrl = resolveVariables(fullUrl, unmaskedVariables);
  
  // Extract path and host from URL
  let path = '/';
  let host = '';
  
  try {
    const urlObj = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
    path = urlObj.pathname + urlObj.search;
    host = urlObj.host;
  } catch (e) {
    // If URL parsing fails, use the full URL as the path
    path = fullUrl;
  }
  
  // Start building the HTTP request
  let httpRequest = `${method} ${path} HTTP/1.1\r\n`;
  httpRequest += `Host: ${host}\r\n`;
  
  // Add headers
  const headersMap: Record<string, string> = {};
  
  // Add regular headers
  headers.filter(h => h.enabled).forEach(header => {
    headersMap[header.key] = resolveVariables(header.value, unmaskedVariables);
  });
  
  // Add auth headers
  if (unmaskedAuth.type === 'basic') {
    const username = resolveVariables(unmaskedAuth.params.username || '', unmaskedVariables);
    const password = resolveVariables(unmaskedAuth.params.password || '', unmaskedVariables);
    const credentials = btoa(`${username}:${password}`);
    headersMap['Authorization'] = `Basic ${credentials}`;
  } else if (unmaskedAuth.type === 'bearer') {
    const token = resolveVariables(unmaskedAuth.params.token || '', unmaskedVariables);
    headersMap['Authorization'] = `Bearer ${token}`;
  } else if (unmaskedAuth.type === 'apikey' && unmaskedAuth.params.addTo === 'header') {
    const key = unmaskedAuth.params.key || '';
    const value = resolveVariables(unmaskedAuth.params.value || '', unmaskedVariables);
    headersMap[key] = value;
  }
  
  // Add headers to request
  Object.entries(headersMap).forEach(([key, value]) => {
    httpRequest += `${key}: ${value}\r\n`;
  });
  
  // Add body
  let bodyContent = '';
  
  if (body.type === 'raw' && body.content) {
    bodyContent = resolveVariables(body.content, unmaskedVariables);
    
    // Add content type header if not already present
    if (!headersMap['Content-Type'] && body.format) {
      let contentType = 'text/plain';
      switch (body.format) {
        case 'json':
          contentType = 'application/json';
          break;
        case 'xml':
          contentType = 'application/xml';
          break;
        case 'html':
          contentType = 'text/html';
          break;
        case 'javascript':
          contentType = 'application/javascript';
          break;
      }
      
      httpRequest += `Content-Type: ${contentType}\r\n`;
    }
  } else if (body.type === 'form-data') {
    const boundary = `----WebKitFormBoundary${Math.random().toString(16).substring(2)}`;
    httpRequest += `Content-Type: multipart/form-data; boundary=${boundary}\r\n`;
    
    bodyContent = '';
    body.params.filter(p => p.enabled).forEach(param => {
      const resolvedValue = resolveVariables(param.value, unmaskedVariables);
      bodyContent += `--${boundary}\r\n`;
      bodyContent += `Content-Disposition: form-data; name="${param.key}"\r\n\r\n`;
      bodyContent += `${resolvedValue}\r\n`;
    });
    
    bodyContent += `--${boundary}--\r\n`;
  } else if (body.type === 'x-www-form-urlencoded') {
    httpRequest += 'Content-Type: application/x-www-form-urlencoded\r\n';
    
    const params = body.params.filter(p => p.enabled).map(param => {
      const resolvedValue = resolveVariables(param.value, unmaskedVariables);
      return `${encodeURIComponent(param.key)}=${encodeURIComponent(resolvedValue)}`;
    });
    
    bodyContent = params.join('&');
  }
  
  // Add content length if there's a body
  if (bodyContent) {
    httpRequest += `Content-Length: ${new Blob([bodyContent]).size}\r\n`;
  }
  
  // End headers
  httpRequest += '\r\n';
  
  // Add body
  if (bodyContent) {
    httpRequest += bodyContent;
  }
  
  return httpRequest;
}

/**
 * Parses a raw HTTP request string into an HttpRequest object
 */
export function parseHttp(httpRequest: string): HttpRequest | null {
  try {
    // Basic structure for the request
    const request: HttpRequest = {
      method: 'GET',
      url: '',
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
      variables: []
    };
    
    // Split the request into lines
    const lines = httpRequest.split(/\r?\n/);
    
    // Parse the request line
    const requestLine = lines[0];
    const requestLineParts = requestLine.split(' ');
    
    if (requestLineParts.length >= 2) {
      request.method = requestLineParts[0] as any;
      
      // Extract path
      const path = requestLineParts[1];
      
      // Find the host header
      const hostHeader = lines.find(line => 
        line.toLowerCase().startsWith('host:')
      );
      
      let host = '';
      if (hostHeader) {
        host = hostHeader.substring(5).trim();
      }
      
      // Construct the full URL
      if (host) {
        const protocol = path.startsWith('https') ? 'https' : 'http';
        request.url = `${protocol}://${host}${path}`;
      } else {
        request.url = path;
      }
      
      // Parse query parameters
      const urlObj = new URL(request.url.startsWith('http') ? request.url : `http://${request.url}`);
      urlObj.searchParams.forEach((value, key) => {
        request.params.push({
          key,
          value,
          enabled: true
        });
      });
      
      // Remove query string from URL
      request.url = request.url.split('?')[0];
    }
    
    // Find the empty line that separates headers from body
    const emptyLineIndex = lines.findIndex(line => line.trim() === '');
    
    // Parse headers
    for (let i = 1; i < (emptyLineIndex !== -1 ? emptyLineIndex : lines.length); i++) {
      const line = lines[i];
      const colonIndex = line.indexOf(':');
      
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        // Check for special headers
        if (key.toLowerCase() === 'authorization') {
          if (value.startsWith('Basic ')) {
            const credentials = atob(value.substring(6));
            const [username, password] = credentials.split(':');
            request.auth = {
              type: 'basic',
              params: { username, password }
            };
          } else if (value.startsWith('Bearer ')) {
            request.auth = {
              type: 'bearer',
              params: { token: value.substring(7) }
            };
          } else {
            request.headers.push({ key, value, enabled: true });
          }
        } else if (key.toLowerCase() === 'content-type') {
          request.headers.push({ key, value, enabled: true });
          
          // Set body type based on content type
          if (value.includes('application/json')) {
            request.body.type = 'raw';
            request.body.format = 'json';
          } else if (value.includes('application/xml') || value.includes('text/xml')) {
            request.body.type = 'raw';
            request.body.format = 'xml';
          } else if (value.includes('text/html')) {
            request.body.type = 'raw';
            request.body.format = 'html';
          } else if (value.includes('application/javascript')) {
            request.body.type = 'raw';
            request.body.format = 'javascript';
          } else if (value.includes('application/x-www-form-urlencoded')) {
            request.body.type = 'x-www-form-urlencoded';
          } else if (value.includes('multipart/form-data')) {
            request.body.type = 'form-data';
          }
        } else {
          request.headers.push({ key, value, enabled: true });
        }
      }
    }
    
    // Parse body
    if (emptyLineIndex !== -1 && emptyLineIndex < lines.length - 1) {
      const bodyLines = lines.slice(emptyLineIndex + 1);
      const bodyContent = bodyLines.join('\n');
      
      if (bodyContent.trim()) {
        if (request.body.type === 'none') {
          request.body.type = 'raw';
        }
        
        if (request.body.type === 'raw') {
          request.body.content = bodyContent;
        } else if (request.body.type === 'x-www-form-urlencoded') {
          // Parse form-urlencoded body
          const params = bodyContent.split('&');
          request.body.params = params.map(param => {
            const [key, value] = param.split('=');
            return {
              key: decodeURIComponent(key),
              value: decodeURIComponent(value || ''),
              enabled: true
            };
          });
        }
        // Parsing multipart/form-data is complex and not implemented here
      }
    }
    
    return request;
  } catch (error) {
    console.error('Error parsing HTTP request:', error);
    return null;
  }
}

export const httpConverter: RequestConverter = {
  id: 'http',
  name: 'HTTP',
  convert: requestToHttp,
  parse: parseHttp
};