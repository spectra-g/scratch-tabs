import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { Copy, Code, History, Check } from "lucide-react";
import { HttpRequest } from "../types";
import { converters, getConverter } from "../converters";
import { requestToCurl } from "../converters/curlConverter";
import { useThemeStore } from "../../../stores/themeStore";

interface RequestConverterProps {
  request: HttpRequest;
  format: string;
  onFormatChange: (format: string) => void;
  onUpdateRequest: (request: Partial<HttpRequest>) => void;
  onShowRequestHistory: () => void;
  requestHistoryCount: number;
}

export const RequestConverter: React.FC<RequestConverterProps> = ({
  request,
  format,
  onFormatChange,
  onUpdateRequest,
  onShowRequestHistory,
  requestHistoryCount,
}) => {
  const { isDarkMode } = useThemeStore();
  const [convertedText, setConvertedText] = useState("");
  const [isError, setIsError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCurlCopied, setIsCurlCopied] = useState(false);
  const selfUpdateRef = useRef(false);

  useEffect(() => {
    if (selfUpdateRef.current) {
      selfUpdateRef.current = false;
      return;
    }
    const converter = getConverter(format);
    if (converter) {
      try {
        const text = converter.convert(request);
        setConvertedText(text);
        setIsError(false);
      } catch (error) {
        console.error(`Error converting to ${format}:`, error);
        setConvertedText(`Error converting to ${format}`);
        setIsError(true);
      }
    } else {
      setConvertedText(`Converter for ${format} not found`);
      setIsError(true);
    }
  }, [request, format]);

  const handleEditorChange = (value: string | undefined) => {
    setConvertedText(value || "");
    const converter = getConverter(format);
    if (converter && converter.parse && value) {
      try {
        const parsedRequest = converter.parse(value);
        if (parsedRequest) {
          selfUpdateRef.current = true;
          onUpdateRequest(parsedRequest);
          setIsError(false);
        } else {
          setIsError(true);
        }
      } catch (error) {
        console.error(`Error parsing ${format}:`, error);
        setIsError(true);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(convertedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyCurl = async () => {
    try {
      const curlCommand = requestToCurl(request);
      await navigator.clipboard.writeText(curlCommand);
      setIsCurlCopied(true);
      setTimeout(() => setIsCurlCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy cURL:", error);
    }
  };

  const getLanguage = () => {
    switch (format) {
      case "curl":
        return "shell";
      case "http":
        return "plaintext";
      case "postman":
        return "json";
      default:
        return "plaintext";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-secondary">Format:</label>
          <select
            value={format}
            onChange={(e) => onFormatChange(e.target.value)}
            className="bg-surface-raised/50 border border-base/50 rounded-md px-2 py-1 text-sm text-main focus:outline-none focus:border-primary/50 transition-colors"
          >
            {converters.map((converter) => (
              <option key={converter.id} value={converter.id}>
                {converter.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {format !== "curl" && (
            <button
              onClick={handleCopyCurl}
              className="flex items-center space-x-1 px-2 py-1 bg-surface-raised/50 hover:bg-surface-secondary/50 rounded-md text-sm text-secondary transition-colors"
              title="Copy as cURL"
            >
              <Code size={14} />
              <span>{isCurlCopied ? "Copied!" : "Copy cURL"}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`p-2 rounded-md transition-colors ${isCopied
              ? "text-green-400"
              : "text-muted hover:text-main hover:bg-surface-secondary/50"
              }`}
            title="Copy"
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          <button
            onClick={onShowRequestHistory}
            className="p-2 text-muted hover:text-main hover:bg-surface-secondary/50 rounded-md transition-colors relative"
            title="View request history"
          >
            <History size={14} />
            {requestHistoryCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {requestHistoryCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        className={`border rounded-md overflow-hidden ${isError ? "border-red-500/50" : "border-base/50"}`}
      >
        <Editor
          height="150px"
          language={getLanguage()}
          value={convertedText}
          onChange={handleEditorChange}
          theme={isDarkMode ? "vs-dark" : "vs"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            padding: { top: 8, bottom: 8 },
            readOnly: !getConverter(format)?.parse,
          }}
        />
      </div>

      {isError && (
        <div className="text-sm text-red-400">
          Invalid format. Changes will not be applied to the request.
        </div>
      )}
    </div>
  );
};
