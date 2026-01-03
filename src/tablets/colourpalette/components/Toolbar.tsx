import React from 'react';
import { Image, Eye, BarChart3, Download } from '../../../components/Icons';

interface ToolbarProps {
    onGenerate: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onTogglePanel: (panel: 'image' | 'preview' | 'accessibility' | 'export') => void;
    activePanel: string | null;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    onGenerate,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onTogglePanel,
    activePanel,
}) => {
    const getButtonClass = (isActive: boolean) =>
        `p-3 rounded-xl transition-all active:scale-90 ${isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/20'
            : 'hover:bg-element-hover text-secondary hover:text-main'
        }`;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-surface-secondary/90 backdrop-blur-md border border-base rounded-2xl shadow-2xl z-50">
            {/* History Controls */}
            <div className="flex items-center border-r border-base pr-2 gap-1">
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-3 rounded-xl hover:bg-element-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90 text-secondary hover:text-main"
                    title="Undo (Cmd+Z)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                    </svg>
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-3 rounded-xl hover:bg-element-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90 text-secondary hover:text-main"
                    title="Redo (Cmd+Shift+Z)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 7v6h-6" />
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                    </svg>
                </button>
            </div>

            {/* Feature Toggles */}
            <div className="flex items-center border-r border-base pr-2 gap-1">
                <button
                    onClick={() => onTogglePanel('image')}
                    className={getButtonClass(activePanel === 'image')}
                    title="Extract from Image"
                >
                    <Image size={20} />
                </button>
                <button
                    onClick={() => onTogglePanel('preview')}
                    className={getButtonClass(activePanel === 'preview')}
                    title="UI Preview"
                >
                    <Eye size={20} />
                </button>
                <button
                    onClick={() => onTogglePanel('accessibility')}
                    className={getButtonClass(activePanel === 'accessibility')}
                    title="Accessibility Report"
                >
                    <BarChart3 size={20} />
                </button>
                <button
                    onClick={() => onTogglePanel('export')}
                    className={getButtonClass(activePanel === 'export')}
                    title="Export Palette"
                >
                    <Download size={20} />
                </button>
            </div>

            {/* Main Generator */}
            <button
                onClick={onGenerate}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all active:scale-95 font-bold tracking-wide shadow-lg shadow-primary/25"
                title="Generate (Spacebar)"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="M4.93 4.93l2.83 2.83" />
                    <path d="M16.24 16.24l2.83 2.83" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                    <path d="M4.93 19.07l2.83-2.83" />
                    <path d="M16.24 7.76l2.83-2.83" />
                </svg>
                GENERATE
            </button>
        </div>
    );
};
