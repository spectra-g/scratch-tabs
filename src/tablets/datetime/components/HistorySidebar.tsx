import React, { useState } from 'react';
import { History, Star, X, ChevronLeft, ChevronRight, Clock } from '../../../components/Icons';
import { PinnedDate } from '../types';
import { formatDistanceToNow, differenceInSeconds, differenceInHours, differenceInMinutes, differenceInDays } from 'date-fns';

interface HistorySidebarProps {
    history: PinnedDate[];
    onSelectDate: (date: Date) => void;
    onToggleStar: (id: string) => void;
    onRemove: (id: string) => void;
    currentDate: Date | null;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    history,
    onSelectDate,
    onToggleStar,
    onRemove,
    currentDate
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const calculateDiff = (date: Date) => {
        if (!currentDate) return null;
        const diffSeconds = differenceInSeconds(currentDate, date);
        if (Math.abs(diffSeconds) < 60) return `${diffSeconds > 0 ? '+' : ''}${diffSeconds}s`;

        const diffMinutes = differenceInMinutes(currentDate, date);
        if (Math.abs(diffMinutes) < 60) return `${diffMinutes > 0 ? '+' : ''}${diffMinutes}m`;

        const diffHours = differenceInHours(currentDate, date);
        if (Math.abs(diffHours) < 24) return `${diffHours > 0 ? '+' : ''}${diffHours}h`;

        const diffDays = differenceInDays(currentDate, date);
        return `${diffDays > 0 ? '+' : ''}${diffDays}d`;
    };

    if (isCollapsed) {
        return (
            <div className="w-12 border-r border-base flex flex-col items-center py-4 bg-surface-secondary">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md mb-4"
                    aria-label="Expand sidebar"
                >
                    <ChevronRight size={20} />
                </button>
                <div className="flex flex-col gap-4">
                    <History size={20} className="text-muted" />
                    <Star size={20} className="text-muted" />
                </div>
            </div>
        );
    }

    return (
        <div className="tablet-sidebar">
            <div className="p-4 border-b border-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History size={18} className="text-primary" />
                    <span className="text-sm font-bold text-main uppercase tracking-wider">History & Stars</span>
                </div>
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded-md"
                >
                    <ChevronLeft size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                {history.length === 0 ? (
                    <div className="p-8 text-center">
                        <Clock size={32} className="text-muted mx-auto mb-2 opacity-20" />
                        <p className="text-xs text-muted">No history yet.<br />Valid inputs appear here.</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {history.map((item) => {
                            const diff = calculateDiff(item.date);
                            return (
                                <div
                                    key={item.id}
                                    className="group p-3 border-b border-base/50 hover:bg-element-hover transition-colors cursor-pointer relative"
                                    onClick={() => onSelectDate(item.date)}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="text-[11px] font-mono text-secondary truncate max-w-[160px]">
                                            {item.originalInput || item.date.toISOString()}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleStar(item.id); }}
                                                className={`p-1 rounded transition-colors ${item.label === 'star' ? 'text-amber-500' : 'text-muted hover:text-amber-500'}`}
                                            >
                                                <Star size={12} fill={item.label === 'star' ? 'currentColor' : 'none'} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                                                className="p-1 text-muted hover:text-danger hover:bg-danger/10 rounded"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-xs font-semibold text-main mb-1">
                                        {item.date.toLocaleString()}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted italic">
                                            {formatDistanceToNow(item.pinnedAt, { addSuffix: true })}
                                        </span>
                                        {diff && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diff.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-danger/10 text-danger'
                                                }`}>
                                                Diff: {diff}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
