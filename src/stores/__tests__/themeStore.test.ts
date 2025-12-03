
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useThemeStore } from "../themeStore";
import { getSetting, setSetting } from "../../db";

// Mock dependencies
jest.mock("../../db", () => ({
    getSetting: jest.fn(),
    setSetting: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

describe("ThemeStore", () => {
    beforeEach(() => {
        // Reset store state
        useThemeStore.setState({
            isDarkMode: true,
        });

        // Clear mocks
        jest.clearAllMocks();

        // Reset DOM classList
        document.documentElement.classList.remove("dark");
    });

    describe("toggleTheme", () => {
        it("should toggle from dark to light", () => {
            // Initial state is dark
            useThemeStore.setState({ isDarkMode: true });
            document.documentElement.classList.add("dark");

            useThemeStore.getState().toggleTheme();

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(false);
            expect(document.documentElement.classList.contains("dark")).toBe(false);
            expect(setSetting).toHaveBeenCalledWith("theme", "light");
        });

        it("should toggle from light to dark", () => {
            // Initial state is light
            useThemeStore.setState({ isDarkMode: false });
            document.documentElement.classList.remove("dark");

            useThemeStore.getState().toggleTheme();

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(true);
            expect(document.documentElement.classList.contains("dark")).toBe(true);
            expect(setSetting).toHaveBeenCalledWith("theme", "dark");
        });
    });

    describe("setTheme", () => {
        it("should set theme to dark", () => {
            useThemeStore.setState({ isDarkMode: false });

            useThemeStore.getState().setTheme(true);

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(true);
            expect(document.documentElement.classList.contains("dark")).toBe(true);
            expect(setSetting).toHaveBeenCalledWith("theme", "dark");
        });

        it("should set theme to light", () => {
            useThemeStore.setState({ isDarkMode: true });

            useThemeStore.getState().setTheme(false);

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(false);
            expect(document.documentElement.classList.contains("dark")).toBe(false);
            expect(setSetting).toHaveBeenCalledWith("theme", "light");
        });
    });

    describe("initializeTheme", () => {
        it("should initialize with saved dark theme", async () => {
            (getSetting as jest.MockedFunction<typeof getSetting>).mockResolvedValue("dark");

            await useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(true);
            expect(document.documentElement.classList.contains("dark")).toBe(true);
        });

        it("should initialize with saved light theme", async () => {
            (getSetting as jest.MockedFunction<typeof getSetting>).mockResolvedValue("light");

            await useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(false);
            expect(document.documentElement.classList.contains("dark")).toBe(false);
        });

        it("should default to dark if no setting found", async () => {
            (getSetting as jest.MockedFunction<typeof getSetting>).mockResolvedValue(undefined);

            await useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(true);
            expect(document.documentElement.classList.contains("dark")).toBe(true);
        });

        it("should fallback to dark on error", async () => {
            (getSetting as jest.MockedFunction<typeof getSetting>).mockRejectedValue(new Error("DB Error"));

            await useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.isDarkMode).toBe(true);
            expect(document.documentElement.classList.contains("dark")).toBe(true);
        });
    });
});
