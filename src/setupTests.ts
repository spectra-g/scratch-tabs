// Jest setup file
import "@testing-library/jest-dom";

// Mock Monaco Editor since it's not available in test environment
(global as any).monaco = {
  languages: {
    getLanguages: jest.fn(() => []),
    register: jest.fn(),
    setMonarchTokensProvider: jest.fn(),
    registerDocumentFormattingEditProvider: jest.fn(),
  },
  editor: {
    defineTheme: jest.fn(),
  },
};

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "mocked-object-url");
global.URL.revokeObjectURL = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
