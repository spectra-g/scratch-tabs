import React, { useState, useEffect, useMemo } from "react";
import { Check, AlertCircle, Info } from "lucide-react";
import { TrimUIProps } from "../types";
import { shareService } from "../../services/shareService";
import clsx from "clsx";

interface KeyInfo {
    key: string;
    size: number;
    isSelected: boolean;
    isHeavy: boolean;
}

/**
 * UI for trimming JSON content by selecting top-level keys
 */
const JsonTrimUI: React.FC<TrimUIProps> = ({
    content,
    onSelectionChange,
    maxSize,
}) => {
    const [keys, setKeys] = useState<KeyInfo[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Memoize the parsed JSON to avoid re-parsing on every render
    const parsedContent = useMemo(() => {
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("JSON Trim UI Parse Error:", e);
            return null;
        }
    }, [content]);

    // Parse JSON and initialize keys on mount
    useEffect(() => {
        if (!parsedContent) {
            setError("Cannot parse JSON for trimming. Please ensure the content is valid JSON.");
            return;
        }

        try {
            let target: Record<string, any> = {};

            if (Array.isArray(parsedContent)) {
                // For arrays, treat indices as keys
                parsedContent.forEach((item, index) => {
                    target[index.toString()] = item;
                });
            } else if (typeof parsedContent === "object" && parsedContent !== null) {
                target = parsedContent;
            } else {
                throw new Error("JSON root must be an object or array");
            }

            const allKeys = Object.keys(target);
            const keyInfos: KeyInfo[] = allKeys.map(key => {
                // Estimate size of this specific key-value pair
                const kvPair = JSON.stringify({ [key]: target[key] });
                const size = shareService.getCompressedSize(kvPair);
                return {
                    key,
                    size,
                    isSelected: true,
                    isHeavy: size > maxSize * 0.5,
                };
            });

            // Auto-balancing: If total size exceeds budget, greedily select smallest keys
            const currentFullSize = shareService.getCompressedSize(content);
            if (currentFullSize > maxSize) {
                // Sort by size ascending
                const sorted = [...keyInfos].sort((a, b) => a.size - b.size);
                let budgetUsed = shareService.getCompressedSize("{}"); // Start with empty object base

                const autoSelectedKeys = new Set<string>();
                for (const info of sorted) {
                    // Approximation: size of key + value
                    // Note: This is an estimate because compression isn't perfectly additive
                    if (budgetUsed + info.size <= maxSize) {
                        budgetUsed += info.size;
                        autoSelectedKeys.add(info.key);
                    }
                }

                // Apply auto-selection
                setKeys(keyInfos.map(info => ({
                    ...info,
                    isSelected: autoSelectedKeys.has(info.key)
                })));
            } else {
                setKeys(keyInfos);
            }
        } catch (e) {
            setError("Cannot parse JSON for trimming. Please ensure the content is valid JSON.");
            console.error("JSON Trim UI Error:", e);
        }
    }, [parsedContent, maxSize, content]);

    // Handle selection change
    const toggleKey = (keyName: string) => {
        setKeys(prev => prev.map(info =>
            info.key === keyName ? { ...info, isSelected: !info.isSelected } : info
        ));
    };

    // Calculate current selection size and notify parent
    useEffect(() => {
        if (keys.length === 0 || !parsedContent) return;

        try {
            const selectedKeys = keys.filter(k => k.isSelected).map(k => k.key);
            let trimmed: any;

            if (Array.isArray(parsedContent)) {
                trimmed = parsedContent.filter((_, index) => selectedKeys.includes(index.toString()));
            } else {
                trimmed = {};
                selectedKeys.forEach(key => {
                    trimmed[key] = parsedContent[key];
                });
            }

            const trimmedJson = JSON.stringify(trimmed, null, 2);
            const size = shareService.estimateUrlLength("json", trimmedJson, `keys=${selectedKeys.sort().join(",")}`);

            onSelectionChange({
                content: trimmedJson,
                size,
                keys: selectedKeys,
                // Helper for the strategy's encodeMetadata
                toString: () => selectedKeys.join(",")
            });
        } catch (e) {
            console.error("Error updating selection:", e);
        }
    }, [keys, parsedContent, onSelectionChange]);

    const currentSelectionSize = useMemo(() => {
        const selected = keys.filter(k => k.isSelected);
        if (selected.length === 0) return shareService.getCompressedSize("{}");
        if (!parsedContent) return 0;

        // We re-estimate properly in the effect, but for the progress bar:
        try {
            let trimmed: any;
            if (Array.isArray(parsedContent)) {
                const indices = new Set(selected.map(k => k.key));
                trimmed = parsedContent.filter((_, index) => indices.has(index.toString()));
            } else {
                trimmed = {};
                selected.forEach(k => { trimmed[k.key] = parsedContent[k.key]; });
            }
            return shareService.estimateUrlLength("json", JSON.stringify(trimmed), "full");
        } catch {
            return 0;
        }
    }, [keys, parsedContent]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}b`;
        return `${(bytes / 1024).toFixed(1)}kb`;
    };

    if (error) {
        return (
            <div className="p-4 bg-danger-subtle text-danger rounded-lg flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    const budgetPercent = Math.min(100, (currentSelectionSize / maxSize) * 100);
    const isOverBudget = currentSelectionSize > maxSize;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-main">Select JSON Keys</h3>
                <span
                    data-testid="budget-text"
                    className={clsx(
                        "text-xs font-mono px-2 py-0.5 rounded",
                        isOverBudget ? "bg-danger-subtle text-danger" : "bg-surface-raised text-secondary"
                    )}
                >
                    {currentSelectionSize} / {maxSize} chars
                </span>
            </div>

            {/* Budget Bar */}
            <div className="w-full h-2 bg-surface-raised rounded-full overflow-hidden border border-base">
                <div
                    className={clsx(
                        "h-full transition-all duration-300",
                        isOverBudget ? "bg-danger" : budgetPercent > 80 ? "bg-warning" : "bg-primary"
                    )}
                    style={{ width: `${budgetPercent}%` }}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {keys.map((info) => (
                    <button
                        key={info.key}
                        onClick={() => toggleKey(info.key)}
                        className={clsx(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all text-left group",
                            info.isSelected
                                ? "bg-surface-raised border-primary shadow-sm"
                                : "bg-surface border-base hover:border-secondary opacity-70",
                            info.isHeavy && info.isSelected && "border-warning bg-warning-subtle"
                        )}
                    >
                        <div className={clsx(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            info.isSelected ? "bg-primary border-primary text-white" : "bg-transparent border-base text-transparent"
                        )}>
                            <Check size={14} strokeWidth={3} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-main truncate">
                                    {info.key}
                                </span>
                                {info.isHeavy && (
                                    <AlertCircle size={14} className="text-warning flex-shrink-0" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-secondary font-mono">
                                    {formatSize(info.size)}
                                </span>
                                {info.isHeavy && (
                                    <span className="text-[10px] text-warning font-medium italic">
                                        (Heavy)
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex items-start gap-2 text-xs text-secondary bg-surface-secondary p-3 rounded-lg border border-base">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <p>
                    Selecting specific keys helps reduce the URL size. Smaller keys are preserved by default to keep as much context as possible.
                </p>
            </div>
        </div>
    );
};

export default JsonTrimUI;
