import React, { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import {
    Calculator,
    File,
    FileCode,
    FileText,
    RefreshCw,
    Trash2,
    X,
} from "../Icons";
import { useRootStore } from "../../stores/rootStore";
import { ConfirmationDialog } from "../Tab/ConfirmationDialog";
import {
    estimateTabStorageUsage,
    getStorageQuotaBytes,
    type TabStorageUsage,
} from "../../services/tabStorageUsageService";
import { formatBytes } from "../../utils/formatBytes";

const QUICK_PANEL_LIMIT = 12;
// Only show the quota bar once live data is a meaningful share of the quota.
const BAR_VISIBLE_RATIO = 0.05;
const DANGER_USAGE_RATIO = 0.85;

interface StorageQuickPanelProps {
    onClose: () => void;
    onNavigate: (tabId: string, workspaceId: string) => Promise<void>;
    getWorkspaceName: (workspaceId: string) => string;
}

const UsageRowIcon: React.FC<{ usage: TabStorageUsage }> = ({ usage }) => {
    if (usage.kind === "canvas" || usage.kind === "tablet") {
        return <Calculator size={14} />;
    }
    switch (usage.language.toLowerCase()) {
        case "typescript":
        case "javascript":
        case "json":
            return <FileCode size={14} />;
        case "markdown":
        case "plaintext":
            return <FileText size={14} />;
        default:
            return <File size={14} />;
    }
};

const describeUsage = (usage: TabStorageUsage): string => {
    const parts: string[] = [];
    if (typeof usage.lineCount === "number" && usage.lineCount > 0) {
        parts.push(
            `${usage.lineCount.toLocaleString()} ${usage.lineCount === 1 ? "line" : "lines"}`,
        );
    } else if (usage.kind === "rich-text") {
        parts.push("Rich text");
    }
    if (typeof usage.cardCount === "number") {
        parts.push(
            `${usage.cardCount.toLocaleString()} ${usage.cardCount === 1 ? "card" : "cards"}`,
        );
    }
    if (usage.imageCount) {
        parts.push(`${usage.imageCount} image${usage.imageCount === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
};

export const StorageQuickPanel: React.FC<StorageQuickPanelProps> = ({
    onClose,
    onNavigate,
    getWorkspaceName,
}) => {
    const removeTab = useRootStore((s) => s.removeTab);
    const [entries, setEntries] = useState<TabStorageUsage[] | null>(null);
    const [quotaBytes, setQuotaBytes] = useState<number | null>(null);
    const [pendingClose, setPendingClose] = useState<TabStorageUsage | null>(
        null,
    );

    const refresh = useCallback(async () => {
        setEntries(null);
        const [nextEntries, nextQuota] = await Promise.all([
            estimateTabStorageUsage(),
            getStorageQuotaBytes(),
        ]);
        setEntries(nextEntries);
        setQuotaBytes(nextQuota);
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const heaviest = entries?.slice(0, QUICK_PANEL_LIMIT) ?? [];
    const totalBytes =
        entries?.reduce((total, entry) => total + entry.bytes, 0) ?? 0;
    const usageRatio =
        quotaBytes && quotaBytes > 0 ? totalBytes / quotaBytes : null;

    const handleConfirmClose = async () => {
        if (!pendingClose) return;
        await removeTab(pendingClose.tabId);
        setPendingClose(null);
        void refresh();
    };

    return (
        <div
            className="absolute left-2 right-2 bottom-[34px] z-30 bg-surface border border-base rounded shadow-lg overflow-hidden"
            data-testid="sidebar-quick-panel-storage"
        >
            <div className="px-2 py-1.5 border-b border-base flex items-center justify-between">
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    Heaviest Tabs
                </span>
                <span className="flex items-center gap-1">
                    <button
                        onClick={() => void refresh()}
                        className="p-0.5 rounded text-secondary hover:text-main hover:bg-element-hover"
                        title="Recalculate storage usage"
                        aria-label="Refresh storage usage"
                        data-testid="storage-usage-refresh"
                    >
                        <RefreshCw size={12} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-0.5 rounded text-secondary hover:text-main hover:bg-element-hover"
                        aria-label="Close quick tabs panel"
                    >
                        <X size={12} />
                    </button>
                </span>
            </div>
            {entries !== null && (
                <div
                    className="px-2 py-1.5 border-b border-base"
                    data-testid="storage-usage-summary"
                >
                    <div
                        className="flex items-center justify-between text-[10px] text-secondary"
                        title="Live bytes stored by Scratch Tabs across all tabs, including rich text, tablet state, and canvas images"
                    >
                        <span>Scratch Tabs data</span>
                        <span data-testid="storage-usage-app-total">
                            {formatBytes(totalBytes)}
                        </span>
                    </div>
                    {usageRatio !== null && usageRatio >= BAR_VISIBLE_RATIO && (
                        <div className="mt-1 h-1 rounded bg-canvas overflow-hidden">
                            <div
                                className={clsx(
                                    "h-full rounded",
                                    usageRatio >= DANGER_USAGE_RATIO
                                        ? "bg-danger"
                                        : "bg-primary",
                                )}
                                style={{
                                    width: `${Math.min(usageRatio * 100, 100)}%`,
                                }}
                                data-testid="storage-usage-quota-bar"
                            />
                        </div>
                    )}
                </div>
            )}
            <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
                {entries === null ? (
                    <div className="px-3 py-4 text-center text-[12px] text-secondary">
                        Measuring tab sizes…
                    </div>
                ) : heaviest.length > 0 ? (
                    heaviest.map((usage) => (
                        <div
                            key={usage.tabId}
                            className="group w-full flex items-center gap-2 pl-2 pr-1 hover:bg-element-hover text-main"
                            data-testid={`storage-usage-row-${usage.tabId}`}
                        >
                            <button
                                onClick={() =>
                                    void onNavigate(usage.tabId, usage.workspaceId)
                                }
                                className="min-w-0 flex-1 flex items-center gap-2 py-1.5 text-left"
                            >
                                <span className="text-secondary flex-shrink-0">
                                    <UsageRowIcon usage={usage} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] truncate">
                                        {usage.title}
                                    </span>
                                    <span className="block text-[10px] text-secondary truncate">
                                        {formatBytes(usage.bytes)}
                                        {describeUsage(usage) &&
                                            ` · ${describeUsage(usage)}`}
                                        {" · "}
                                        {getWorkspaceName(usage.workspaceId)}
                                    </span>
                                </span>
                            </button>
                            <button
                                onClick={() => setPendingClose(usage)}
                                className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 p-1 rounded text-secondary hover:text-danger hover:bg-element-hover transition-opacity duration-150 flex-shrink-0"
                                title={`Close "${usage.title}" and free ${formatBytes(usage.bytes)}`}
                                aria-label={`Close ${usage.title}`}
                                data-testid={`storage-usage-close-${usage.tabId}`}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="px-3 py-4 text-center text-[12px] text-secondary">
                        No tabs to show
                    </div>
                )}
            </div>
            <ConfirmationDialog
                isOpen={pendingClose !== null}
                message={
                    pendingClose
                        ? `Close "${pendingClose.title}" and permanently remove its ${formatBytes(pendingClose.bytes)} of stored content?`
                        : ""
                }
                confirmButtonText="Close tab"
                onConfirm={() => void handleConfirmClose()}
                onCancel={() => setPendingClose(null)}
            />
        </div>
    );
};
