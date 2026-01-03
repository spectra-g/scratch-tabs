import React, { useCallback } from 'react';
import { ColorInfo } from '../types';
import { ColorColumn } from './ColorColumn';

interface PaletteCanvasProps {
    colors: ColorInfo[];
    onLockToggle: (id: string) => void;
    onColorChange: (id: string, hex: string) => void;
    onMoveColor: (fromIndex: number, toIndex: number) => void;
}

export const PaletteCanvas: React.FC<PaletteCanvasProps> = ({
    colors,
    onLockToggle,
    onColorChange,
    onMoveColor,
}) => {
    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (fromIndex !== toIndex) {
            onMoveColor(fromIndex, toIndex);
        }
    }, [onMoveColor]);

    return (
        <div className="flex w-full h-full overflow-hidden bg-surface">
            {colors.map((color, index) => (
                <ColorColumn
                    key={color.id}
                    color={color}
                    index={index}
                    onLockToggle={onLockToggle}
                    onColorChange={onColorChange}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            ))}
        </div>
    );
};
