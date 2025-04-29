import React, { useRef, useEffect, useState } from 'react';
import { X, Pin } from 'lucide-react';
import { Tab } from '../../types';
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { ConfirmationDialog } from './ConfirmationDialog';

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

const MIN_WIDTH_FOR_X = 45; // pixels
const EDITING_INPUT_MIN_WIDTH = '150px';

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
    const [currentWidth, setCurrentWidth] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        const element = tabRef.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Using offsetWidth which includes padding and borders
                // Use entry.contentRect.width if you only want content area
                setCurrentWidth(entry.target.offsetWidth);
            }
        });

        resizeObserver.observe(element);

        return () => {
            // Check if element still exists before unobserving
            // This guards against potential errors during fast unmounts
            if (element) {
                resizeObserver.unobserve(element);
            }
            resizeObserver.disconnect();
        };
    }, []); // Empty dependency array ensures this runs once on mount

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const getTabLineCount = (content: string): number => content.split('\n').length;
    const lineCount = !tab.isTablet && tab.content ? getTabLineCount(tab.content) : 0;
    const relativeWidth = maxLineCount > 0 ? Math.max(Math.min(lineCount / maxLineCount, 1), 0.05) * 100 : 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onEditSubmit();
        else if (e.key === 'Escape') onEditCancel();
    };

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tab.content && tab.content.trim() !== '') {
            setShowConfirmation(true);
        } else {
            onClose(tab.id, e);
        }
    };

    const handleConfirmClose = (e: React.MouseEvent) => {
        setShowConfirmation(false);
        onClose(tab.id, e);
    };

    const handleCancelClose = () => {
        setShowConfirmation(false);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isEditing && tabRef.current) {
            onMouseEnterTab(tab, tabRef.current);
        }
    };

    const handleMouseLeave = () => {
        onMouseLeaveTab(tab.id);
    };

    const showCloseButton = !tab.isPinned && (isActive || currentWidth > MIN_WIDTH_FOR_X);

    return (
        <>
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
                    cursor: tab.isPinned ? 'default' : (snapshot.isDragging ? 'grabbing' : 'grab'),
                    minHeight: '1.5rem',
                    overflow: isEditing ? 'visible' : 'hidden',
                }}
                onClick={() => !isEditing && onClick(tab.id)}
                onContextMenu={(e) => !isEditing && onContextMenu(tab.id, e)}
                onDoubleClick={(e) => !isEditing && onDoubleClick(tab, e)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                title=""
            >
                {!tab.isTablet && lineCount > 0 && !isEditing && (
                    <div
                        className="absolute left-0 bottom-0 h-0.5 bg-gray-500 opacity-50"
                        style={{ width: `${relativeWidth}%` }}
                        aria-hidden="true"
                    />
                )}

                <div className={`flex-1 min-w-0 flex items-center ${showCloseButton || tab.isPinned ? 'mr-1' : ''}`}>
                    {!isEditing && (
                         <div className="truncate" aria-label={`Tab title: ${tab.title}`}>
                           {tab.title}
                        </div>
                    )}
                </div>

                {isEditing && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => onEditChange(e.target.value)}
                        onBlur={onEditSubmit}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-0 left-0 h-full bg-gray-600 text-gray-200 px-2 py-0.5 rounded outline-none text-xs z-10 border border-blue-500 shadow-lg"
                        style={{
                            minWidth: EDITING_INPUT_MIN_WIDTH,
                            boxSizing: 'border-box',
                        }}
                        aria-label="Edit tab title"
                    />
                )}

                {!isEditing && (
                    <>
                        {tab.isPinned ? (
                            <Pin size={12} className="flex-shrink-0 ml-auto text-blue-400" />
                        ) : (
                            showCloseButton && (
                                <button
                                    className="flex-shrink-0 hover:bg-gray-600 rounded p-0.5 ml-auto"
                                    onClick={handleCloseClick}
                                    aria-label={`Close tab ${tab.title}`}
                                    title={`Close tab ${tab.title}`}
                                >
                                    <X size={12} />
                                </button>
                            )
                        )}
                    </>
                )}
            </div>

            <ConfirmationDialog
                isOpen={showConfirmation}
                onConfirm={handleConfirmClose}
                onCancel={handleCancelClose}
                message="Tab content cannot be recovered once closed. Are you sure you want to close this tab?"
            />
        </>
    );
};
