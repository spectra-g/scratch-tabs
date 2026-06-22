import React from "react";
import { ChevronDown, ChevronRight } from "../../../components/Icons";
import { ArchiveStats } from "../types";
import { formatBytes, formatRatio } from "../utils/formatBytes";

interface StatsPanelProps {
  stats: ArchiveStats;
  isOpen: boolean;
  onToggle: () => void;
  onSelectFile: (path: string) => void;
  onAddExtensionFilter: (ext: string) => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  isOpen,
  onToggle,
  onSelectFile,
  onAddExtensionFilter,
}) => (
  <div className="flex-none border-t border-base">
    <button
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:bg-element-hover transition-colors"
      onClick={onToggle}
    >
      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <span className="font-medium">Stats</span>
      <span className="text-muted ml-auto">
        {stats.fileCount} files · {formatBytes(stats.totalUncompressedBytes)} ·{" "}
        {formatRatio(stats.overallRatio)} saved
      </span>
    </button>

    {isOpen && (
      <div className="max-h-64 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-4 text-xs">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-secondary">
          <span className="text-muted">Files</span>
          <span>{stats.fileCount}</span>
          <span className="text-muted">Directories</span>
          <span>{stats.directoryCount}</span>
          <span className="text-muted">Uncompressed</span>
          <span>{formatBytes(stats.totalUncompressedBytes)}</span>
          <span className="text-muted">Compressed</span>
          <span>{formatBytes(stats.totalCompressedBytes)}</span>
          <span className="text-muted">Ratio</span>
          <span>{formatRatio(stats.overallRatio)}</span>
          {stats.zipCryptoCount > 0 && (
            <>
              <span className="text-warning">ZipCrypto</span>
              <span>{stats.zipCryptoCount}</span>
            </>
          )}
          {stats.aesCount > 0 && (
            <>
              <span className="text-danger">AES-256</span>
              <span>{stats.aesCount}</span>
            </>
          )}
        </div>

        {/* Archive comment */}
        {stats.archiveComment && (
          <div>
            <p className="text-muted mb-1">Archive comment</p>
            <pre className="text-secondary font-mono bg-surface-raised rounded p-2 text-xs overflow-x-auto custom-scrollbar whitespace-pre-wrap">
              {stats.archiveComment}
            </pre>
          </div>
        )}

        {/* Extension breakdown */}
        {stats.extensionBreakdown.length > 0 && (
          <div>
            <p className="text-muted mb-1">By extension</p>
            <table className="w-full">
              <thead>
                <tr className="text-muted">
                  <th className="text-left font-normal pb-0.5">Ext</th>
                  <th className="text-right font-normal pb-0.5">Files</th>
                  <th className="text-right font-normal pb-0.5">Size</th>
                </tr>
              </thead>
              <tbody>
                {stats.extensionBreakdown.slice(0, 15).map(({ ext, count, totalBytes }) => (
                  <tr
                    key={ext}
                    className="cursor-pointer hover:bg-element-hover text-secondary"
                    onClick={() => onAddExtensionFilter(ext)}
                    title={`Filter by .${ext}`}
                  >
                    <td className="py-0.5 font-mono">.{ext}</td>
                    <td className="text-right tabular-nums">{count}</td>
                    <td className="text-right tabular-nums">{formatBytes(totalBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Largest files */}
        {stats.largestFiles.length > 0 && (
          <div>
            <p className="text-muted mb-1">Largest files</p>
            <div className="space-y-0.5">
              {stats.largestFiles.map(({ path, sizeUncompressed }) => (
                <div
                  key={path}
                  className="flex items-center gap-2 cursor-pointer hover:bg-element-hover rounded px-1 py-0.5"
                  onClick={() => onSelectFile(path)}
                >
                  <span className="flex-1 truncate text-secondary" title={path}>
                    {path}
                  </span>
                  <span className="text-muted tabular-nums flex-shrink-0">
                    {formatBytes(sizeUncompressed)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
