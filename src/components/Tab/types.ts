import React from "react";

export type MenuItem = {
    id: string;
    label?: string;
    icon?: React.ElementType;
    action?: () => void; // Action executed on click (if no submenu or submenu doesn't handle click)
    condition?: boolean; // Optional condition to show the item
    isSeparator?: boolean; // To render a separator
    submenu?: React.ReactNode; // For nested menus like languages
    disabled?: boolean; // Optional property to disable the menu item
};