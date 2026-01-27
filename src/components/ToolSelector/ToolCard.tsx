import React from 'react';
import { ToolItem } from '../../services/toolService';

interface ToolCardProps {
    item: ToolItem;
    onClick: () => void;
    isFocused?: boolean;
    variant?: 'grid' | 'list';
}

export const ToolCard = React.forwardRef<HTMLButtonElement, ToolCardProps>(({
    item,
    onClick,
    isFocused,
    variant = 'grid'
}, ref) => {
    const Icon = item.icon;

    if (variant === 'list') {
        return (
            <button
                ref={ref}
                onClick={onClick}
                className={`
                    group flex items-center p-3 w-full text-left
                    bg-surface hover:bg-element-hover border-b border-base last:border-0
                    transition-all duration-150 outline-none
                    ${isFocused ? 'bg-element-hover border-l-4 border-l-primary shadow-sm scale-[1.01]' : ''}
                `}
            >
                <div className="p-2 bg-surface-raised rounded-lg mr-4 group-hover:bg-surface transition-colors flex-shrink-0">
                    {Icon && <Icon size={18} className="text-secondary group-hover:text-main" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-main font-bold text-sm truncate">{item.label}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-surface-secondary text-secondary">
                            {item.type === 'smartview' ? 'Smart View' : item.type}
                        </span>
                    </div>
                    <p className="text-muted text-xs truncate">
                        {item.description}
                    </p>
                </div>
            </button>
        );
    }

    return (
        <button
            ref={ref}
            onClick={onClick}
            className={`
                group relative flex flex-col items-center justify-center p-6 w-full text-center
                bg-element hover:bg-element-hover border border-base rounded-2xl
                transition-all duration-200 outline-none
                hover:shadow-lg hover:-translate-y-1
                ${isFocused ? 'bg-element-hover border-secondary shadow-md z-10' : ''}
            `}
        >
            <div className="p-4 bg-gradient-to-br from-surface-raised to-surface-secondary/30 rounded-2xl mb-4 group-hover:from-surface group-hover:to-surface-raised transition-all shadow-sm group-hover:shadow-md">
                {Icon && <Icon size={32} className="text-secondary group-hover:text-main" />}
            </div>
            <h3 className="text-main font-semibold text-sm line-clamp-1 w-full">
                {item.label}
            </h3>
        </button>
    );
});

ToolCard.displayName = 'ToolCard';
