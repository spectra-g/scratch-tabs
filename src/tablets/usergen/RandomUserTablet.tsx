import { useState, useRef, useCallback } from "react";
import { Tablet, TabletState } from "../types";
import { Editor } from "@monaco-editor/react";
import { Users, Copy, RotateCw, Check, ExternalLink } from "lucide-react";
import { useTabletTabCreation } from "../bridge";
import { useThemeStore } from "../../stores/themeStore";

interface GenerationResult {
  timestamp: number;
  format: string;
  content: string;
}

interface RandomUserState extends TabletState {
  type: "usergen";
  data: {
    results: GenerationResult[];
    selectedResult: number;
    params: {
      results: number;
      gender: string;
      nat: string;
      format: string;
    };
  };
}

const NATIONALITIES = [
  { value: "", label: "Any" },
  { value: "au", label: "Australian" },
  { value: "br", label: "Brazilian" },
  { value: "ca", label: "Canadian" },
  { value: "ch", label: "Swiss" },
  { value: "de", label: "German" },
  { value: "dk", label: "Danish" },
  { value: "es", label: "Spanish" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "gb", label: "British" },
  { value: "ie", label: "Irish" },
  { value: "ir", label: "Iranian" },
  { value: "no", label: "Norwegian" },
  { value: "nl", label: "Dutch" },
  { value: "nz", label: "New Zealand" },
  { value: "tr", label: "Turkish" },
  { value: "us", label: "American" },
];

const FORMATS = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "yaml", label: "YAML" },
];

export const RandomUserTablet: Tablet = {
  id: "usergen",
  label: "Random User Generator",
  keywords: ["user", "random", "generator", "fake data", "test data"],

  createInitialState(): RandomUserState {
    return {
      type: "usergen",
      data: {
        results: [],
        selectedResult: -1,
        params: {
          results: 1,
          gender: "",
          nat: "",
          format: "json",
        },
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },

  render(state: RandomUserState, onChange) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [openedResultIndex, setOpenedResultIndex] = useState<number | null>(
      null,
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const { createBackgroundTab } = useTabletTabCreation();
    const [error, setError] = useState<string | null>(null);
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const generateUsers = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        // Build base parameters
        const params = new URLSearchParams();
        if (state.data.params.results > 1) {
          params.append("results", state.data.params.results.toString());
        }
        if (state.data.params.gender) {
          params.append("gender", state.data.params.gender);
        }
        if (state.data.params.nat) {
          params.append("nat", state.data.params.nat);
        }

        let content: string;
        const format = state.data.params.format;

        // First get JSON response
        const jsonResponse = await fetch(
          `https://randomuser.me/api/?${params.toString()}`,
        );
        if (!jsonResponse.ok) {
          throw new Error(`Failed to fetch data: ${jsonResponse.statusText}`);
        }
        const jsonData = await jsonResponse.json();

        // Format the response based on selected format
        if (format === "json") {
          content = JSON.stringify(jsonData, null, 2);
        } else if (format === "csv") {
          content = convertToCSV(jsonData.results);
        } else if (format === "yaml") {
          content = convertToYAML(jsonData);
        } else {
          throw new Error(`Unsupported format: ${format}`);
        }

        const newResult: GenerationResult = {
          timestamp: Date.now(),
          format,
          content,
        };

        onChange({
          ...state,
          data: {
            ...state.data,
            results: [newResult, ...state.data.results],
            selectedResult: 0,
          },
        });
      } catch (error) {
        console.error("Failed to generate users:", error);
        setError(
          error instanceof Error ? error.message : "Failed to generate users",
        );
      } finally {
        setIsGenerating(false);
      }
    };

    const convertToCSV = (users: any[]): string => {
      // Define CSV headers based on user properties
      const headers = [
        "gender",
        "title",
        "first",
        "last",
        "street",
        "city",
        "state",
        "country",
        "postcode",
        "email",
        "phone",
        "cell",
      ];

      // Create CSV header row
      const csvRows = [headers.join(",")];

      // Add data rows
      for (const user of users) {
        const row = [
          user.gender,
          user.name.title,
          user.name.first,
          user.name.last,
          `"${user.location.street.number} ${user.location.street.name}"`,
          user.location.city,
          user.location.state,
          user.location.country,
          user.location.postcode,
          user.email,
          user.phone,
          user.cell,
        ];
        csvRows.push(row.join(","));
      }

      return csvRows.join("\n");
    };

    const convertToYAML = (data: any): string => {
      // Simple YAML conversion function
      const convertValue = (value: any, indent: number = 0): string => {
        const spaces = " ".repeat(indent);

        if (Array.isArray(value)) {
          return value
            .map((item) => `${spaces}- ${convertValue(item, indent + 2)}`)
            .join("\n");
        } else if (typeof value === "object" && value !== null) {
          return (
            "\n" +
            Object.entries(value)
              .map(
                ([key, val]) =>
                  `${spaces}${key}: ${convertValue(val, indent + 2)}`,
              )
              .join("\n")
          );
        } else {
          return String(value);
        }
      };

      return convertValue(data, 0);
    };

    const copyToClipboard = async () => {
      const selectedResult = state.data.results[state.data.selectedResult];
      if (selectedResult) {
        await navigator.clipboard.writeText(selectedResult.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    };

    const selectedIndex = state.data.selectedResult;

    const handleOpenInNewTab = useCallback(
      (index: number) => {
        if (index < 0) return;
        setOpenedResultIndex(index);
        // Remove split view logic for bridge pattern simplicity
        const result = state.data.results[index];
        createBackgroundTab(
          `Random User ${new Date(result.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          result.content,
          result.format
        );
        setTimeout(() => setOpenedResultIndex(null), 1500);
      },
      [
        state.data.results,
        createBackgroundTab,
      ],
    );

    const selectedResult =
      state.data.selectedResult >= 0
        ? state.data.results[state.data.selectedResult]
        : null;

    return (
      <div ref={containerRef} className="h-full bg-canvas flex">
        {/* Left Panel - History */}
        <div className="w-72 border-r border-base flex flex-col">
          <div className="p-4 border-b border-base">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="text-secondary" size={24} />
              <h2 className="text-xl font-semibold text-main">
                Random Users
              </h2>
            </div>

            {/* Parameters */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-main mb-1">
                  Number of Results
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={state.data.params.results}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      data: {
                        ...state.data,
                        params: {
                          ...state.data.params,
                          results: parseInt(e.target.value) || 1,
                        },
                      },
                    })
                  }
                  className="w-full bg-element border border-base rounded-md px-3 py-1.5 text-sm text-main"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-main mb-1">
                  Gender
                </label>
                <select
                  value={state.data.params.gender}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      data: {
                        ...state.data,
                        params: {
                          ...state.data.params,
                          gender: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full bg-element border border-base rounded-md px-3 py-1.5 text-sm text-main"
                >
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-main mb-1">
                  Nationality
                </label>
                <select
                  value={state.data.params.nat}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      data: {
                        ...state.data,
                        params: {
                          ...state.data.params,
                          nat: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full bg-element border border-base rounded-md px-3 py-1.5 text-sm text-main"
                >
                  {NATIONALITIES.map((nat) => (
                    <option key={nat.value} value={nat.value}>
                      {nat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-main mb-1">
                  Format
                </label>
                <select
                  value={state.data.params.format}
                  onChange={(e) =>
                    onChange({
                      ...state,
                      data: {
                        ...state.data,
                        params: {
                          ...state.data.params,
                          format: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full bg-element border border-base rounded-md px-3 py-1.5 text-sm text-main"
                >
                  {FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={generateUsers}
                disabled={isGenerating}
                className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md px-4 py-2 text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <RotateCw
                  size={16}
                  className={isGenerating ? "animate-spin" : ""}
                />
                <span>{isGenerating ? "Generating..." : "Generate"}</span>
              </button>

              {error && (
                <div className="text-sm text-danger mt-2">{error}</div>
              )}
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {state.data.results.length === 0 ? (
              <div className="p-4 text-sm text-secondary">
                No generations yet
              </div>
            ) : (
              <div className="divide-y divide-base">
                {state.data.results.map((result, index) => (
                  <button
                    key={result.timestamp}
                    onClick={() =>
                      onChange({
                        ...state,
                        data: {
                          ...state.data,
                          selectedResult: index,
                        },
                      })
                    }
                    className={`w-full px-4 py-3 text-left hover:bg-element-hover transition-colors ${
                      state.data.selectedResult === index
                        ? "bg-element-hover"
                        : ""
                    }`}
                  >
                    <div className="text-sm font-medium text-main">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      {result.format.toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-base">
            <div className="text-sm text-secondary">
              {selectedResult
                ? new Date(selectedResult.timestamp).toLocaleString()
                : "No result selected"}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={copyToClipboard}
                disabled={!selectedResult}
                className={`p-1 rounded transition-colors ${isCopied ? "text-green-400" : selectedResult ? "text-secondary hover:bg-element-hover" : "text-muted cursor-not-allowed"}`}
                title={isCopied ? "Copied!" : "Copy to clipboard"}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                onClick={() => handleOpenInNewTab(selectedIndex)}
                disabled={!selectedResult}
                className={`p-1 rounded transition-colors ${openedResultIndex === selectedIndex ? "text-green-400" : selectedResult ? "text-secondary hover:bg-element-hover" : "text-muted cursor-not-allowed"}`}
                title={
                  openedResultIndex === selectedIndex
                    ? "Opened"
                    : "Open in new tab"
                }
              >
                {openedResultIndex === selectedIndex ? (
                  <Check size={16} />
                ) : (
                  <ExternalLink size={16} />
                )}
              </button>
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={selectedResult?.format || "plaintext"}
              value={selectedResult?.content || ""}
              theme={isDarkMode ? "vs-dark" : "light"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>
      </div>
    );
  },
};
