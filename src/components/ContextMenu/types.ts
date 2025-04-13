import { LucideIcon } from 'lucide-react';
import React from 'react';

export interface MenuItem {
    id: string; // Unique identifier for the item (React key)
    label: string;
    icon: LucideIcon; // Use LucideIcon type or React.ComponentType<{ size: number }>
    action?: () => void; // Function to execute on click
    isSeparator?: boolean; // Flag for rendering a separator line
    submenu?: React.ReactNode; // Optional nested menu (React element)
    disabled?: boolean; // Optional flag to disable the item
}