import React from "react";
import {
  Bold,
  Italic,
  Code,
  List,
  Link,
  BookOpen,
  Eye,
  EyeOff,
  Undo,
  Redo,
  Hash,
  Table,
  ListOrdered,
  Quote,
  Minus,
} from "lucide-react";

interface FormattingToolbarProps {
  onFormat: (format: string) => void;
  onToggleInsertPanel?: () => void;
  onTogglePreview?: () => void;
  isInsertPanelOpen?: boolean;
  isPreviewMode?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  onFormat,
  onToggleInsertPanel,
  onTogglePreview,
  isInsertPanelOpen,
  isPreviewMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const formatButtons = [
    {
      icon: Bold,
      format: "bold",
      title: "Bold (Ctrl+B)",
      markdown: "**text**",
    },
    {
      icon: Italic,
      format: "italic",
      title: "Italic (Ctrl+I)",
      markdown: "*text*",
    },
    {
      icon: Code,
      format: "inline-code",
      title: "Inline Code",
      markdown: "`code`",
    },
    {
      icon: List,
      format: "bullet-list",
      title: "Bullet List",
      markdown: "- item",
    },
    {
      icon: ListOrdered,
      format: "numbered-list",
      title: "Numbered List",
      markdown: "1. item",
    },
    {
      icon: Link,
      format: "link",
      title: "Hyperlink",
      markdown: "[text](url)",
    },
    {
      icon: Quote,
      format: "quote",
      title: "Blockquote",
      markdown: "> quote",
    },
    {
      icon: Minus,
      format: "hr",
      title: "Horizontal Rule",
      markdown: "---",
    },
  ];

  const headerButtons = [
    {
      icon: Hash,
      format: "h1",
      title: "Heading 1",
      markdown: "# Heading 1",
    },
    {
      icon: Hash,
      format: "h2",
      title: "Heading 2",
      markdown: "## Heading 2",
    },
    {
      icon: Hash,
      format: "h3",
      title: "Heading 3",
      markdown: "### Heading 3",
    },
  ];

  const codeButtons = [
    {
      icon: Code,
      format: "code-block",
      title: "Code Block",
      markdown: "```\ncode block\n```",
    },
    {
      icon: Table,
      format: "table",
      title: "Table",
      markdown:
        "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |",
    },
  ];

  return (
    <div className="flex items-center justify-between p-2 bg-gray-800/50 border-b border-gray-700/50">
      <div className="flex items-center space-x-1">
        {/* Undo/Redo buttons */}
        {onUndo && onRedo && (
          <>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${
                canUndo
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  : "text-gray-600 cursor-not-allowed"
              }`}
              title="Undo"
            >
              <Undo size={14} />
            </button>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  : "text-gray-600 cursor-not-allowed"
              }`}
              title="Redo"
            >
              <Redo size={14} />
            </button>

            <div className="w-px h-4 bg-gray-700/50 mx-1" />
          </>
        )}

        <span className="text-xs text-gray-400 mr-2">Format:</span>
        {formatButtons.map((button) => (
          <button
            key={button.format}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            onClick={() => onFormat(button.markdown)}
            title={button.title}
          >
            <button.icon size={14} />
          </button>
        ))}

        <div className="w-px h-4 bg-gray-700/50 mx-1" />

        <span className="text-xs text-gray-400 mr-2">Headers:</span>
        {headerButtons.map((button) => (
          <button
            key={button.format}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            onClick={() => onFormat(button.markdown)}
            title={button.title}
          >
            <button.icon size={14} />
          </button>
        ))}

        <div className="w-px h-4 bg-gray-700/50 mx-1" />

        <span className="text-xs text-gray-400 mr-2">Code:</span>
        {codeButtons.map((button) => (
          <button
            key={button.format}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            onClick={() => onFormat(button.markdown)}
            title={button.title}
          >
            <button.icon size={14} />
          </button>
        ))}
      </div>

      <div className="flex items-center space-x-1">
        {onTogglePreview && (
          <button
            className={`p-1.5 rounded transition-colors ${
              isPreviewMode
                ? "text-blue-400 bg-blue-600/20"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            onClick={onTogglePreview}
            title={
              isPreviewMode ? "Switch to raw mode" : "Switch to preview mode"
            }
          >
            {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}

        {onToggleInsertPanel && (
          <button
            className={`p-1.5 rounded transition-colors ${
              isInsertPanelOpen
                ? "text-blue-400 bg-blue-600/20"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            onClick={onToggleInsertPanel}
            title={
              isInsertPanelOpen
                ? "Close insertion panel"
                : "Open insertion panel"
            }
          >
            <BookOpen size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
