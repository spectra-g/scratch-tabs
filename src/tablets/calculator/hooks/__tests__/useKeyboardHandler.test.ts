import { renderHook } from "@testing-library/react";
import { useKeyboardHandler } from "../useKeyboardHandler";
import { CalculatorEngine } from "../../useCalculatorEngine";

const mockEngine: CalculatorEngine = {
  data: {
    mode: "standard",
    expression: "0",
    display: "0",
    history: [],
    notes: "",
    base: "DEC",
  },
  handleInput: jest.fn(),
  handleClear: jest.fn(),
  handleBackspace: jest.fn(),
  handleEquals: jest.fn(),
  handleModeChange: jest.fn(),
  handleBaseChange: jest.fn(),
  handleHistoryClick: jest.fn(),
  handleNotesChange: jest.fn(),
};

describe("useKeyboardHandler", () => {
  const tabletId = "test-calculator";
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock calculator container
    mockContainer = document.createElement("div");
    mockContainer.setAttribute("data-calculator-id", tabletId);
    document.body.appendChild(mockContainer);
    
    // Mock querySelector to return our container
    jest.spyOn(document, "querySelector").mockReturnValue(mockContainer);
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.restoreAllMocks();
  });

  it("should handle numeric key presses", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "5" });
    Object.defineProperty(event, "target", { value: mockContainer });
    document.dispatchEvent(event);

    expect(mockEngine.handleInput).toHaveBeenCalledWith("5");
  });

  it("should handle operator key presses", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "+" });
    Object.defineProperty(event, "target", { value: mockContainer });
    document.dispatchEvent(event);

    expect(mockEngine.handleInput).toHaveBeenCalledWith("+");
  });

  it("should handle Enter key for equals", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    Object.defineProperty(event, "target", { value: mockContainer });
    document.dispatchEvent(event);

    expect(mockEngine.handleEquals).toHaveBeenCalled();
  });

  it("should handle Backspace key", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "Backspace" });
    Object.defineProperty(event, "target", { value: mockContainer });
    document.dispatchEvent(event);

    expect(mockEngine.handleBackspace).toHaveBeenCalled();
  });

  it("should handle Delete key for clear", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "Delete" });
    Object.defineProperty(event, "target", { value: mockContainer });
    document.dispatchEvent(event);

    expect(mockEngine.handleClear).toHaveBeenCalled();
  });

  it("should handle Escape key for clear", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    Object.defineProperty(event, "target", { value: mockContainer });
    document.dispatchEvent(event);

    expect(mockEngine.handleClear).toHaveBeenCalled();
  });

  it("should prevent default for handled keys", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "5" });
    Object.defineProperty(event, "target", { value: mockContainer });
    const preventDefaultSpy = jest.spyOn(event, "preventDefault");
    
    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should not handle keys when target is not in calculator container", () => {
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const outsideElement = document.createElement("div");
    const event = new KeyboardEvent("keydown", { key: "5" });
    Object.defineProperty(event, "target", { value: outsideElement });
    
    document.dispatchEvent(event);

    expect(mockEngine.handleInput).not.toHaveBeenCalled();
  });

  it("should not handle keys when active element is input", () => {
    const input = document.createElement("input");
    mockContainer.appendChild(input);
    input.focus();
    
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "5" });
    Object.defineProperty(event, "target", { value: input });
    
    document.dispatchEvent(event);

    expect(mockEngine.handleInput).not.toHaveBeenCalled();
  });

  it("should not handle keys when active element is textarea", () => {
    const textarea = document.createElement("textarea");
    mockContainer.appendChild(textarea);
    textarea.focus();
    
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "5" });
    Object.defineProperty(event, "target", { value: textarea });
    
    document.dispatchEvent(event);

    expect(mockEngine.handleInput).not.toHaveBeenCalled();
  });

  it("should not handle keys when active element is contentEditable", () => {
    const editableDiv = document.createElement("div");
    editableDiv.contentEditable = "true";
    mockContainer.appendChild(editableDiv);
    
    // Mock document.activeElement to return the contentEditable element
    Object.defineProperty(document, "activeElement", {
      value: editableDiv,
      configurable: true,
    });
    
    renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    const event = new KeyboardEvent("keydown", { key: "5" });
    Object.defineProperty(event, "target", { value: editableDiv });
    
    document.dispatchEvent(event);

    expect(mockEngine.handleInput).not.toHaveBeenCalled();
  });

  it("should clean up event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useKeyboardHandler(mockEngine, tabletId));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});