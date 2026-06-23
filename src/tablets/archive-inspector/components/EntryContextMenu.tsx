import React, { useEffect, useRef } from "react";
import {
  Eye,
  ExternalLink,
  Copy,
  Download,
  FolderOpen,
  Archive,
} from "../../../components/Icons";
import { ArchiveEntry } from "../types";

interface EntryContextMenuProps {
  entry: ArchiveEntry;
  position: { x: number; y: number };
  onClose: () => void;
  onPreview: () => void;
  onOpenInNewTab: () => void;
  onCopyPath: () => void;
  onCopyContent: () => void;
  onExtractFile: () => void;
  onExtractSubtree?: () => void;
  onInspectNested?: () => void;
  copiedId: string | null;
  isCurrentlyPreviewed?: boolean;
}

const ARCHIVE_EXTS = new Set(["zip", "jar", "war", "ear", "apk", "ipa", "epub", "docx", "xlsx", "pptx"]);

function isNestedArchive(entry: ArchiveEntry): boolean {
  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  return !entry.isDirectory && ARCHIVE_EXTS.has(ext);
}

export const EntryContextMenu: React.FC<EntryContextMenuProps> = ({
  entry,
  position,
  onClose,
  onPreview,
  onOpenInNewTab,
  onCopyPath,
  onCopyContent,
  onExtractFile,
  onExtractSubtree,
  onInspectNested,
  copiedId,
  isCurrentlyPreviewed = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const items = [
    { id: "preview", label: "Preview", icon: Eye, action: onPreview, hidden: entry.isDirectory },
    { id: "new-tab", label: "Open in New Tab", icon: ExternalLink, action: onOpenInNewTab, hidden: entry.isDirectory || !isCurrentlyPreviewed },
    { id: "copy-path", label: copiedId === "path" ? "Copied!" : "Copy path", icon: Copy, action: onCopyPath },
    { id: "copy-content", label: copiedId === "content" ? "Copied!" : "Copy content", icon: Copy, action: onCopyContent, hidden: entry.isDirectory || !isCurrentlyPreviewed },
    { id: "extract", label: "Extract file", icon: Download, action: onExtractFile, hidden: entry.isDirectory },
    { id: "subtree", label: "Extract subtree", icon: FolderOpen, action: onExtractSubtree, hidden: !entry.isDirectory },
    { id: "nested", label: "Inspect nested archive → New Tab", icon: Archive, action: onInspectNested, hidden: !isNestedArchive(entry) },
  ];

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 1000,
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      style={style}
      className="bg-surface border border-base rounded-lg shadow-xl py-1 min-w-40 text-sm"
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <button
            key={item.id}
            role="menuitem"
            className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-secondary hover:bg-element-hover hover:text-main transition-colors"
            onClick={() => { item.action?.(); onClose(); }}
          >
            <item.icon size={13} className="flex-shrink-0" />
            {item.label}
          </button>
        ))}
    </div>
  );
};
