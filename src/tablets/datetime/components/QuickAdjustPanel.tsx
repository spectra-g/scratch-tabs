import React from 'react';
import { Zap } from '../../../components/Icons';

interface QuickAdjustPanelProps {
    onAdjust: (type: 'h' | 'd' | 'w' | 'startOfDay', amount: number) => void;
}

export const QuickAdjustPanel: React.FC<QuickAdjustPanelProps> = ({ onAdjust }) => {
    const adjustments = [
        { label: '-1h', action: () => onAdjust('h', -1) },
        { label: '+1h', action: () => onAdjust('h', 1) },
        { label: '-1d', action: () => onAdjust('d', -1) },
        { label: '+1d', action: () => onAdjust('d', 1) },
        { label: '+1w', action: () => onAdjust('w', 1) },
        { label: 'Start of Day', action: () => onAdjust('startOfDay', 0), isPrimary: true },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="flex items-center gap-2 mr-2">
                <Zap size={14} className="text-secondary" />
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Quick Adjust:</span>
            </div>
            {adjustments.map((adj, i) => (
                <button
                    key={i}
                    onClick={adj.action}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all border ${adj.isPrimary
                            ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                            : 'bg-element hover:bg-element-hover text-main border-base active:scale-95'
                        }`}
                >
                    {adj.label}
                </button>
            ))}
        </div>
    );
};
