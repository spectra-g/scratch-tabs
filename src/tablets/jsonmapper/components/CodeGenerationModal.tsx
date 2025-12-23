import React, { useState } from "react";
import { Editor } from "@monaco-editor/react";
import { X, Copy, Check, Download } from "lucide-react";
import { useThemeStore } from "../../../stores/themeStore";
import { MappingConfig, MappingDirection, TargetLanguage } from "../types";
import { generateCode } from "../utils/mappingUtils";
import { downloadStringAsFile } from "../utils/fileUtils";

interface CodeGenerationModalProps {
  mapping: MappingConfig;
  onClose: () => void;
  initialLanguage?: TargetLanguage;
  initialDirection?: MappingDirection;
}

export const CodeGenerationModal: React.FC<CodeGenerationModalProps> = ({
  mapping,
  onClose,
  initialLanguage = "javascript",
  initialDirection = "sourceToTarget",
}) => {
  const { isDarkMode } = useThemeStore();
  const [language, setLanguage] = useState<TargetLanguage>(initialLanguage);
  const [direction, setDirection] =
    useState<MappingDirection>(initialDirection);
  const [code, setCode] = useState(() =>
    generateCode(mapping.rules, initialLanguage, initialDirection),
  );
  const [isCopied, setIsCopied] = useState(false);

  const handleLanguageChange = (newLanguage: TargetLanguage) => {
    setLanguage(newLanguage);
    setCode(generateCode(mapping.rules, newLanguage, direction));
  };

  const handleDirectionChange = (newDirection: MappingDirection) => {
    setDirection(newDirection);
    setCode(generateCode(mapping.rules, language, newDirection));
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const extension =
      language === "javascript"
        ? "js"
        : language === "typescript"
          ? "ts"
          : language === "python"
            ? "py"
            : "java";

    const filename = `${mapping.name.replace(/\s+/g, "_")}_${direction}_mapper.${extension}`;
    downloadStringAsFile(code, filename);
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-[95vw] max-w-[1600px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base">
          <h2 className="text-xl font-semibold text-main">
            Generate Code: {mapping.name}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-main transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Target Language
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleLanguageChange("javascript")}
                    className={`
                      px-3 py-1.5 rounded-md text-sm
                      ${language === "javascript"
                        ? "bg-info-subtle text-info"
                        : "bg-surface-secondary text-secondary hover:bg-element-hover"
                      }
                      transition-colors
                    `}
                  >
                    JavaScript
                  </button>
                  <button
                    onClick={() => handleLanguageChange("typescript")}
                    className={`
                      px-3 py-1.5 rounded-md text-sm
                      ${language === "typescript"
                        ? "bg-info-subtle text-info"
                        : "bg-surface-secondary text-secondary hover:bg-element-hover"
                      }
                      transition-colors
                    `}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => handleLanguageChange("python")}
                    className={`
                      px-3 py-1.5 rounded-md text-sm
                      ${language === "python"
                        ? "bg-info-subtle text-info"
                        : "bg-surface-secondary text-secondary hover:bg-element-hover"
                      }
                      transition-colors
                    `}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => handleLanguageChange("java")}
                    className={`
                      px-3 py-1.5 rounded-md text-sm
                      ${language === "java"
                        ? "bg-info-subtle text-info"
                        : "bg-surface-secondary text-secondary hover:bg-element-hover"
                      }
                      transition-colors
                    `}
                  >
                    Java
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Transformation Direction
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDirectionChange("sourceToTarget")}
                    className={`
                      px-3 py-1.5 rounded-md text-sm
                      ${direction === "sourceToTarget"
                        ? "bg-info-subtle text-info"
                        : "bg-surface-secondary text-secondary hover:bg-element-hover"
                      }
                      transition-colors
                    `}
                  >
                    Source to Target
                  </button>
                  <button
                    onClick={() => handleDirectionChange("targetToSource")}
                    className={`
                      px-3 py-1.5 rounded-md text-sm
                      ${direction === "targetToSource"
                        ? "bg-info-subtle text-info"
                        : "bg-surface-secondary text-secondary hover:bg-element-hover"
                      }
                      transition-colors
                    `}
                  >
                    Target to Source
                  </button>
                </div>
              </div>
            </div>

            {/* Code Editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-secondary">
                  Generated Code
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-surface-secondary hover:bg-element-hover rounded-md text-sm text-secondary transition-colors"
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{isCopied ? "Copied!" : "Copy"}</span>
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-surface-secondary hover:bg-element-hover rounded-md text-sm text-secondary transition-colors"
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className="border border-base rounded-md overflow-hidden">
                <Editor
                  height="500px"
                  language={language === "java" ? "java" : language}
                  value={code}
                  theme={isDarkMode ? "vs-dark" : "vs"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    padding: { top: 8, bottom: 8 },
                    readOnly: true,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
