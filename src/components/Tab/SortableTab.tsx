import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Pin } from 'lucide-react';
import { Tab } from '../../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmationDialog } from './ConfirmationDialog';

interface SortableTabProps {
    tab: Tab;
    isActive: boolean;
    isEditing: boolean;
    editingTitle: string;
    maxLineCount: number;
    onClick: () => void;
    onClose: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
    onEditChange: (value: string) => void;
    onEditSubmit: () => void;
    onEditCancel: () => void;
    onMouseEnterTab: (tab: Tab, element: HTMLElement) => void;
    onMouseLeaveTab: (tabId: string) => void;
}

const MIN_WIDTH_FOR_X = 50;
const EDITING_INPUT_MIN_WIDTH = '150px';

export const SortableTab: React.FC<SortableTabProps> = ({
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
    onMouseEnterTab,
    onMouseLeaveTab,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [tabElement, setTabElement] = useState<HTMLDivElement | null>(null);
    const [currentWidth, setCurrentWidth] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: tab.id,
        disabled: tab.isPinned,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: tab.isPinned ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        minHeight: '1.5rem',
        overflow: isEditing ? 'visible' : 'hidden',
    };

    // Set up both refs - the sortable ref and our local one for measurements
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node);
        setTabElement(node);
    }, [setNodeRef]);

    useEffect(() => {
        if (!tabElement) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target instanceof HTMLElement) {
                    setCurrentWidth(entry.target.offsetWidth);
                }
            }
        });

        resizeObserver.observe(tabElement);

        return () => {
            resizeObserver.unobserve(tabElement);
            resizeObserver.disconnect();
        };
    }, [tabElement]);

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
        
        // Prevent event propagation for all keys to ensure spaces work
        e.stopPropagation();
    };

    const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (tab.content && tab.content.trim() !== '') {
            setShowConfirmation(true);
        } else {
            onClose(e);
        }
    };

    const handleConfirmClose = () => {
        setShowConfirmation(false);
        // Create a synthetic event for close
        const syntheticEvent = new MouseEvent('click') as unknown as React.MouseEvent<HTMLButtonElement>;
        onClose(syntheticEvent);
    };

    const handleCancelClose = () => {
        setShowConfirmation(false);
    };

    const handleMouseEnter = () => {
        if (!isEditing && tabElement) {
            onMouseEnterTab(tab, tabElement);
        }
    };

    const handleMouseLeave = () => {
        onMouseLeaveTab(tab.id);
    };

    // Better logic: show X if tab has reasonable width OR if it's the active tab
    // This ensures active tab always has close button unless severely constrained
    const showCloseButton = !tab.isPinned && (currentWidth > MIN_WIDTH_FOR_X || (isActive && currentWidth > 35));

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // If we're editing or it's a right-click, don't activate
        if (isEditing || e.button !== 0) return;
        
        // Immediately activate the tab on mousedown
        onClick();
        
        // Don't stop propagation, so the drag can still happen
    };

    return (
        <>
            <div
                ref={setRefs}
                className={`tab-item relative flex items-center flex-shrink-0 px-3 py-1.5 cursor-pointer text-xs transition-all duration-150 ease-in-out
                    ${isActive 
                        ? 'bg-gray-600/90 text-gray-100 border-b-2 border-blue-400 shadow-sm'
                        : 'text-gray-300 hover:text-gray-100 hover:bg-gray-700/40 border-b-2 border-transparent'
                    }
                    ${isDragging && !tab.isPinned ? 'bg-blue-500/90 text-white shadow-md scale-105' : ''}
                    border-r-2 border-r-gray-700/90 backdrop-blur-sm`}
                style={style}
                onClick={() => !isEditing && onClick()}
                onMouseDown={handleMouseDown}
                onContextMenu={(e) => !isEditing && onContextMenu(e)}
                onDoubleClick={(e) => !isEditing && onDoubleClick(e)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                title=""
                {...attributes}
                {...listeners}
            >
                {!tab.isTablet && lineCount > 0 && !isEditing && (
                    <div
                        className="absolute left-0 bottom-0 h-0.5 bg-blue-400/60 opacity-70 rounded-r-sm"
                        style={{ width: `${relativeWidth}%` }}
                        aria-hidden="true"
                    />
                )}

                {tab.isPinned && (
                    <Pin size={11} className="flex-shrink-0 text-yellow-400/90 mr-1.5 drop-shadow-sm" />
                )}

                <div className={`flex-1 min-w-0 flex items-center ${showCloseButton ? 'mr-1' : ''}`}>
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
                            width: `${Math.max(150, (editingTitle.length + 5) * 8)}px`, // Dynamic width based on content
                            maxWidth: '80%', // Prevent excessive width
                            boxSizing: 'border-box',
                        }}
                        aria-label="Edit tab title"
                    />
                )}

                {!isEditing && showCloseButton && (
                    <button
                        className="flex-shrink-0 hover:bg-gray-600/80 rounded-sm transition-all duration-150 hover:text-red-300"
                        onClick={handleCloseClick}
                        aria-label={`Close tab ${tab.title}`}
                        title={`Close tab ${tab.title}`}
                    >
                        <X size={11} />
                    </button>
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