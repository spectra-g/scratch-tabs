import React, { useState } from "react";
import { X, Copy, Check, Code } from "lucide-react";
import { CronDialect } from "../types";
import { getCronCodeSnippets } from "../utils/codeSnippets";

interface CronCodeExporterProps {
  expression: string;
  dialect: CronDialect;
  onClose: () => void;
}

export const CronCodeExporter: React.FC<CronCodeExporterProps> = ({
  expression,
  dialect,
  onClose,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [selectedFramework, setSelectedFramework] = useState("node-cron");
  const [copied, setCopied] = useState(false);

  const snippets = getCronCodeSnippets(expression, dialect);

  // Get available languages
  const languages = Array.from(
    new Set(snippets.map((snippet) => snippet.language)),
  );

  // Get available frameworks for selected language
  const frameworks = snippets
    .filter((snippet) => snippet.language === selectedLanguage)
    .map((snippet) => ({ value: snippet.framework, label: snippet.framework }));

  // Get selected snippet
  const selectedSnippet = snippets.find(
    (snippet) =>
      snippet.language === selectedLanguage &&
      snippet.framework === selectedFramework,
  );

  const handleCopy = () => {
    if (selectedSnippet) {
      navigator.clipboard.writeText(selectedSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface border border-base rounded-lg shadow-xl max-w-3xl w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-base bg-surface-secondary">
          <div className="flex items-center">
            <Code size={20} className="text-primary mr-2" />
            <h2 className="text-lg font-medium text-main">Code Snippets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div>
              <label className="block text-xs text-secondary mb-1">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  // Reset framework when language changes
                  const firstFramework = snippets.find(
                    (s) => s.language === e.target.value,
                  )?.framework;
                  if (firstFramework) {
                    setSelectedFramework(firstFramework);
                  }
                }}
                className="input-themed bg-surface text-main text-sm"
              >
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language.charAt(0).toUpperCase() + language.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1">
                Framework/Library
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="input-themed bg-surface text-main text-sm"
              >
                {frameworks.map((framework) => (
                  <option key={framework.value} value={framework.value}>
                    {framework.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:ml-auto">
              <button
                onClick={handleCopy}
                className="flex items-center bg-primary/20 text-primary hover:bg-primary/30 px-3 py-2 rounded-md text-sm transition-colors border border-primary/30"
              >
                {copied ? (
                  <Check size={16} className="mr-2 text-success" />
                ) : (
                  <Copy size={16} className="mr-2" />
                )}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>
          </div>

          {selectedSnippet?.installCommand && (
            <div className="mb-4">
              <label className="block text-xs text-secondary mb-1">
                Installation
              </label>
              <div className="bg-surface-secondary border border-base rounded-md p-3 font-mono text-sm text-main overflow-x-auto">
                {selectedSnippet.installCommand}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-secondary mb-1">
              Code Snippet
            </label>
            <pre className="bg-surface-secondary border border-base rounded-md p-3 font-mono text-sm text-main overflow-x-auto max-h-96 custom-scrollbar">
              {selectedSnippet?.code || "No code available for this selection."}
            </pre>
          </div>

          {selectedSnippet?.description && (
            <div className="mt-4 p-3 bg-surface-secondary border border-base rounded-md">
              <p className="text-sm text-secondary">
                {selectedSnippet.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
