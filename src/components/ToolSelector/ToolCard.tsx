import React from 'react';
import { ToolItem } from '../../services/toolSelectorService';

interface ToolCardProps {
    item: ToolItem;
    onClick: () => void;
    isFocused?: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({ item, onClick, isFocused }) => {
    const Icon = item.icon;

    const getBadgeStyles = () => {
        switch (item.type) {
            case 'tablet':
                return 'bg-info-subtle text-info';
            case 'smartview':
                return 'bg-success-subtle text-success';
            case 'format':
                return 'bg-warning-subtle text-warning';
            default:
                return 'bg-surface-secondary text-secondary';
        }
    };

    return (
        <button
            onClick={onClick}
            className={`
        group relative flex flex-col items-start p-4 w-full text-left
        bg-element hover:bg-element-hover border border-base rounded-xl
        transition-all duration-200 outline-none
        hover:shadow-md hover:-translate-y-1
        ${isFocused ? 'ring-2 ring-focus border-focus z-10' : ''}
      `}
        >
            <div className="flex items-center justify-between w-full mb-3">
                <div className="p-2 bg-surface-raised rounded-lg group-hover:bg-surface transition-colors">
                    {Icon && <Icon size={20} className="text-secondary group-hover:text-main" />}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${getBadgeStyles()}`}>
                    {item.type === 'smartview' ? 'Smart View' : item.type}
                </span>
            </div>

            <div className="w-full">
                <h3 className="text-main font-semibold text-sm mb-1 line-clamp-1">
                    {item.label}
                </h3>
                <p className="text-secondary text-xs line-clamp-2 min-h-[2rem]">
                    {item.description || `Specialized tool for ${item.label.toLowerCase()} tasks.`}
                </p>
            </div>
        </button>
    );
};
