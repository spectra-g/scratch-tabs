import React from "react";
import { areEqual } from "react-window";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Image,
  File,
  Lock,
} from "../../../components/Icons";
import { ArchiveEntry } from "../types";
import { formatBytes } from "../utils/formatBytes";

interface FileTreeRowProps {
  entry: ArchiveEntry;
  isExpanded: boolean;
  isSelected: boolean;
  searchQuery: string;
  style: React.CSSProperties;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onExpandToggle: () => void;
}

function getFileIcon(entry: ArchiveEntry) {
  if (entry.isDirectory) return <Folder size={14} className="text-warning flex-shrink-0" />;
  if (entry.isImagePreviewable) return <Image size={14} className="text-info flex-shrink-0" />;
  if (entry.isTextPreviewable) return <FileText size={14} className="text-secondary flex-shrink-0" />;
  return <File size={14} className="text-muted flex-shrink-0" />;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-warning/30 text-main rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const FileTreeRow = React.memo<FileTreeRowProps>(function FileTreeRow({
  entry,
  isExpanded,
  isSelected,
  searchQuery,
  style,
  onClick,
  onContextMenu,
  onExpandToggle,
}) {
  return (
    <div
      role="treeitem"
      aria-expanded={entry.isDirectory ? isExpanded : undefined}
      aria-selected={isSelected}
      style={{ ...style, paddingLeft: `${entry.depth * 16 + 4}px` }}
      className={`flex items-center gap-1.5 pr-2 h-7 cursor-pointer select-none text-xs ${
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-element-hover text-main"
      }`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* Expand toggle for directories */}
      <button
        className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-muted hover:text-main"
        onClick={(e) => { e.stopPropagation(); if (entry.isDirectory) onExpandToggle(); }}
        aria-hidden={!entry.isDirectory}
        tabIndex={-1}
      >
        {entry.isDirectory ? (
          isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : null}
      </button>

      {getFileIcon(entry)}

      <span className="flex-1 truncate">
        {highlightMatch(entry.name, searchQuery)}
      </span>

      {entry.encryptionType !== "none" && (
        <Lock
          size={11}
          className={entry.encryptionType === "aes" ? "text-danger" : "text-warning"}
          title={entry.encryptionType === "aes" ? "AES-256 encrypted" : "ZipCrypto encrypted"}
        />
      )}

      {!entry.isDirectory && (
        <span className="text-muted tabular-nums flex-shrink-0">
          {formatBytes(entry.sizeCompressed)}
        </span>
      )}
    </div>
  );
}, areEqual);
