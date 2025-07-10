import React, { useState, useEffect, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  FileCode,
  Wand2,
  Upload,
  DownloadCloud,
  Copy,
  Check,
} from "lucide-react";
import { MappingConfig, MappingRule, PathInfo } from "../types";
import { MappingTable } from "./MappingTable";
import {
  extractPaths,
  isValidJson,
  formatJson,
  jsonPathToReadablePath,
} from "../utils/jsonUtils";
import {
  suggestMappings,
  createRulesFromSuggestions,
  validateRules,
} from "../utils/mappingUtils";
import { readFileAsText } from "../utils/fileUtils";

interface MappingEditorProps {
  mapping: MappingConfig;
  isNew: boolean;
  onSave: (mapping: MappingConfig) => void;
  onCancel: () => void;
  onTest: (mapping: MappingConfig) => void;
  onGenerateCode: (mapping: MappingConfig) => void;
}

export const MappingEditor: React.FC<MappingEditorProps> = ({
  mapping,
  isNew,
  onSave,
  onCancel,
  onTest,
  onGenerateCode,
}) => {
  const [name, setName] = useState(mapping.name);
  const [description, setDescription] = useState(mapping.description);
  const [sourceJson, setSourceJson] = useState(mapping.sourceJson);
  const [targetJson, setTargetJson] = useState(mapping.targetJson);
  const [rules, setRules] = useState<MappingRule[]>(mapping.rules);
  const [sourceJsonError, setSourceJsonError] = useState<string | null>(null);
  const [targetJsonError, setTargetJsonError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSortedRules, setCurrentSortedRules] = useState<MappingRule[]>(
    mapping.rules,
  );
  const [sourceCopied, setSourceCopied] = useState(false);
  const [targetCopied, setTargetCopied] = useState(false);

  // Validate JSON when it changes
  useEffect(() => {
    if (sourceJson) {
      try {
        JSON.parse(sourceJson);
        setSourceJsonError(null);
      } catch (error) {
        setSourceJsonError("Invalid JSON");
      }
    } else {
      setSourceJsonError(null);
    }
  }, [sourceJson]);

  useEffect(() => {
    if (targetJson) {
      try {
        JSON.parse(targetJson);
        setTargetJsonError(null);
      } catch (error) {
        setTargetJsonError("Invalid JSON");
      }
    } else {
      setTargetJsonError(null);
    }
  }, [targetJson]);

  const handleSortedRulesChange = useCallback((sortedRules: MappingRule[]) => {
    setCurrentSortedRules(sortedRules);
  }, []);

  const handleExportRulesToCsv = () => {
    if (currentSortedRules.length === 0) {
      alert("No rules to export.");
      return;
    }

    const headers = [
      "ID",
      "Source Path (Readable)",
      "Target Path (Readable)",
      "Source Path (JSONPath)",
      "Target Path (JSONPath)",
      "Transformation Type",
      "Transformation Script/Details",
      "Source Data Type",
      "Target Data Type",
      "Status",
      "Confidence",
      "User Defined",
    ];

    const csvRows = [headers.join(",")];

    // Use sorted rules instead of original rules
    currentSortedRules.forEach((rule) => {
      const row = [
        `"${rule.id}"`,
        `"${jsonPathToReadablePath(rule.sourcePath)}"`,
        `"${jsonPathToReadablePath(rule.targetPath)}"`,
        `"${rule.sourcePath}"`,
        `"${rule.targetPath}"`,
        `"${rule.transformationType}"`,
        `"${rule.transformation.replace(/"/g, '""')}"`, // Escape double quotes in transformation script
        `"${rule.sourceDataType}"`,
        `"${rule.targetDataType}"`,
        `"${rule.status}"`,
        `${rule.confidence}`,
        `${rule.isUserDefined}`,
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const filename = `${name.trim().replace(/\s+/g, "_") || "mapping"}_rules.csv`;

    // Create and trigger download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSourceJsonChange = (value: string | undefined) => {
    setSourceJson(value || "");
  };

  const handleTargetJsonChange = (value: string | undefined) => {
    setTargetJson(value || "");
  };

  const handleLoadSourceFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      if (isValidJson(content)) {
        setSourceJson(formatJson(content));
        setSourceJsonError(null);
      } else {
        setSourceJsonError("Invalid JSON file");
      }
    } catch (error) {
      setSourceJsonError("Error reading file");
    }

    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const handleLoadTargetFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      if (isValidJson(content)) {
        setTargetJson(formatJson(content));
        setTargetJsonError(null);
      } else {
        setTargetJsonError("Invalid JSON file");
      }
    } catch (error) {
      setTargetJsonError("Error reading file");
    }

    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const handleCopySource = async () => {
    if (!sourceJson) return;

    try {
      await navigator.clipboard.writeText(sourceJson);
      setSourceCopied(true);
      setTimeout(() => setSourceCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy source JSON:", error);
    }
  };

  const handleCopyTarget = async () => {
    if (!targetJson) return;

    try {
      await navigator.clipboard.writeText(targetJson);
      setTargetCopied(true);
      setTimeout(() => setTargetCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy target JSON:", error);
    }
  };

  const handleAnalyzeAndSuggest = async () => {
    if (!sourceJson || sourceJsonError) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const sourceData = JSON.parse(sourceJson);
      const sourcePaths = extractPaths(sourceData, "$", {
        optimizeArrays: true,
      });

      let targetPaths: PathInfo[] = [];
      if (targetJson && !targetJsonError) {
        const targetData = JSON.parse(targetJson);
        targetPaths = extractPaths(targetData, "$", { optimizeArrays: true });
      }

      // If we have both source and target, suggest mappings
      if (targetPaths.length > 0) {
        const suggestions = suggestMappings(sourcePaths, targetPaths);
        const newRules = createRulesFromSuggestions(suggestions);

        // Merge with existing rules, preserving user-defined ones
        const existingRuleMap = new Map<string, MappingRule>();
        rules.forEach((rule) => {
          if (rule.isUserDefined) {
            existingRuleMap.set(rule.sourcePath, rule);
          }
        });

        // Check for better confidence scores in new mappings compared to existing ones
        const updatedExistingRules = [...rules];
        newRules.forEach((newRule) => {
          // Find existing non-user-defined rule with the same source path
          const existingRuleIndex = updatedExistingRules.findIndex(
            (r) => !r.isUserDefined && r.sourcePath === newRule.sourcePath,
          );

          if (existingRuleIndex >= 0) {
            const existingRule = updatedExistingRules[existingRuleIndex];
            // If new rule has better confidence, update the existing rule
            if (newRule.confidence > existingRule.confidence) {
              updatedExistingRules[existingRuleIndex] = {
                ...existingRule,
                targetPath: newRule.targetPath,
                confidence: newRule.confidence,
                sourceDataType: newRule.sourceDataType,
                targetDataType: newRule.targetDataType,
                status: "mapped",
              };
            }
          } else if (!existingRuleMap.has(newRule.sourcePath)) {
            // Add new rule if it doesn't exist and isn't user-defined
            updatedExistingRules.push(newRule);
          }
        });

        // Filter out any rules that have array indices in the source path
        // but there's already a wildcard rule for the same path pattern
        const finalRules = updatedExistingRules.filter((rule) => {
          // Skip filtering for user-defined rules
          if (rule.isUserDefined) return true;

          // Check if this is an indexed array path
          const indexMatch = rule.sourcePath.match(/\[(\d+)\]/);
          if (indexMatch) {
            // Create the wildcard version of this path
            const wildcardPath = rule.sourcePath.replace(/\[\d+\]/g, "[*]");

            // Check if a wildcard version already exists with better or equal confidence
            const wildcardRule = updatedExistingRules.find(
              (r) =>
                r.sourcePath === wildcardPath &&
                r.confidence >= rule.confidence,
            );

            return !wildcardRule; // Keep only if no wildcard rule exists
          }
          return true; // Keep all non-array-index rules
        });

        // Add any unmapped source paths
        const mappedSourcePaths = new Set(
          finalRules.map((rule) => rule.sourcePath),
        );
        const unmappedSourcePaths = sourcePaths.filter(
          (p) =>
            p.type !== "array" &&
            p.type !== "object" &&
            !mappedSourcePaths.has(p.path),
        );

        const unmappedRules = unmappedSourcePaths.map((path) => ({
          id: crypto.randomUUID(),
          sourcePath: path.path,
          targetPath: "",
          transformationType: "none" as const,
          transformation: "",
          sourceDataType: path.type,
          targetDataType: "unknown" as const,
          status: "unmapped" as const,
          confidence: 0,
          isUserDefined: false,
        }));

        setRules([...finalRules, ...unmappedRules]);
      } else {
        // If we only have source, create unmapped rules for all source paths
        const sourceLeafPaths = sourcePaths.filter(
          (p) => p.type !== "array" && p.type !== "object",
        );

        const newRules = sourceLeafPaths.map((path) => ({
          id: crypto.randomUUID(),
          sourcePath: path.path,
          targetPath: "",
          transformationType: "none" as const,
          transformation: "",
          sourceDataType: path.type,
          targetDataType: "unknown" as const,
          status: "unmapped" as const,
          confidence: 0,
          isUserDefined: false,
        }));

        setRules(newRules);
      }
    } catch (error) {
      console.error("Error analyzing JSON:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddRule = () => {
    const newRule: MappingRule = {
      id: crypto.randomUUID(),
      sourcePath: "",
      targetPath: "",
      transformationType: "none",
      transformation: "",
      sourceDataType: "unknown",
      targetDataType: "unknown",
      status: "unmapped",
      confidence: 0,
      isUserDefined: true,
    };

    setRules([...rules, newRule]);
  };

  const handleUpdateRule = (updatedRule: MappingRule) => {
    setRules(
      rules.map((rule) =>
        rule.id === updatedRule.id
          ? { ...updatedRule, isUserDefined: true }
          : rule,
      ),
    );
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((rule) => rule.id !== id));
  };

  const handleIgnoreRule = (id: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              status: rule.status === "ignored" ? "unmapped" : "ignored",
            }
          : rule,
      ),
    );
  };

  const handleClearRule = (id: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              targetPath: "",
              transformationType: "none" as const,
              transformation: "",
              targetDataType: "unknown" as const,
              status: "unmapped" as const,
              confidence: 0,
              isUserDefined: true,
            }
          : rule,
      ),
    );
  };

  const handleReEvaluateRule = (id: string) => {
    if (!sourceJson || !targetJson || sourceJsonError || targetJsonError) {
      return;
    }

    try {
      const sourceData = JSON.parse(sourceJson);
      const targetData = JSON.parse(targetJson);

      const rule = rules.find((r) => r.id === id);
      if (!rule) return;

      // If the rule has been cleared (empty targetPath), re-run mapping suggestions
      if (!rule.targetPath || rule.targetPath === "") {
        const sourcePaths = extractPaths(sourceData, "$", {
          optimizeArrays: true,
        });
        const targetPaths = extractPaths(targetData, "$", {
          optimizeArrays: true,
        });

        // Find the source path info for this rule
        const sourcePathInfo = sourcePaths.find(
          (p) => p.path === rule.sourcePath,
        );
        if (sourcePathInfo) {
          const suggestions = suggestMappings([sourcePathInfo], targetPaths);
          const newRules = createRulesFromSuggestions(suggestions);

          if (newRules.length > 0) {
            // Update the rule with the best suggestion
            const bestSuggestion = newRules[0];
            const updatedRule = {
              ...rule,
              targetPath: bestSuggestion.targetPath,
              transformationType: bestSuggestion.transformationType,
              transformation: bestSuggestion.transformation,
              targetDataType: bestSuggestion.targetDataType,
              status: bestSuggestion.status,
              confidence: bestSuggestion.confidence,
              isUserDefined: true,
            };

            setRules(rules.map((r) => (r.id === id ? updatedRule : r)));
          } else {
            // No suggestions found, keep as unmapped
            const updatedRule = {
              ...rule,
              status: "unmapped" as const,
              isUserDefined: true,
            };

            setRules(rules.map((r) => (r.id === id ? updatedRule : r)));
          }
        }
      } else {
        // Normal validation for rules with target paths
        const updatedRules = validateRules([rule], sourceData, targetData);
        setRules(rules.map((r) => (r.id === id ? updatedRules[0] : r)));
      }
    } catch (error) {
      console.error("Error re-evaluating rule:", error);
    }
  };

  const handleReEvaluateAll = () => {
    if (!sourceJson || !targetJson || sourceJsonError || targetJsonError) {
      return;
    }

    try {
      const sourceData = JSON.parse(sourceJson);
      const targetData = JSON.parse(targetJson);

      const updatedRules = validateRules(rules, sourceData, targetData);
      setRules(updatedRules);
    } catch (error) {
      console.error("Error re-evaluating all rules:", error);
    }
  };

  const handleClearAllRules = () => {
    setRules([]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a name for the mapping");
      return;
    }

    if (!sourceJson || sourceJsonError) {
      alert("Please enter valid source JSON");
      return;
    }

    const updatedMapping: MappingConfig = {
      ...mapping,
      name: name.trim(),
      description: description.trim(),
      sourceJson,
      targetJson,
      rules,
      updatedAt: Date.now(),
    };

    onSave(updatedMapping);
  };

  const handleTest = () => {
    if (!name.trim() || !sourceJson || sourceJsonError) {
      alert("Please enter a name and valid source JSON");
      return;
    }

    const updatedMapping: MappingConfig = {
      ...mapping,
      name: name.trim(),
      description: description.trim(),
      sourceJson,
      targetJson,
      rules,
      updatedAt: Date.now(),
    };

    onTest(updatedMapping);
  };

  const handleGenerateCode = () => {
    if (!name.trim() || !sourceJson || sourceJsonError) {
      alert("Please enter a name and valid source JSON");
      return;
    }

    const updatedMapping: MappingConfig = {
      ...mapping,
      name: name.trim(),
      description: description.trim(),
      sourceJson,
      targetJson,
      rules,
      updatedAt: Date.now(),
    };

    onGenerateCode(updatedMapping);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-700/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
              title="Back to mappings"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold text-gray-100">
              {isNew ? "Create Mapping" : "Edit Mapping"}
            </h2>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleTest}
              className="flex text-sm items-center space-x-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 transition-colors"
              disabled={!sourceJson || !!sourceJsonError}
            >
              <Play size={14} />
              <span>Test</span>
            </button>
            <button
              onClick={handleGenerateCode}
              className="flex text-sm items-center space-x-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors"
              disabled={!sourceJson || !!sourceJsonError}
            >
              <FileCode size={14} />
              <span>Generate Code</span>
            </button>
            <button
              onClick={handleExportRulesToCsv}
              className="flex text-sm items-center space-x-2 px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-md hover:bg-teal-500/30 transition-colors"
              title="Export rules to CSV"
              disabled={rules.length === 0}
            >
              <DownloadCloud size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleSave}
              className="flex text-sm items-center space-x-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
            >
              <Save size={14} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <div className="space-y-6">
          {/* Mapping Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mapping Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="Enter mapping name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="Enter description..."
              />
            </div>
          </div>

          {/* JSON Editors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source JSON */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Source JSON
                </label>
                <div className="flex space-x-2">
                  <label className="flex items-center space-x-2 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-xs text-gray-300 transition-colors cursor-pointer">
                    <Upload size={14} />
                    <span>Load File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleLoadSourceFile}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleCopySource}
                    disabled={!sourceJson}
                    className="flex items-center space-x-2 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs text-gray-300 transition-colors"
                  >
                    {sourceCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{sourceCopied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
              <div
                className={`border rounded-md overflow-hidden ${sourceJsonError ? "border-red-500/50" : "border-gray-700/50"}`}
              >
                <Editor
                  height="300px"
                  language="json"
                  value={sourceJson}
                  onChange={handleSourceJsonChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
              {sourceJsonError && (
                <p className="mt-1 text-xs text-red-400">{sourceJsonError}</p>
              )}
            </div>

            {/* Target JSON */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  What should the target JSON look like?
                </label>
                <div className="flex space-x-2">
                  <label className="flex items-center space-x-2 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-xs text-gray-300 transition-colors cursor-pointer">
                    <Upload size={14} />
                    <span>Load File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleLoadTargetFile}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleCopyTarget}
                    disabled={!targetJson}
                    className="flex items-center space-x-2 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs text-gray-300 transition-colors"
                  >
                    {targetCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{targetCopied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
              <div
                className={`border rounded-md overflow-hidden ${targetJsonError ? "border-red-500/50" : "border-gray-700/50"}`}
              >
                <Editor
                  height="300px"
                  language="json"
                  value={targetJson}
                  onChange={handleTargetJsonChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
              {targetJsonError && (
                <p className="mt-1 text-xs text-red-400">{targetJsonError}</p>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalyzeAndSuggest}
              disabled={!sourceJson || !!sourceJsonError || isAnalyzing}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                ${
                  !sourceJson || !!sourceJsonError || isAnalyzing
                    ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                }
                transition-colors
              `}
            >
              <Wand2 size={14} className={isAnalyzing ? "animate-spin" : ""} />
              <span>
                {isAnalyzing ? "Analyzing..." : "Analyze & Suggest Mappings"}
              </span>
            </button>
          </div>

          {/* Mapping Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-300">
                Mapping Rules
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleAddRule}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-xs text-gray-300 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Rule</span>
                </button>
                <button
                  onClick={handleReEvaluateAll}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-xs text-gray-300 transition-colors"
                  disabled={
                    !sourceJson ||
                    !targetJson ||
                    !!sourceJsonError ||
                    !!targetJsonError
                  }
                >
                  <Wand2 size={14} />
                  <span>Re-evaluate All</span>
                </button>
                <button
                  onClick={handleClearAllRules}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-xs text-gray-300 transition-colors"
                  disabled={rules.length === 0}
                >
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            <MappingTable
              rules={rules}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
              onIgnoreRule={handleIgnoreRule}
              onReEvaluateRule={handleReEvaluateRule}
              onClearRule={handleClearRule}
              sourceJson={sourceJson}
              targetJson={targetJson}
              onSortedRulesChange={handleSortedRulesChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
