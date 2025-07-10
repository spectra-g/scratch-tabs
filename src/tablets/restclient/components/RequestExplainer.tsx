import React from "react";
import { HttpRequest, ExplanationLevel } from "../types";
import { resolveVariables } from "../utils/requestUtils";

interface RequestExplainerProps {
  request: HttpRequest;
  level: ExplanationLevel;
  onLevelChange: (level: ExplanationLevel) => void;
}

export const RequestExplainer: React.FC<RequestExplainerProps> = ({
  request,
  level,
  onLevelChange,
}) => {
  // Generate explanation based on level
  const generateExplanation = (): string => {
    const { method, url, headers, auth, params, body, variables } = request;

    // Try to extract domain from URL
    let domain = url;
    let path = "";

    try {
      const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);
      domain = urlObj.hostname;
      path = urlObj.pathname;
    } catch (e) {
      // If URL parsing fails, use the full URL
    }

    // Simplest level - just domain
    if (level === "simplest") {
      return `Request to ${domain}`;
    }

    // Simple level - domain + path
    if (level === "simple") {
      return `This is a request to ${domain}${path}`;
    }

    // Medium level - method, domain, path, high-level body type, indication of headers/auth
    if (level === "medium") {
      let explanation = `This is a ${method} request to ${domain}${path}`;

      if (body.type !== "none") {
        explanation += ` with a ${body.type === "raw" && body.format ? body.format.toUpperCase() : body.type} body`;
      }

      if (headers.filter((h) => h.enabled).length > 0 || auth.type !== "none") {
        explanation += " and custom headers";
      }

      return explanation + ".";
    }

    // Detailed level - more details on auth, specific body type
    if (level === "detailed") {
      let explanation = `This is a ${method} request to ${url}.`;

      if (auth.type !== "none") {
        explanation += ` It includes ${auth.type === "basic" ? "Basic Authentication" : auth.type === "bearer" ? "an Authorization Bearer token" : "an API Key"}.`;
      }

      if (body.type !== "none") {
        explanation += ` It has a ${body.type === "raw" && body.format ? body.format.toUpperCase() : body.type} body.`;
      }

      return explanation;
    }

    // Most detailed level - full URL, key headers, specific auth details, body snippet
    if (level === "most-detailed") {
      let explanation = `This is a ${method} request to ${url}.`;

      // Headers
      const enabledHeaders = headers.filter((h) => h.enabled);
      if (enabledHeaders.length > 0) {
        explanation += " Headers include: ";
        explanation += enabledHeaders
          .slice(0, 3)
          .map((h) => `${h.key}: ${resolveVariables(h.value, variables)}`)
          .join(", ");

        if (enabledHeaders.length > 3) {
          explanation += `, and ${enabledHeaders.length - 3} more.`;
        } else {
          explanation += ".";
        }
      }

      // Authentication
      if (auth.type !== "none") {
        explanation += ` Authentication: ${auth.type === "basic" ? "Basic Auth" : auth.type === "bearer" ? "Bearer Token" : "API Key"}.`;
      }

      // Body
      if (body.type !== "none") {
        explanation += ` Body (${body.type === "raw" && body.format ? body.format.toUpperCase() : body.type}): `;

        if (body.type === "raw" && body.content) {
          // Show a snippet of the body content
          const content = resolveVariables(body.content, variables);
          explanation += `${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`;
        } else if (
          body.type === "form-data" ||
          body.type === "x-www-form-urlencoded"
        ) {
          // Show form parameters
          const enabledParams = body.params.filter((p) => p.enabled);
          if (enabledParams.length > 0) {
            explanation += enabledParams
              .slice(0, 3)
              .map((p) => `${p.key}=${resolveVariables(p.value, variables)}`)
              .join("&");

            if (enabledParams.length > 3) {
              explanation += ` and ${enabledParams.length - 3} more parameters`;
            }
          } else {
            explanation += "No parameters";
          }
        }
      }

      return explanation;
    }

    return "Request explanation";
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-300">
          Request Explanation
        </h3>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Simple</span>
          <input
            type="range"
            min="1"
            max="5"
            value={
              level === "simplest"
                ? 1
                : level === "simple"
                  ? 2
                  : level === "medium"
                    ? 3
                    : level === "detailed"
                      ? 4
                      : 5
            }
            onChange={(e) => {
              const value = parseInt(e.target.value);
              onLevelChange(
                value === 1
                  ? "simplest"
                  : value === 2
                    ? "simple"
                    : value === 3
                      ? "medium"
                      : value === 4
                        ? "detailed"
                        : "most-detailed",
              );
            }}
            className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-400">Detailed</span>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3 text-sm text-gray-200">
        {generateExplanation()}
      </div>
    </div>
  );
};
