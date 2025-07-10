import { HttpRequest, RequestConverter } from "../types";
import { resolveVariables } from "../utils/requestUtils";
import { SensitiveDataManager } from "../../../utils/sensitiveDataManager";

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
 * Converts an HTTP request to a Postman Collection format
 */
export function requestToPostman(request: HttpRequest): string {
  // Unmask sensitive data before conversion
  const unmaskedAuth = unmaskAuthParams(request.auth);
  const unmaskedVariables = unmaskVariables(request.variables);

  const { method, url, headers, params, body } = request;

  // Build the URL with query parameters
  let fullUrl = url;
  const urlParams: any[] = [];

  if (params.length > 0) {
    const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);

    // Clear existing params from the URL
    urlObj.search = "";
    fullUrl = urlObj.toString();

    // Add params to the array
    params
      .filter((p) => p.enabled)
      .forEach((param) => {
        urlParams.push({
          key: param.key,
          value: resolveVariables(param.value, unmaskedVariables),
          disabled: false,
        });
      });
  }

  // Build headers array
  const headersArray: any[] = [];

  headers
    .filter((h) => h.enabled)
    .forEach((header) => {
      headersArray.push({
        key: header.key,
        value: resolveVariables(header.value, unmaskedVariables),
        disabled: false,
      });
    });

  // Build the request object
  const postmanRequest: any = {
    name: `${method} ${url}`,
    request: {
      method,
      header: headersArray,
      url: {
        raw: fullUrl,
        protocol: fullUrl.startsWith("https") ? "https" : "http",
        host: [],
        path: [],
        query: urlParams,
      },
    },
  };

  // Parse the URL
  try {
    const urlObj = new URL(
      fullUrl.startsWith("http") ? fullUrl : `http://${fullUrl}`,
    );
    postmanRequest.request.url.host = urlObj.hostname.split(".");
    postmanRequest.request.url.path = urlObj.pathname
      .split("/")
      .filter((p) => p);

    if (urlObj.port) {
      postmanRequest.request.url.port = urlObj.port;
    }
  } catch (e) {
    // If URL parsing fails, use the full URL as is
  }

  // Add query parameters
  if (params.length > 0) {
    postmanRequest.request.url.query = params
      .filter((p) => p.enabled)
      .map((param) => ({
        key: param.key,
        value: resolveVariables(param.value, unmaskedVariables),
        disabled: false,
      }));
  }

  // Add headers
  if (headers.length > 0) {
    postmanRequest.request.header = headers
      .filter((h) => h.enabled)
      .map((header) => ({
        key: header.key,
        value: resolveVariables(header.value, unmaskedVariables),
        disabled: false,
      }));
  }

  // Add authentication
  if (unmaskedAuth.type === "basic") {
    postmanRequest.request.auth = {
      type: "basic",
      basic: [
        {
          key: "username",
          value: resolveVariables(
            unmaskedAuth.params.username || "",
            unmaskedVariables,
          ),
          type: "string",
        },
        {
          key: "password",
          value: resolveVariables(
            unmaskedAuth.params.password || "",
            unmaskedVariables,
          ),
          type: "string",
        },
      ],
    };
  } else if (unmaskedAuth.type === "bearer") {
    postmanRequest.request.auth = {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: resolveVariables(
            unmaskedAuth.params.token || "",
            unmaskedVariables,
          ),
          type: "string",
        },
      ],
    };
  } else if (unmaskedAuth.type === "apikey") {
    // Default to header if addTo is not set, for consistency with UI
    const addTo = unmaskedAuth.params.addTo || "header";

    postmanRequest.request.auth = {
      type: "apikey",
      apikey: [
        {
          key: "key",
          value: unmaskedAuth.params.key || "",
          type: "string",
        },
        {
          key: "value",
          value: resolveVariables(
            unmaskedAuth.params.value || "",
            unmaskedVariables,
          ),
          type: "string",
        },
        {
          key: "in",
          value: addTo,
          type: "string",
        },
      ],
    };
  }

  // Add body
  if (body.type !== "none") {
    postmanRequest.request.body = {
      mode:
        body.type === "raw"
          ? "raw"
          : body.type === "form-data"
            ? "formdata"
            : body.type === "x-www-form-urlencoded"
              ? "urlencoded"
              : "raw",
    };

    if (body.type === "raw") {
      postmanRequest.request.body.raw = resolveVariables(
        body.content,
        unmaskedVariables,
      );

      if (body.format) {
        let language = "text";
        switch (body.format) {
          case "json":
            language = "json";
            break;
          case "xml":
            language = "xml";
            break;
          case "html":
            language = "html";
            break;
          case "javascript":
            language = "javascript";
            break;
        }

        postmanRequest.request.body.options = {
          raw: {
            language,
          },
        };
      }
    } else if (body.type === "form-data") {
      postmanRequest.request.body.formdata = body.params
        .filter((p) => p.enabled)
        .map((param) => ({
          key: param.key,
          value: resolveVariables(param.value, unmaskedVariables),
          type: "text",
          disabled: false,
        }));
    } else if (body.type === "x-www-form-urlencoded") {
      postmanRequest.request.body.urlencoded = body.params
        .filter((p) => p.enabled)
        .map((param) => ({
          key: param.key,
          value: resolveVariables(param.value, unmaskedVariables),
          disabled: false,
        }));
    }
  }

  // Create a collection object
  const collection = {
    info: {
      name: "Exported Collection",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [postmanRequest],
  };

  return JSON.stringify(collection, null, 2);
}

export const postmanConverter: RequestConverter = {
  id: "postman",
  name: "Postman Collection",
  convert: requestToPostman,
};
