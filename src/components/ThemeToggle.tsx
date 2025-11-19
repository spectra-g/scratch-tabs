import React from 'react';
import { Sun, Moon } from './Icons';
import { useThemeStore } from '../stores/themeStore';

export const ThemeToggle: React.FC = () => {
    const { isDarkMode, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            className="p-1 rounded-md hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
        </button>
    );
};
