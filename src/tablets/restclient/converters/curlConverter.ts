import { HttpRequest, RequestConverter } from "../types";
import { resolveVariables } from "../utils/requestUtils";
import { SensitiveDataManager } from "../../../utils/sensitiveDataManager";

/**
 * Escapes a string for use in a shell command
 */
function escapeShellArg(arg: string): string {
  // Replace all single quotes with '\''
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Helper function to unmask sensitive data in auth parameters
 */
function unmaskAuthParams(auth: HttpRequest["auth"]) {
  if (auth.type === "none") return auth;

  const unmaskedParams: Record<string, string> = {};
  const sensitiveFields = ["password", "token", "value", "secret"];

  Object.entries(auth.params).forEach(([key, value]) => {
    if (typeof value === "string" && sensitiveFields.includes(key)) {
      unmaskedParams[key] = SensitiveDataManager.unmask(value);
    } else {
      unmaskedParams[key] = value;
    }
  });

  return {
    ...auth,
    params: unmaskedParams,
  };
}

/**
 * Helper function to unmask sensitive data in variables
 */
function unmaskVariables(variables: HttpRequest["variables"]) {
  return variables.map((variable) => {
    const sensitiveKeys = [
      "token",
      "password",
      "secret",
      "key",
      "auth",
      "api",
      "access",
    ];
    const isSensitive = sensitiveKeys.some((sensitiveKey) =>
      variable.key.toLowerCase().includes(sensitiveKey),
    );

    if (isSensitive && SensitiveDataManager.isMasked(variable.value)) {
      return {
        ...variable,
        value: SensitiveDataManager.unmask(variable.value),
      };
    }

    return variable;
  });
}

/**
 * Converts an HTTP request to a cURL command
 */
export function requestToCurl(request: HttpRequest): string {
  // Unmask sensitive data before conversion
  const unmaskedAuth = unmaskAuthParams(request.auth);
  const unmaskedVariables = unmaskVariables(request.variables);

  const { method, url, headers, params, body } = request;

  // Start with the basic curl command
  let curlCommand = "curl";

  // Add method if not GET
  if (method !== "GET") {
    curlCommand += ` -X ${method}`;
  }

  // Build the URL with query parameters
  let fullUrl = url;
  if (
    params.length > 0 ||
    (unmaskedAuth.type === "apikey" && unmaskedAuth.params.addTo === "query")
  ) {
    const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);

    // Add regular query parameters
    params
      .filter((p) => p.enabled)
      .forEach((param) => {
        urlObj.searchParams.append(
          param.key,
          resolveVariables(param.value, unmaskedVariables),
        );
      });

    // Add API key as query parameter if specified
    if (
      unmaskedAuth.type === "apikey" &&
      unmaskedAuth.params.addTo === "query"
    ) {
      const key = unmaskedAuth.params.key || "";
      const value = resolveVariables(
        unmaskedAuth.params.value || "",
        unmaskedVariables,
      );
      if (key && value) {
        urlObj.searchParams.append(key, value);
      }
    }

    fullUrl = urlObj.toString();
  }

  // Resolve variables in the URL
  fullUrl = resolveVariables(fullUrl, unmaskedVariables);

  // Add the URL
  curlCommand += ` ${escapeShellArg(fullUrl)}`;

  // Add headers
  headers
    .filter((h) => h.enabled)
    .forEach((header) => {
      curlCommand += ` -H ${escapeShellArg(`${header.key}: ${resolveVariables(header.value, unmaskedVariables)}`)}`;
    });

  // Add authentication
  if (unmaskedAuth.type === "basic") {
    const username = resolveVariables(
      unmaskedAuth.params.username || "",
      unmaskedVariables,
    );
    const password = resolveVariables(
      unmaskedAuth.params.password || "",
      unmaskedVariables,
    );
    curlCommand += ` -u ${escapeShellArg(`${username}:${password}`)}`;
  } else if (unmaskedAuth.type === "bearer") {
    const token = resolveVariables(
      unmaskedAuth.params.token || "",
      unmaskedVariables,
    );
    curlCommand += ` -H ${escapeShellArg(`Authorization: Bearer ${token}`)}`;
  } else if (unmaskedAuth.type === "apikey") {
    const key = unmaskedAuth.params.key || "";
    const value = resolveVariables(
      unmaskedAuth.params.value || "",
      unmaskedVariables,
    );

    // Default to header if addTo is not set, for consistency with UI
    const addTo = unmaskedAuth.params.addTo || "header";

    if (addTo === "header" && key && value) {
      curlCommand += ` -H ${escapeShellArg(`${key}: ${value}`)}`;
    }
    // Query parameter case is handled in URL building above
  }

  // Add body
  if (body.type === "raw" && body.content) {
    const resolvedContent = resolveVariables(body.content, unmaskedVariables);
    curlCommand += ` -d ${escapeShellArg(resolvedContent)}`;

    // Add content type header if not already present
    const hasContentType = headers.some(
      (h) => h.enabled && h.key.toLowerCase() === "content-type",
    );

    if (!hasContentType && body.format) {
      let contentType = "text/plain";
      switch (body.format) {
        case "json":
          contentType = "application/json";
          break;
        case "xml":
          contentType = "application/xml";
          break;
        case "html":
          contentType = "text/html";
          break;
        case "javascript":
          contentType = "application/javascript";
          break;
      }

      curlCommand += ` -H ${escapeShellArg(`Content-Type: ${contentType}`)}`;
    }
  } else if (body.type === "form-data") {
    body.params
      .filter((p) => p.enabled)
      .forEach((param) => {
        const resolvedValue = resolveVariables(param.value, unmaskedVariables);
        curlCommand += ` -F ${escapeShellArg(`${param.key}=${resolvedValue}`)}`;
      });
  } else if (body.type === "x-www-form-urlencoded") {
    body.params
      .filter((p) => p.enabled)
      .forEach((param) => {
        const resolvedValue = resolveVariables(param.value, unmaskedVariables);
        curlCommand += ` -d ${escapeShellArg(`${param.key}=${resolvedValue}`)}`;
      });

    // Add content type header if not already present
    const hasContentType = headers.some(
      (h) => h.enabled && h.key.toLowerCase() === "content-type",
    );

    if (!hasContentType) {
      curlCommand += ` -H ${escapeShellArg("Content-Type: application/x-www-form-urlencoded")}`;
    }
  }

  return curlCommand;
}

/**
 * Parses a cURL command into an HTTP request
 */
export function parseCurl(curlCommand: string): HttpRequest | null {
  try {
    // Basic structure for the request
    const request: HttpRequest = {
      method: "GET",
      url: "",
      headers: [],
      auth: {
        type: "none",
        params: {},
      },
      params: [],
      body: {
        type: "none",
        content: "",
        params: [],
      },
      variables: [],
    };

    // Remove 'curl' from the beginning if present
    let cmd = curlCommand.trim();
    if (cmd.startsWith("curl")) {
      cmd = cmd.substring(4).trim();
    }

    // Split the command into tokens, respecting quotes
    const tokens: string[] = [];
    let currentToken = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];

      if (escaped) {
        currentToken += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      if (char === " " && !inSingleQuote && !inDoubleQuote) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = "";
        }
        continue;
      }

      currentToken += char;
    }

    if (currentToken) {
      tokens.push(currentToken);
    }

    // Process tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // URL (no flag)
      if (!token.startsWith("-") && !request.url) {
        request.url = token;
        continue;
      }

      // Method
      if (token === "-X" || token === "--request") {
        if (i + 1 < tokens.length) {
          request.method = tokens[++i] as any;
        }
        continue;
      }

      // Headers
      if (token === "-H" || token === "--header") {
        if (i + 1 < tokens.length) {
          const headerStr = tokens[++i];
          const colonIndex = headerStr.indexOf(":");

          if (colonIndex > 0) {
            const key = headerStr.substring(0, colonIndex).trim();
            const value = headerStr.substring(colonIndex + 1).trim();

            // Check for special headers
            if (key.toLowerCase() === "authorization") {
              if (value.startsWith("Basic ")) {
                const credentials = atob(value.substring(6));
                const [username, password] = credentials.split(":");
                request.auth = {
                  type: "basic",
                  params: { username, password },
                };
              } else if (value.startsWith("Bearer ")) {
                request.auth = {
                  type: "bearer",
                  params: { token: value.substring(7) },
                };
              } else {
                request.headers.push({ key, value, enabled: true });
              }
            } else {
              request.headers.push({ key, value, enabled: true });
            }
          }
        }
        continue;
      }

      // Basic auth
      if (token === "-u" || token === "--user") {
        if (i + 1 < tokens.length) {
          const auth = tokens[++i];
          const colonIndex = auth.indexOf(":");

          if (colonIndex > 0) {
            const username = auth.substring(0, colonIndex);
            const password = auth.substring(colonIndex + 1);
            request.auth = {
              type: "basic",
              params: { username, password },
            };
          }
        }
        continue;
      }

      // Data (body)
      if (token === "-d" || token === "--data" || token === "--data-raw") {
        if (i + 1 < tokens.length) {
          const data = tokens[++i];

          // Check if it's form-urlencoded
          const hasContentTypeHeader = request.headers.some(
            (h) =>
              h.key.toLowerCase() === "content-type" &&
              h.value
                .toLowerCase()
                .includes("application/x-www-form-urlencoded"),
          );

          if (hasContentTypeHeader && data.includes("=")) {
            // It's form-urlencoded
            request.body.type = "x-www-form-urlencoded";

            // Parse key-value pairs
            const pairs = data.split("&");
            request.body.params = pairs.map((pair) => {
              const [key, value] = pair.split("=");
              return {
                key: decodeURIComponent(key),
                value: decodeURIComponent(value || ""),
                enabled: true,
              };
            });
          } else {
            // It's raw data
            request.body.type = "raw";
            request.body.content = data;

            // Try to determine format
            const contentTypeHeader = request.headers.find(
              (h) => h.key.toLowerCase() === "content-type",
            );

            if (contentTypeHeader) {
              if (contentTypeHeader.value.includes("json")) {
                request.body.format = "json";
              } else if (contentTypeHeader.value.includes("xml")) {
                request.body.format = "xml";
              } else if (contentTypeHeader.value.includes("html")) {
                request.body.format = "html";
              } else if (contentTypeHeader.value.includes("javascript")) {
                request.body.format = "javascript";
              } else {
                request.body.format = "text";
              }
            } else {
              // Try to auto-detect
              try {
                JSON.parse(data);
                request.body.format = "json";
              } catch (e) {
                // Not JSON, default to text
                request.body.format = "text";
              }
            }
          }
        }
        continue;
      }

      // Form data
      if (token === "-F" || token === "--form") {
        if (i + 1 < tokens.length) {
          if (request.body.type !== "form-data") {
            request.body.type = "form-data";
            request.body.params = [];
          }

          const formData = tokens[++i];
          const equalIndex = formData.indexOf("=");

          if (equalIndex > 0) {
            const key = formData.substring(0, equalIndex);
            const value = formData.substring(equalIndex + 1);
            request.body.params.push({
              key,
              value,
              enabled: true,
            });
          }
        }
        continue;
      }
    }

    return request;
  } catch (error) {
    console.error("Error parsing cURL command:", error);
    return null;
  }
}

export const curlConverter: RequestConverter = {
  id: "curl",
  name: "cURL",
  convert: requestToCurl,
  parse: parseCurl,
};
