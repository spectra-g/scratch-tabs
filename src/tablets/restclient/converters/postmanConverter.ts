import { HttpRequest, RequestConverter } from '../types';
import { resolveVariables } from '../utils/requestUtils';

/**
 * Converts an HTTP request to a Postman Collection format
 */
export function requestToPostman(request: HttpRequest): string {
  const { method, url, headers, auth, params, body, variables } = request;
  
  // Build the URL with query parameters
  let fullUrl = url;
  const urlParams: any[] = [];
  
  if (params.length > 0) {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    
    // Clear existing params from the URL
    urlObj.search = '';
    fullUrl = urlObj.toString();
    
    // Add params to the array
    params.filter(p => p.enabled).forEach(param => {
      urlParams.push({
        key: param.key,
        value: resolveVariables(param.value, variables),
        disabled: false
      });
    });
  }
  
  // Build headers array
  const headersArray: any[] = [];
  
  headers.filter(h => h.enabled).forEach(header => {
    headersArray.push({
      key: header.key,
      value: resolveVariables(header.value, variables),
      disabled: false
    });
  });
  
  // Add auth headers if needed
  if (auth.type === 'basic') {
    // Postman handles Basic Auth separately, not as headers
  } else if (auth.type === 'bearer') {
    const token = resolveVariables(auth.params.token || '', variables);
    headersArray.push({
      key: 'Authorization',
      value: `Bearer ${token}`,
      disabled: false
    });
  } else if (auth.type === 'apikey' && auth.params.addTo === 'header') {
    const key = auth.params.key || '';
    const value = resolveVariables(auth.params.value || '', variables);
    headersArray.push({
      key,
      value,
      disabled: false
    });
  }
  
  // Build the request object
  const postmanRequest: any = {
    name: `${method} ${url}`,
    request: {
      method,
      header: headersArray,
      url: {
        raw: fullUrl,
        protocol: fullUrl.startsWith('https') ? 'https' : 'http',
        host: [],
        path: [],
        query: urlParams
      }
    }
  };
  
  // Parse the URL
  try {
    const urlObj = new URL(fullUrl.startsWith('http') ? fullUrl : `http://${fullUrl}`);
    postmanRequest.request.url.host = urlObj.hostname.split('.');
    postmanRequest.request.url.path = urlObj.pathname.split('/').filter(p => p);
    
    if (urlObj.port) {
      postmanRequest.request.url.port = urlObj.port;
    }
  } catch (e) {
    // If URL parsing fails, use the full URL as is
  }
  
  // Add authentication
  if (auth.type === 'basic') {
    const username = resolveVariables(auth.params.username || '', variables);
    const password = resolveVariables(auth.params.password || '', variables);
    
    postmanRequest.request.auth = {
      type: 'basic',
      basic: [
        { key: 'username', value: username },
        { key: 'password', value: password }
      ]
    };
  } else if (auth.type === 'bearer') {
    const token = resolveVariables(auth.params.token || '', variables);
    
    postmanRequest.request.auth = {
      type: 'bearer',
      bearer: [
        { key: 'token', value: token }
      ]
    };
  } else if (auth.type === 'apikey') {
    const key = auth.params.key || '';
    const value = resolveVariables(auth.params.value || '', variables);
    const addTo = auth.params.addTo || 'header';
    
    postmanRequest.request.auth = {
      type: 'apikey',
      apikey: [
        { key: 'key', value: key },
        { key: 'value', value },
        { key: 'in', value: addTo === 'header' ? 'header' : 'query' }
      ]
    };
  }
  
  // Add body
  if (body.type !== 'none') {
    postmanRequest.request.body = {
      mode: body.type === 'raw' ? 'raw' : 
            body.type === 'form-data' ? 'formdata' : 
            body.type === 'x-www-form-urlencoded' ? 'urlencoded' : 
            'raw'
    };
    
    if (body.type === 'raw') {
      postmanRequest.request.body.raw = resolveVariables(body.content, variables);
      
      if (body.format) {
        let language = 'text';
        switch (body.format) {
          case 'json':
            language = 'json';
            break;
          case 'xml':
            language = 'xml';
            break;
          case 'html':
            language = 'html';
            break;
          case 'javascript':
            language = 'javascript';
            break;
        }
        
        postmanRequest.request.body.options = {
          raw: {
            language
          }
        };
      }
    } else if (body.type === 'form-data') {
      postmanRequest.request.body.formdata = body.params
        .filter(p => p.enabled)
        .map(param => ({
          key: param.key,
          value: resolveVariables(param.value, variables),
          type: 'text',
          disabled: false
        }));
    } else if (body.type === 'x-www-form-urlencoded') {
      postmanRequest.request.body.urlencoded = body.params
        .filter(p => p.enabled)
        .map(param => ({
          key: param.key,
          value: resolveVariables(param.value, variables),
          disabled: false
        }));
    }
  }
  
  // Create a collection object
  const collection = {
    info: {
      name: 'Exported Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [postmanRequest]
  };
  
  return JSON.stringify(collection, null, 2);
}

export const postmanConverter: RequestConverter = {
  id: 'postman',
  name: 'Postman Collection',
  convert: requestToPostman
};