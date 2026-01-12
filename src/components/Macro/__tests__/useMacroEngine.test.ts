import { renderHook, act } from "@testing-library/react";
import { useMacroEngine, ACTION_TYPE } from "../useMacroEngine";

// Mock zustand store
const mockSetForceShowToolbar = jest.fn();
jest.mock("../../../stores/macroStore", () => ({
    useMacroStore: {
        getState: jest.fn(() => ({
            setForceShowToolbar: mockSetForceShowToolbar,
        })),
    },
}));

describe("useMacroEngine", () => {
    let mockEditor: any;
    let mockModel: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockModel = {
            isDisposed: jest.fn().mockReturnValue(false),
            getValueInRange: jest.fn().mockReturnValue("test content"),
        };

        mockEditor = {
            getModel: jest.fn().mockReturnValue(mockModel),
            getPosition: jest.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
            getSelection: jest.fn().mockReturnValue({
                lineNumber: 1,
                column: 1,
                selectionStartLineNumber: 1,
                selectionStartColumn: 1,
                isEmpty: () => true,
            }),
            executeEdits: jest.fn(),
            trigger: jest.fn(),
            focus: jest.fn(),
            onKeyDown: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            onDidPaste: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            hasTextFocus: jest.fn().mockReturnValue(true),
        };
    });

    it("should start in idle status", () => {
        const { result } = renderHook(() => useMacroEngine(mockEditor));
        expect(result.current.status).toBe("idle");
        expect(result.current.recordedActions).toEqual([]);
    });

    it("should transition to recording status and clear actions when starting", () => {
        const { result } = renderHook(() => useMacroEngine(mockEditor));

        act(() => {
            result.current.handleStartRecording();
        });

        expect(result.current.status).toBe("recording");
        expect(mockEditor.focus).toHaveBeenCalled();
    });

    it("should transition to idle and clear actions when handleClearRecording is called", () => {
        const { result } = renderHook(() => useMacroEngine(mockEditor));

        act(() => {
            result.current.handleStartRecording();
        });

        expect(result.current.status).toBe("recording");

        act(() => {
            result.current.handleClearRecording();
        });

        expect(result.current.status).toBe("idle");
        expect(result.current.recordedActions).toEqual([]);
        expect(mockSetForceShowToolbar).toHaveBeenCalledWith(false, null, null);
    });

    it("should handle stop recording correctly", () => {
        const { result } = renderHook(() => useMacroEngine(mockEditor));

        act(() => {
            result.current.handleStartRecording();
        });

        act(() => {
            result.current.handleStopRecording();
        });

        expect(result.current.status).toBe("idle");
    });

    it("should capture key down events during recording", () => {
        let onKeyDownCallback: any;
        mockEditor.onKeyDown.mockImplementation((cb: any) => {
            onKeyDownCallback = cb;
            return { dispose: jest.fn() };
        });

        const { result } = renderHook(() => useMacroEngine(mockEditor));

        act(() => {
            result.current.handleStartRecording();
        });

        // Simulate key down
        act(() => {
            onKeyDownCallback({
                browserEvent: { key: "a" },
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
            });
        });

        expect(result.current.recordedActions).toContainEqual({
            type: ACTION_TYPE.CHAR,
            value: "a",
        });

        // Simulate Backspace
        act(() => {
            onKeyDownCallback({
                browserEvent: { key: "Backspace" },
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
            });
        });

        expect(result.current.recordedActions).toContainEqual({
            type: ACTION_TYPE.DELETE_LEFT,
        });
    });

    it("should handle paste events", () => {
        let onKeyDownCallback: any;
        let onDidPasteCallback: any;

        mockEditor.onKeyDown.mockImplementation((cb: any) => {
            onKeyDownCallback = cb;
            return { dispose: jest.fn() };
        });

        mockEditor.onDidPaste.mockImplementation((cb: any) => {
            onDidPasteCallback = cb;
            return { dispose: jest.fn() };
        });

        const { result } = renderHook(() => useMacroEngine(mockEditor));

        act(() => {
            result.current.handleStartRecording();
        });

        // Simulate Ctrl+V intent
        act(() => {
            onKeyDownCallback({
                browserEvent: { key: "v" },
                ctrlKey: true,
                metaKey: false,
                shiftKey: false,
            });
        });

        // Simulate Monaco paste event
        act(() => {
            onDidPasteCallback({
                range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2 },
            });
        });

        expect(result.current.recordedActions).toContainEqual({
            type: ACTION_TYPE.PASTE,
            value: "test content",
        });
    });

    it("should ignore key down events if editor does not have text focus", () => {
        let onKeyDownCallback: any;
        mockEditor.onKeyDown.mockImplementation((cb: any) => {
            onKeyDownCallback = cb;
            return { dispose: jest.fn() };
        });

        mockEditor.hasTextFocus.mockReturnValue(false);

        const { result } = renderHook(() => useMacroEngine(mockEditor));

        act(() => {
            result.current.handleStartRecording();
        });

        // Simulate key down
        act(() => {
            onKeyDownCallback({
                browserEvent: { key: "a" },
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
            });
        });

        expect(result.current.recordedActions).not.toContainEqual({
            type: ACTION_TYPE.CHAR,
            value: "a",
        });
    });

    it("should stop recording if it becomes invisible", () => {
        const { result } = renderHook(({ editor }) => useMacroEngine(editor), {
            initialProps: { editor: mockEditor }
        });

        act(() => {
            result.current.handleStartRecording();
        });

        expect(result.current.status).toBe("recording");

        // Simulate going invisible (e.g. tab switch)
        act(() => {
            result.current.setForceVisible(false);
        });

        expect(result.current.status).toBe("idle");
    });

    describe("handleRemoveAction", () => {
        it("should remove action at the specified index", () => {
            let onKeyDownCallback: any;
            mockEditor.onKeyDown.mockImplementation((cb: any) => {
                onKeyDownCallback = cb;
                return { dispose: jest.fn() };
            });

            const { result } = renderHook(() => useMacroEngine(mockEditor));

            act(() => {
                result.current.handleStartRecording();
            });

            // Add multiple actions
            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "a" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "b" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "c" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            expect(result.current.recordedActions).toHaveLength(3);
            expect(result.current.recordedActions[0]).toEqual({ type: ACTION_TYPE.CHAR, value: "a" });
            expect(result.current.recordedActions[1]).toEqual({ type: ACTION_TYPE.CHAR, value: "b" });
            expect(result.current.recordedActions[2]).toEqual({ type: ACTION_TYPE.CHAR, value: "c" });

            // Remove middle action
            act(() => {
                result.current.handleRemoveAction(1);
            });

            expect(result.current.recordedActions).toHaveLength(2);
            expect(result.current.recordedActions[0]).toEqual({ type: ACTION_TYPE.CHAR, value: "a" });
            expect(result.current.recordedActions[1]).toEqual({ type: ACTION_TYPE.CHAR, value: "c" });
        });

        it("should handle removing the first action", () => {
            let onKeyDownCallback: any;
            mockEditor.onKeyDown.mockImplementation((cb: any) => {
                onKeyDownCallback = cb;
                return { dispose: jest.fn() };
            });

            const { result } = renderHook(() => useMacroEngine(mockEditor));

            act(() => {
                result.current.handleStartRecording();
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "x" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "y" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            expect(result.current.recordedActions).toHaveLength(2);

            act(() => {
                result.current.handleRemoveAction(0);
            });

            expect(result.current.recordedActions).toHaveLength(1);
            expect(result.current.recordedActions[0]).toEqual({ type: ACTION_TYPE.CHAR, value: "y" });
        });

        it("should handle removing the last action", () => {
            let onKeyDownCallback: any;
            mockEditor.onKeyDown.mockImplementation((cb: any) => {
                onKeyDownCallback = cb;
                return { dispose: jest.fn() };
            });

            const { result } = renderHook(() => useMacroEngine(mockEditor));

            act(() => {
                result.current.handleStartRecording();
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "p" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "q" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            expect(result.current.recordedActions).toHaveLength(2);

            act(() => {
                result.current.handleRemoveAction(1);
            });

            expect(result.current.recordedActions).toHaveLength(1);
            expect(result.current.recordedActions[0]).toEqual({ type: ACTION_TYPE.CHAR, value: "p" });
        });

        it("should handle invalid index gracefully", () => {
            let onKeyDownCallback: any;
            mockEditor.onKeyDown.mockImplementation((cb: any) => {
                onKeyDownCallback = cb;
                return { dispose: jest.fn() };
            });

            const { result } = renderHook(() => useMacroEngine(mockEditor));
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

            act(() => {
                result.current.handleStartRecording();
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "z" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            expect(result.current.recordedActions).toHaveLength(1);

            // Try to remove with negative index
            act(() => {
                result.current.handleRemoveAction(-1);
            });

            expect(result.current.recordedActions).toHaveLength(1);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid index -1 for removeAction");

            // Try to remove with out-of-bounds index
            act(() => {
                result.current.handleRemoveAction(5);
            });

            expect(result.current.recordedActions).toHaveLength(1);
            expect(consoleSpy).toHaveBeenCalledWith("Invalid index 5 for removeAction");

            consoleSpy.mockRestore();
        });

        it("should handle removing all actions one by one", () => {
            let onKeyDownCallback: any;
            mockEditor.onKeyDown.mockImplementation((cb: any) => {
                onKeyDownCallback = cb;
                return { dispose: jest.fn() };
            });

            const { result } = renderHook(() => useMacroEngine(mockEditor));

            act(() => {
                result.current.handleStartRecording();
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "1" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            act(() => {
                onKeyDownCallback({
                    browserEvent: { key: "2" },
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            });

            expect(result.current.recordedActions).toHaveLength(2);

            act(() => {
                result.current.handleRemoveAction(0);
            });

            expect(result.current.recordedActions).toHaveLength(1);

            act(() => {
                result.current.handleRemoveAction(0);
            });

            expect(result.current.recordedActions).toHaveLength(0);
        });
    });
});
