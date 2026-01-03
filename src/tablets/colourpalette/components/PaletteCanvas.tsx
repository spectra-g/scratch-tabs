import React from 'react';
import { Reorder } from 'framer-motion';
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
    const handleReorder = (newColors: ColorInfo[]) => {
        // Find what moved
        const movedItem = colors.find((c, i) => c.id !== newColors[i]?.id);
        if (!movedItem) return;

        const fromIndex = colors.findIndex(c => c.id === movedItem.id);
        const toIndex = newColors.findIndex(c => c.id === movedItem.id);

        if (fromIndex !== toIndex) {
            onMoveColor(fromIndex, toIndex);
        }
    };

    return (
        <Reorder.Group
            axis="x"
            values={colors}
            onReorder={handleReorder}
            className="flex w-full h-full overflow-hidden bg-surface"
        >
            {colors.map((color, index) => (
                <Reorder.Item
                    key={color.id}
                    value={color}
                    className="flex-1 h-full relative"
                >
                    <ColorColumn
                        color={color}
                        index={index}
                        onLockToggle={onLockToggle}
                        onColorChange={onColorChange}
                    />
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
};
