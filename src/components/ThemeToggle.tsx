import React from 'react';
import { Sun, Moon } from './Icons';
import { useThemeStore } from '../stores/themeStore';

export const ThemeToggle: React.FC = () => {
    const { isDarkMode, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            className="p-1 rounded-md text-gray-400 transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
        </button>
    );
};
