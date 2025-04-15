import React, { useRef, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import { Tab } from '../../types';
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { languageRegistry } from '../../languages';

interface TabItemProps {
    tab: Tab;
    isActive: boolean;
    isEditing: boolean;
    editingTitle: string;
    maxLineCount: number;
    onClick: (tabId: string) => void;
    onClose: (tabId: string, e: React.MouseEvent) => void;
    onDoubleClick: (tab: Tab, e: React.MouseEvent) => void;
    onContextMenu: (tabId: string, e: React.MouseEvent) => void;
    onEditChange: (value: string) => void;
    onEditSubmit: () => void;
    onEditCancel: () => void;
    provided: DraggableProvided;
    snapshot: DraggableStateSnapshot;
    onMouseEnterTab: (tab: Tab, element: HTMLElement) => void;
    onMouseLeaveTab: (tabId: string) => void;
}

export const TabItem: React.FC<TabItemProps> = ({
    tab,
    isActive,
    isEditing,
    editingTitle,
    maxLineCount,
    onClick,
    onClose,
    onDoubleClick,
    onContextMenu,
    onEditChange,
    onEditSubmit,
    onEditCancel,
    provided,
    snapshot,
    onMouseEnterTab,
    onMouseLeaveTab,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const tabRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const getTabLineCount = (content: string): number => content.split('\n').length;
    const lineCount = getTabLineCount(tab.content);
    const relativeWidth = Math.max(Math.min(lineCount / maxLineCount, 1), 0.05) * 100;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onEditSubmit();
        else if (e.key === 'Escape') onEditCancel();
    };

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose(tab.id, e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isEditing && tabRef.current) {
            onMouseEnterTab(tab, tabRef.current);
        }
    };

    const handleMouseLeave = () => {
        onMouseLeaveTab(tab.id);
    };

    return (
        <div
            ref={(el) => {
                provided.innerRef(el);
                tabRef.current = el;
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`tab-item relative flex items-center flex-shrink-0 px-1 py-1 cursor-pointer border-r border-gray-700 text-xs ${
                isActive ? 'bg-gray-700' : 'hover:bg-gray-700'
            } ${snapshot.isDragging && !tab.isPinned ? 'bg-blue-500 text-white' : ''}`}
            style={{
                ...provided.draggableProps.style,
                cursor: tab.isPinned ? 'default' : 'grab',
            }}
            onClick={() => onClick(tab.id)}
            onContextMenu={(e) => onContextMenu(tab.id, e)}
            onDoubleClick={(e) => onDoubleClick(tab, e)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Line count indicator bar */}
            {!tab.isTablet && (
                <div
                    className="absolute left-0 bottom-0 h-0.5 bg-gray-500 opacity-50"
                    style={{ width: `${relativeWidth}%` }}
                />
            )}
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => onEditChange(e.target.value)}
                    onBlur={onEditSubmit}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-600 text-gray-200 px-2 py-0.5 rounded outline-none w-32 text-xs z-10"
                />
            ) : (
                <div className="flex-1 min-w-0 flex items-center">
                    <span className="truncate">{tab.title}</span>
                </div>
            )}
            {tab.isPinned ? (
                <Pin size={12} className="flex-shrink-0 ml-1 text-blue-400" />
            ) : (
                <button
                    className="flex-shrink-0 hover:bg-gray-600 rounded p-0.5 ml-1"
                    onClick={handleCloseClick}
                    aria-label={`Close tab ${tab.title}`}
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
};