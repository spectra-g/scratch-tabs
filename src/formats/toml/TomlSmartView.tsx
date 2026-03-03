import React, { useMemo } from "react";
import { AlertCircle } from "../../components/Icons";
import { TomlSmartViewProps, TomlValidationError } from "./types";

const validateTomlContent = (content: string): TomlValidationError | null => {
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[") || line.startsWith("[[")) {
      if (!line.endsWith("]")) {
        return {
          message: `Malformed table header on line ${index + 1}.`,
        };
      }
      continue;
    }

    if (!line.includes("=")) {
      return {
        message: `Expected key/value pair on line ${index + 1}.`,
      };
    }
  }

  return null;
};

export const TomlSmartView: React.FC<TomlSmartViewProps> = ({
  content,
  tabId,
  side,
}) => {
  const validationError = useMemo(() => validateTomlContent(content), [content]);

  if (validationError) {
    return (
      <div
        className="h-full bg-surface text-main p-4"
        data-testid="toml-smart-view"
        key={`toml-view-${tabId}-${side}`}
      >
        <div
          className="flex items-start gap-2 rounded border border-danger/40 bg-danger/10 p-3 text-danger"
          data-testid="toml-smart-view-error"
        >
          <AlertCircle size={16} />
          <div>
            <div className="font-medium">TOML parse error</div>
            <div className="text-sm">{validationError.message}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full bg-surface text-main p-4"
      data-testid="toml-smart-view"
      key={`toml-view-${tabId}-${side}`}
    >
      <div
        className="h-full rounded border border-base bg-surface-secondary p-4"
        data-testid="toml-structured-placeholder"
      >
        <h3 className="text-sm font-medium">Structured TOML editor coming soon</h3>
        <p className="mt-2 text-xs text-secondary">
          This smart view boundary is wired for TOML and ready for parser-backed
          structured editing in the next story.
        </p>
      </div>
    </div>
  );
};

