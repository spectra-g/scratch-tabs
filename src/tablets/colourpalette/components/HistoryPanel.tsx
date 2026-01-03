import React from 'react';
import { ColorInfo } from '../types';
import { Clock, ArrowRight } from '../../../components/Icons';

interface HistoryPanelProps {
    history: ColorInfo[][];
    onRestore: (colors: ColorInfo[]) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore }) => {
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-secondary opacity-60">
                <Clock size={48} className="mb-4" />
                <p className="text-sm font-medium">No history yet</p>
                <p className="text-xs mt-1">Generate some palettes to see them here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-base pb-4">
                <h3 className="text-sm font-semibold text-main">Session History</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-surface-secondary px-2 py-0.5 rounded-full">
                    {history.length} Saved
                </span>
            </div>

            <div className="space-y-4">
                {history.map((palette, index) => (
                    <button
                        key={index}
                        onClick={() => onRestore(palette)}
                        className="group w-full flex flex-col gap-3 p-3 rounded-xl border border-base hover:border-primary/50 hover:bg-surface-secondary/40 transition-all text-left shadow-sm hover:shadow-md"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-secondary w-full">
                            <span className="font-bold">{palette.length} Colors</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-primary font-bold">
                                Restore <ArrowRight size={12} />
                            </span>
                        </div>

                        {/* Mini Palette Preview */}
                        <div className="flex h-10 w-full rounded-lg overflow-hidden border border-base/30 ring-1 ring-black/5">
                            {palette.map((color, cIndex) => (
                                <div
                                    key={`${index}-${cIndex}`}
                                    className="flex-1 h-full"
                                    style={{ backgroundColor: color.hex }}
                                    title={color.hex}
                                />
                            ))}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
