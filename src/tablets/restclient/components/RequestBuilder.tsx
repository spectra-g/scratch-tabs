import React, { useState } from "react";
import { Play, AlertCircle } from "lucide-react";
import { HttpRequest, ExplanationLevel } from "../types";
import { UrlBar } from "./UrlBar";
import { Tabs } from "./ui/Tabs";
import { KeyValueEditor } from "./KeyValueEditor";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";
import { VariablesEditor } from "./VariablesEditor";
import { RequestExplainer } from "./RequestExplainer";

interface RequestBuilderProps {
  request: HttpRequest;
  onUpdateRequest: (request: Partial<HttpRequest>) => void;
  onExecute: () => void;
  isExecuting: boolean;
  explanationLevel: ExplanationLevel;
  onExplanationLevelChange: (level: ExplanationLevel) => void;
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  request,
  onUpdateRequest,
  onExecute,
  isExecuting,
  explanationLevel,
  onExplanationLevelChange,
}) => {
  const [activeTab, setActiveTab] = useState("headers");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* URL Bar */}
      <div className="flex-none p-4 border-b border-gray-700/50">
        <UrlBar
          method={request.method}
          url={request.url}
          onMethodChange={(method) => onUpdateRequest({ method })}
          onUrlChange={(url) => onUpdateRequest({ url })}
        />

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
              ${
                isExecuting
                  ? "bg-gray-700/50 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              }
              transition-colors
            `}
          >
            <Play size={16} />
            <span>{isExecuting ? "Executing..." : "Send"}</span>
          </button>

          <div className="text-sm text-yellow-400 flex items-center">
            <AlertCircle size={16} className="mr-2" />
            <span>Browser CORS limitations may apply</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-none border-b border-gray-700/50">
        <Tabs
          tabs={[
            { id: "headers", label: "Headers" },
            { id: "auth", label: "Auth" },
            { id: "params", label: "Query Params" },
            { id: "body", label: "Body" },
            { id: "variables", label: "Variables" },
            { id: "explain", label: "Explain" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        {activeTab === "headers" && (
          <KeyValueEditor
            pairs={request.headers}
            onChange={(headers) => onUpdateRequest({ headers })}
            placeholder="Header name"
            valuePlaceholder="Header value"
            suggestions={[
              "Accept",
              "Accept-Encoding",
              "Accept-Language",
              "Cache-Control",
              "Connection",
              "Content-Length",
              "Content-Type",
              "Cookie",
              "Host",
              "Origin",
              "Referer",
              "User-Agent",
            ]}
          />
        )}

        {activeTab === "auth" && (
          <AuthEditor
            auth={request.auth}
            onChange={(auth) => onUpdateRequest({ auth })}
          />
        )}

        {activeTab === "params" && (
          <KeyValueEditor
            pairs={request.params}
            onChange={(params) => onUpdateRequest({ params })}
            placeholder="Parameter name"
            valuePlaceholder="Parameter value"
          />
        )}

        {activeTab === "body" && (
          <BodyEditor
            body={request.body}
            onChange={(body) => onUpdateRequest({ body })}
          />
        )}

        {activeTab === "variables" && (
          <VariablesEditor
            variables={request.variables}
            onChange={(variables) => onUpdateRequest({ variables })}
          />
        )}

        {activeTab === "explain" && (
          <RequestExplainer
            request={request}
            level={explanationLevel}
            onLevelChange={onExplanationLevelChange}
          />
        )}
      </div>
    </div>
  );
};
