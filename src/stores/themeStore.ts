import { create } from "zustand";
import { getSetting, setSetting } from "../db";

interface ThemeState {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
    initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    isDarkMode: true, // Default to dark mode

    toggleTheme: () => {
        const newIsDarkMode = !get().isDarkMode;
        set({ isDarkMode: newIsDarkMode });

        // Update DOM
        if (newIsDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Persist
        setSetting("theme", newIsDarkMode ? "dark" : "light").catch(err =>
            console.error("Failed to save theme preference:", err)
        );
    },

    setTheme: (isDark: boolean) => {
        set({ isDarkMode: isDark });

        // Update DOM
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Persist
        setSetting("theme", isDark ? "dark" : "light").catch(err =>
            console.error("Failed to save theme preference:", err)
        );
    },

    initializeTheme: async () => {
        try {
            const savedTheme = await getSetting("theme");

            // If no saved theme, default to dark (or system preference if we wanted)
            // For now, default to dark as per current app design
            const isDark = savedTheme === "light" ? false : true;

            set({ isDarkMode: isDark });

            // Update DOM
            if (isDark) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        } catch (error) {
            console.error("Failed to initialize theme:", error);
            // Fallback to dark mode
            document.documentElement.classList.add("dark");
        }
    },
}));
