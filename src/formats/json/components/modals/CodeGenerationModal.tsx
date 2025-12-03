import React, { useState } from "react";
import { BaseModal } from "./BaseModal";
import { Editor } from "@monaco-editor/react";
import { Tab } from "../../../../types";
import { Copy, ExternalLink, Check } from "lucide-react";
import { useWorkspaceStore } from "../../../../stores/workspaceStore";
import { useThemeStore } from "../../../../stores/themeStore";

interface CodeTab {
  id: string;
  title: string;
  content: string;
  language: string;
}

interface CodeGenerationModalProps {
  tabs: CodeTab[];
  onClose: () => void;
  addTab: (tab: Tab) => void;
}

export const CodeGenerationModal: React.FC<CodeGenerationModalProps> = ({
  tabs,
  onClose,
  addTab,
}) => {
  // Initialize activeTabId only once using a function form
  const [activeTabId, setActiveTabId] = useState<string>(
    () => tabs[0]?.id || "",
  );
  const [copiedTabId, setCopiedTabId] = useState<string | null>(null);
  const [openedTabId, setOpenedTabId] = useState<string | null>(null);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { isDarkMode } = useThemeStore();

  const handleCopyContent = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    await navigator.clipboard.writeText(tab.content);
    setCopiedTabId(tabId);
    setTimeout(() => {
      setCopiedTabId(null);
    }, 1500);
  };

  const handleOpenInNewTab = (tab: CodeTab) => {
    // Set animation state
    setOpenedTabId(tab.id);

    // Create new tab in next tick to allow animation state to be visible
    Promise.resolve().then(() => {
      addTab({
        id: crypto.randomUUID(),
        title: tab.title,
        content: tab.content,
        language: tab.language,
        languageLocked: true,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        workspaceId: activeWorkspaceId || "",
      });
    });

    // Clear animation after standard duration
    setTimeout(() => {
      setOpenedTabId(null);
    }, 1500);
  };

  // Memoize the active tab to prevent unnecessary re-renders
  const activeTab = React.useMemo(
    () => tabs.find((t) => t.id === activeTabId),
    [tabs, activeTabId],
  );

  // Safeguard for large content in generated code
  const displayContent = React.useMemo(() => {
    if (!activeTab?.content) return "";

    // If content is very large, truncate it for display
    if (activeTab.content.length > 100000) {
      return (
        activeTab.content.substring(0, 50000) +
        "\n\n... [Content truncated for performance] ..."
      );
    }

    return activeTab.content;
  }, [activeTab?.content]);

  return (
    <BaseModal title="Generated Code" onClose={onClose}>
      <div className="flex flex-col h-[70vh]">
        <div className="flex flex-row justify-between">
          {/* Tabs */}
          <div className="flex space-x-1 bg-surface p-2 rounded-t-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                }}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    activeTabId === tab.id
                      ? "bg-element text-main"
                      : "text-secondary hover:bg-element-hover"
                  }
                `}
              >
                {tab.title}
              </button>
            ))}
          </div>
          {activeTab && (
            <div className="flex items-center justify-end space-x-2 px-4 py-2">
              <button
                onClick={() => handleCopyContent(activeTab.id)}
                className={`p-2 rounded-md transition-colors ${copiedTabId === activeTab.id ? "text-success" : "text-secondary hover:text-main hover:bg-element-hover"}`}
                title="Copy to clipboard"
              >
                {copiedTabId === activeTab.id ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
              <button
                onClick={() => handleOpenInNewTab(activeTab)}
                className={`p-2 rounded-md transition-colors ${openedTabId === activeTab.id ? "text-success" : "text-secondary hover:text-main hover:bg-element-hover"}`}
                title="Open in new tab"
              >
                {openedTabId === activeTab.id ? (
                  <Check size={16} />
                ) : (
                  <ExternalLink size={16} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 bg-surface rounded-b-lg overflow-hidden">
          {activeTab && (
            <div className="h-full flex flex-col">
              {/* Editor */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={activeTab.language}
                  value={displayContent}
                  theme={isDarkMode ? "vs-dark" : "vs"}
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
          )}
        </div>
      </div>
    </BaseModal>
  );
};
