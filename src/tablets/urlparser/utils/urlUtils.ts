import { UrlComponents, UrlWarning } from "../types";
import punycode from "punycode";

/**
 * Type for the result of parseUrl function
 */
export interface ParsedUrl {
  components: UrlComponents;
  warnings: UrlWarning[];
}

/**
 * Parse a URL string into its components
 * Handles both valid and invalid/partial URLs
 */
export function parseUrl(urlString: string): ParsedUrl {
  const warnings: UrlWarning[] = [];
  let url: URL;

  // Default empty components
  const components: UrlComponents = {
    scheme: "",
    username: "",
    password: "",
    host: "",
    port: "",
    path: "",
    query: "",
    fragment: "",
    queryParams: {},
  };

  // Handle empty input
  if (!urlString.trim()) {
    return { components, warnings };
  }

  // Check for backslashes (Windows-style paths or incorrect URLs)
  if (urlString.includes("\\")) {
    warnings.push({
      type: "warning",
      component: "full",
      message: "URL contains backslashes",
      description:
        "Backslashes (\\) are not standard in URLs. Browsers may convert them to forward slashes, but this can lead to unexpected behavior.",
      suggestion: "Replace backslashes with forward slashes (/).",
    });
  }

  // Check for encoded slashes
  if (
    urlString.includes("%2F") ||
    urlString.includes("%2f") ||
    urlString.includes("%5C") ||
    urlString.includes("%5c")
  ) {
    warnings.push({
      type: "warning",
      component: "path",
      message: "URL contains encoded slashes",
      description:
        "Encoded slashes (%2F, %5C) can be used to bypass security filters or cause path traversal issues.",
      suggestion: "Verify if encoded slashes are intentional and necessary.",
    });
  }

  // Check for null bytes
  if (urlString.includes("%00")) {
    warnings.push({
      type: "error",
      component: "full",
      message: "URL contains null bytes",
      description:
        "Null bytes (%00) can be used to trick systems into truncating strings and are often used in attacks.",
      suggestion: "Remove null bytes from the URL.",
    });
  }

  // Check for multiple @ symbols (potential host confusion)
  const atSymbolCount = (urlString.match(/@/g) || []).length;
  if (atSymbolCount > 1) {
    warnings.push({
      type: "error",
      component: "full",
      message: "Multiple @ symbols detected",
      description:
        "Multiple @ symbols can cause confusion about which part is the host. Browsers typically use the last @ to determine the host.",
      suggestion: "Ensure only one @ symbol is used for authentication.",
    });
  }

  // Try to parse with URL constructor
  try {
    // Add a scheme if missing to help URL constructor
    let normalizedUrl = urlString;
    if (!normalizedUrl.includes("://")) {
      // Check if it might be a localhost or IP without scheme
      if (
        normalizedUrl.startsWith("localhost") ||
        /^(\d{1,3}\.){3}\d{1,3}/.test(normalizedUrl) ||
        (normalizedUrl.includes("[") && normalizedUrl.includes("]"))
      ) {
        normalizedUrl = "http://" + normalizedUrl;
      } else if (!normalizedUrl.startsWith("//")) {
        // If it doesn't start with // (protocol-relative URL), assume http
        normalizedUrl = "http://" + normalizedUrl;
      } else {
        // Handle protocol-relative URLs
        normalizedUrl = "http:" + normalizedUrl;
      }

      warnings.push({
        type: "warning",
        component: "scheme",
        message: "Missing scheme",
        description: `No scheme (protocol) specified. Assumed 'http://' for parsing.`,
        suggestion:
          "Add an explicit scheme (e.g., http://, https://) for clarity.",
      });
    }

    url = new URL(normalizedUrl);

    // Fill in components
    components.scheme = url.protocol.replace(":", "");
    components.username = decodeURIComponent(url.username);
    components.password = decodeURIComponent(url.password);
    components.host = url.hostname;
    components.port = url.port;
    components.path = url.pathname;
    components.query = url.search.replace(/^\?/, "");
    components.fragment = url.hash.replace(/^#/, "");

    // Parse query parameters
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    components.queryParams = queryParams;

    // Check for userinfo (security concern)
    if (url.username || url.password) {
      warnings.push({
        type: "warning",
        component: "username",
        message: "URL contains credentials",
        description:
          "Including credentials in URLs is a security risk. They may be logged or leaked in browser history.",
        suggestion:
          "Use secure authentication methods instead of embedding credentials in URLs.",
      });
    }

    // Check for punycode/IDN domains (potential phishing)
    if (url.hostname !== url.hostname.toLowerCase()) {
      warnings.push({
        type: "warning",
        component: "host",
        message: "Mixed-case domain",
        description:
          "Domain contains mixed case characters which may indicate a spoofing attempt.",
        suggestion: "Verify the domain is legitimate.",
      });
    }

    // Check for IDN homograph attack potential
    if (url.hostname.includes("xn--")) {
      try {
        const unicodeDomain = punycode.toUnicode(url.hostname);
        warnings.push({
          type: "warning",
          component: "host",
          message: "Internationalized domain name",
          description: `This domain uses Punycode encoding. It appears as: ${unicodeDomain}`,
          suggestion:
            "Verify this is the intended domain as IDNs can be used for homograph attacks.",
        });
      } catch (e) {
        // If punycode conversion fails, still warn
        warnings.push({
          type: "warning",
          component: "host",
          message: "Unusual domain encoding",
          description:
            "This domain uses Punycode encoding which could be used for deception.",
          suggestion: "Verify this is the intended domain.",
        });
      }
    }

    // Check for IPv6 with port (potential confusion)
    if (url.hostname.includes("]") && url.port) {
      warnings.push({
        type: "warning",
        component: "host",
        message: "IPv6 address with port",
        description:
          "IPv6 addresses with ports can be parsed inconsistently across systems.",
        suggestion: "Ensure the IPv6 address is properly enclosed in brackets.",
      });
    }
  } catch (error) {
    // URL constructor failed, try manual parsing for partial URLs
    warnings.push({
      type: "error",
      component: "full",
      message: "Invalid URL format",
      description:
        "The URL could not be parsed by the standard URL constructor.",
      suggestion: "Check the URL syntax and ensure it follows standard format.",
    });

    // Attempt manual parsing for partial components
    try {
      // Try to extract scheme
      const schemeMatch = urlString.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
      if (schemeMatch) {
        components.scheme = schemeMatch[1];
        urlString = urlString.substring(schemeMatch[0].length);
      }

      // Check for authority section (//...)
      if (urlString.startsWith("//")) {
        urlString = urlString.substring(2);

        // Extract authority (everything up to the next slash, question mark, or hash)
        const authorityMatch = urlString.match(/^([^/?#]*)/);
        if (authorityMatch) {
          const authority = authorityMatch[1];
          urlString = urlString.substring(authority.length);

          // Extract userinfo, host, and port from authority
          const userinfoHostPort = authority.split("@");
          if (userinfoHostPort.length > 1) {
            // Has userinfo
            const userinfo = userinfoHostPort[0];
            const userPass = userinfo.split(":");
            components.username = userPass[0] || "";
            components.password = userPass.length > 1 ? userPass[1] : "";

            // Extract host and port
            const hostPort = userinfoHostPort[1].split(":");
            components.host = hostPort[0] || "";
            components.port = hostPort.length > 1 ? hostPort[1] : "";
          } else {
            // No userinfo
            const hostPort = authority.split(":");
            components.host = hostPort[0] || "";
            components.port = hostPort.length > 1 ? hostPort[1] : "";
          }
        }
      }

      // Extract path
      const pathMatch = urlString.match(/^([^?#]*)/);
      if (pathMatch) {
        components.path = pathMatch[1];
        urlString = urlString.substring(pathMatch[1].length);
      }

      // Extract query
      if (urlString.startsWith("?")) {
        const queryMatch = urlString.match(/^\?([^#]*)/);
        if (queryMatch) {
          components.query = queryMatch[1];
          urlString = urlString.substring(queryMatch[0].length);

          // Parse query parameters
          const params: Record<string, string> = {};
          components.query.split("&").forEach((param) => {
            const [key, value] = param.split("=");
            if (key) {
              params[key] = value || "";
            }
          });
          components.queryParams = params;
        }
      }

      // Extract fragment
      if (urlString.startsWith("#")) {
        components.fragment = urlString.substring(1);
      }
    } catch (e) {
      // If manual parsing fails, just return the empty components
      console.error("Manual URL parsing failed:", e);
    }
  }

  // Additional validations and warnings

  // Check for unusual port numbers
  if (components.port) {
    const port = parseInt(components.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      warnings.push({
        type: "error",
        component: "port",
        message: "Invalid port number",
        description: "Port numbers must be between 1 and 65535.",
        suggestion: "Correct the port number or remove it.",
      });
    } else if (port === 80 && components.scheme === "http") {
      warnings.push({
        type: "warning",
        component: "port",
        message: "Default HTTP port specified",
        description:
          "Port 80 is the default for HTTP and doesn't need to be specified.",
        suggestion: "Consider removing the explicit port for cleaner URLs.",
      });
    } else if (port === 443 && components.scheme === "https") {
      warnings.push({
        type: "warning",
        component: "port",
        message: "Default HTTPS port specified",
        description:
          "Port 443 is the default for HTTPS and doesn't need to be specified.",
        suggestion: "Consider removing the explicit port for cleaner URLs.",
      });
    }
  }

  // Check for unusual schemes
  if (
    components.scheme &&
    !["http", "https", "ftp", "file", "data", "mailto", "tel", "sms"].includes(
      components.scheme,
    )
  ) {
    warnings.push({
      type: "warning",
      component: "scheme",
      message: "Unusual URL scheme",
      description: `The scheme "${components.scheme}" is not commonly used in web URLs.`,
      suggestion: "Verify this is the intended scheme.",
    });
  }

  // Check for non-standard query parameter format
  if (components.query) {
    if (components.query.includes(";")) {
      warnings.push({
        type: "warning",
        component: "query",
        message: "Non-standard query separator",
        description:
          "The query string uses semicolons (;) instead of ampersands (&) as separators.",
        suggestion:
          "Consider using standard & separators for better compatibility.",
      });
    }

    // Check for duplicate query parameters
    const paramNames = Object.keys(components.queryParams);
    const uniqueParamNames = new Set(paramNames);
    if (paramNames.length !== uniqueParamNames.size) {
      warnings.push({
        type: "warning",
        component: "query",
        message: "Duplicate query parameters",
        description:
          "The URL contains duplicate query parameter names. Different systems may handle these inconsistently.",
        suggestion: "Use unique parameter names to avoid ambiguity.",
      });
    }
  }

  // Check for fragment misuse
  if (components.fragment && components.fragment.includes("=")) {
    warnings.push({
      type: "warning",
      component: "fragment",
      message: "Fragment contains query-like parameters",
      description:
        "The fragment appears to contain key-value pairs, which may indicate confusion between fragment and query components.",
      suggestion:
        "Consider moving these parameters to the query string if they're meant to be sent to the server.",
    });
  }

  return { components, warnings };
}

/**
 * Compose URL components back into a URL string
 */
export function composeUrl(components: UrlComponents): string {
  let url = "";

  // Add scheme
  if (components.scheme) {
    url += `${components.scheme}://`;
  }

  // Add authentication
  if (components.username || components.password) {
    url += `${encodeURIComponent(components.username)}`;
    if (components.password) {
      url += `:${encodeURIComponent(components.password)}`;
    }
    url += "@";
  }

  // Add host
  url += components.host;

  // Add port
  if (components.port) {
    url += `:${components.port}`;
  }

  // Add path (ensure it starts with /)
  if (components.path) {
    if (!components.path.startsWith("/")) {
      url += "/";
    }
    url += components.path;
  } else if (components.query || components.fragment) {
    // If we have query or fragment but no path, add a slash
    url += "/";
  }

  // Add query
  if (components.query) {
    url += `?${components.query}`;
  }

  // Add fragment
  if (components.fragment) {
    url += `#${components.fragment}`;
  }

  return url;
}

/**
 * Encode a URL component
 */
export function encodeComponent(
  value: string,
  component: keyof UrlComponents,
): string {
  if (!value) return "";

  switch (component) {
    case "scheme":
      return value; // Schemes shouldn't be encoded
    case "username":
    case "password":
      return encodeURIComponent(value);
    case "host":
      return value; // Hosts are handled specially by browsers
    case "port":
      return value; // Ports are numeric and don't need encoding
    case "path":
      // Encode path segments but keep slashes
      return value
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    case "query":
      // For raw query string, just return as is (should be handled by queryParams)
      return value;
    case "fragment":
      return encodeURIComponent(value);
    default:
      return encodeURIComponent(value);
  }
}

/**
 * Decode a URL component
 */
export function decodeComponent(
  value: string,
  component: keyof UrlComponents,
): string {
  if (!value) return "";

  try {
    switch (component) {
      case "scheme":
      case "host":
      case "port":
        return value; // These typically aren't encoded
      case "username":
      case "password":
      case "fragment":
        return decodeURIComponent(value);
      case "path":
        // Decode path segments but keep slashes
        return value
          .split("/")
          .map((segment) => (segment ? decodeURIComponent(segment) : ""))
          .join("/");
      case "query":
        // For raw query string, just return as is (should be handled by queryParams)
        return value;
      default:
        return decodeURIComponent(value);
    }
  } catch (e) {
    // If decoding fails, return the original value
    return value;
  }
}

/**
 * Convert URL to curl command
 */
export function toCurl(urlString: string): string {
  if (!urlString) return "curl";

  try {
    const url = new URL(urlString);
    let curl = `curl "${urlString}"`;

    // Add user-agent
    curl +=
      ' \\\n  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"';

    // Add basic auth if present
    if (url.username || url.password) {
      curl += ` \\\n  -u "${url.username}:${url.password}"`;
    }

    return curl;
  } catch (e) {
    // If URL parsing fails, return a basic curl command
    return `curl "${urlString}"`;
  }
}

/**
 * Compare URL parsing across different platforms
 */
export function compareUrlParsing(
  urlString: string,
): Record<string, UrlComponents> {
  // This is a simplified simulation of how different platforms might parse URLs
  // In a real implementation, you might use a server-side API or WASM modules

  const browserResult = parseUrl(urlString).components;

  // Simulate Node.js URL parsing differences
  const nodeResult = { ...browserResult };
  // Node.js handles some edge cases differently, like trailing dots in hostnames
  if (nodeResult.host.endsWith(".")) {
    nodeResult.host = nodeResult.host.slice(0, -1);
  }

  // Simulate Python's urllib.parse differences
  const pythonResult = { ...browserResult };
  // Python keeps empty fragments
  if (urlString.includes("#") && !pythonResult.fragment) {
    pythonResult.fragment = "";
  }

  // Simulate Java's URL parsing differences
  const javaResult = { ...browserResult };
  // Java is stricter about schemes
  if (!["http", "https", "ftp", "file"].includes(javaResult.scheme)) {
    javaResult.scheme = "";
    javaResult.host = "";
    javaResult.path = urlString;
  }

  // Simulate Go's url.Parse differences
  const goResult = { ...browserResult };
  // Go handles raw query slightly differently
  if (goResult.query.includes("+")) {
    goResult.query = goResult.query.replace(/\+/g, "%20");
  }

  return {
    browser: browserResult,
    node: nodeResult,
    python: pythonResult,
    java: javaResult,
    go: goResult,
  };
}

/**
 * Check if a URL is potentially suspicious
 */
export function isSuspiciousUrl(urlString: string): boolean {
  // Check for common phishing or malicious patterns
  const suspiciousPatterns = [
    // Multiple @ symbols
    /@.*@/,
    // Encoded slashes
    /%2F/i,
    /%5C/i,
    // Null bytes
    /%00/,
    // IP address in unusual format
    /https?:\/\/\d+\.\d+\.\d+\.\d+/,
    // Unusual number of subdomains
    /https?:\/\/([^\/]+\.){5,}[^\/]+\//,
    // Deceptive domains (simplified check)
    /paypal|apple|google|microsoft|amazon|facebook|instagram|twitter|netflix|bank/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(urlString));
}

/**
 * Generate example suspicious URLs for demo mode
 */
export function getSuspiciousUrlExamples(): {
  url: string;
  description: string;
}[] {
  return [
    {
      url: "https://user:password@evil.com@google.com",
      description: "Host confusion attack using multiple @ symbols",
    },
    {
      url: "https://google.com.evil.com",
      description: "Subdomain attack mimicking a legitimate domain",
    },
    {
      url: "https://xn--googl-fsa.com",
      description: "IDN homograph attack using Punycode",
    },
    {
      url: "https://google.com/redirect?url=https://evil.com",
      description: "Open redirect vulnerability",
    },
    {
      url: "https://evil.com/path%2f..%2fsecret",
      description: "Path traversal attack using encoded slashes",
    },
    {
      url: "https://evil.com/path?param=value%00injection",
      description: "Null byte injection attack",
    },
    {
      url: "https://evil.com/#/login?redirect=https://google.com",
      description: "Fragment-based client-side open redirect",
    },
  ];
}
