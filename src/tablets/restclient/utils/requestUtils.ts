import {
  HttpRequest,
  HttpResponse,
  KeyValuePair,
  HttpResponseTiming,
} from "../types";

/**
 * Resolves variables in a string using the {{variable}} syntax
 */
export function resolveVariables(
  text: string,
  variables: KeyValuePair[],
): string {
  if (!text) return text;

  let result = text;
  const enabledVariables = variables.filter((v) => v.enabled);

  enabledVariables.forEach((variable) => {
    const regex = new RegExp(`{{${variable.key}}}`, "g");
    result = result.replace(regex, variable.value);
  });

  return result;
}

/**
 * Builds a URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  params: KeyValuePair[],
  variables: KeyValuePair[],
): string {
  const url = resolveVariables(baseUrl, variables);
  const enabledParams = params.filter((p) => p.enabled);

  if (enabledParams.length === 0) {
    return url;
  }

  const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);

  enabledParams.forEach((param) => {
    const resolvedValue = resolveVariables(param.value, variables);
    urlObj.searchParams.append(param.key, resolvedValue);
  });

  return urlObj.toString();
}

/**
 * Builds headers object from key-value pairs
 */
export function buildHeaders(
  headers: KeyValuePair[],
  auth: HttpRequest["auth"],
  variables: KeyValuePair[],
): Record<string, string> {
  const result: Record<string, string> = {};

  // Add regular headers
  headers
    .filter((h) => h.enabled)
    .forEach((header) => {
      result[header.key] = resolveVariables(header.value, variables);
    });

  // Add auth headers
  if (auth.type === "basic") {
    const username = resolveVariables(auth.params.username || "", variables);
    const password = resolveVariables(auth.params.password || "", variables);
    const credentials = btoa(`${username}:${password}`);
    result["Authorization"] = `Basic ${credentials}`;
  } else if (auth.type === "bearer") {
    const token = resolveVariables(auth.params.token || "", variables);
    result["Authorization"] = `Bearer ${token}`;
  } else if (auth.type === "apikey") {
    const key = auth.params.key || "";
    const value = resolveVariables(auth.params.value || "", variables);

    if (auth.params.addTo === "header") {
      result[key] = value;
    }
    // Query params for API key are handled in buildUrl
  }

  return result;
}

/**
 * Builds request body based on body type
 */
export function buildBody(
  body: HttpRequest["body"],
  variables: KeyValuePair[],
): string | FormData | URLSearchParams | null {
  if (body.type === "none") {
    return null;
  }

  if (body.type === "raw") {
    return resolveVariables(body.content, variables);
  }

  if (body.type === "x-www-form-urlencoded") {
    const params = new URLSearchParams();
    body.params
      .filter((p) => p.enabled)
      .forEach((param) => {
        params.append(param.key, resolveVariables(param.value, variables));
      });
    return params;
  }

  if (body.type === "form-data") {
    const formData = new FormData();
    body.params
      .filter((p) => p.enabled)
      .forEach((param) => {
        formData.append(param.key, resolveVariables(param.value, variables));
      });
    return formData;
  }

  // For binary, we'd need file handling which is not implemented yet
  return null;
}

/**
 * Executes an HTTP request
 */
export async function executeRequest(
  request: HttpRequest,
): Promise<HttpResponse> {
  // Start timing
  const startTime = performance.now();
  const timing: HttpResponseTiming = {
    dns: 0,
    connection: 0,
    tls: 0,
    firstByte: 0,
    download: 0,
    total: 0,
  };

  try {
    // Build URL with query parameters
    const url = buildUrl(request.url, request.params, request.variables);

    // Build headers
    const headers = buildHeaders(
      request.headers,
      request.auth,
      request.variables,
    );

    // Build body
    const body = buildBody(request.body, request.variables);

    // Prepare fetch options
    const options: RequestInit = {
      method: request.method,
      headers,
      // Only include body for methods that support it
      ...(request.method !== "GET" && request.method !== "HEAD"
        ? { body: body as any }
        : {}),
    };

    // Execute request
    const fetchStartTime = performance.now();
    const response = await fetch(url, options);
    const responseTime = performance.now();

    // Get response body
    const responseBody = await response.text();
    const completeTime = performance.now();

    // Calculate timing (this is approximate since browser fetch API doesn't expose detailed timing)
    timing.total = completeTime - startTime;
    timing.firstByte = responseTime - fetchStartTime;
    timing.download = completeTime - responseTime;

    // Estimate other timings (these are very rough approximations)
    timing.connection = timing.total * 0.1;
    timing.dns = timing.total * 0.05;
    timing.tls = url.startsWith("https") ? timing.total * 0.15 : 0;

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      size: new Blob([responseBody]).size,
      timing,
      contentType: response.headers.get("content-type") || undefined,
    };
  } catch (error) {
    console.error("Request execution error:", error);
    throw error;
  }
}

/**
 * Parses a URL and extracts query parameters
 */
export function parseUrl(url: string): {
  baseUrl: string;
  params: KeyValuePair[];
} {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);
    const params: KeyValuePair[] = [];

    urlObj.searchParams.forEach((value, key) => {
      params.push({
        key,
        value,
        enabled: true,
      });
    });

    // Remove query string from base URL
    const baseUrl = url.split("?")[0];

    return { baseUrl, params };
  } catch (error) {
    // If URL parsing fails, return the original URL and empty params
    return { baseUrl: url, params: [] };
  }
}
