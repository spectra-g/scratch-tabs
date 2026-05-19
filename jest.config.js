/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^dexie$": "<rootDir>/src/__mocks__/dexie.js",
    "^monaco-editor(.*)$": "<rootDir>/src/__mocks__/monaco-editor.js",
    "^@monaco-editor/react$": "<rootDir>/src/__mocks__/@monaco-editor/react.js",
    "^react-markdown$": "<rootDir>/src/__mocks__/react-markdown.js",
    "^remark-gfm$": "<rootDir>/src/__mocks__/remark-gfm.js",
    "^jsonpath-plus$": "<rootDir>/src/__mocks__/jsonpath-plus.js",
    "^lowlight$": "<rootDir>/src/__mocks__/lowlight.ts",
    "^react-resizable-panels$": "<rootDir>/src/__mocks__/react-resizable-panels.tsx",
    "^.*tablets/dynamicRegistry$": "<rootDir>/src/tablets/__mocks__/dynamicRegistry.ts",
    "^.*stores/aiStore$": "<rootDir>/src/__mocks__/aiStore.ts",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/__mocks__/styleMock.js",
    "^otpauth$": "<rootDir>/node_modules/otpauth/dist/otpauth.node.cjs"
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  setupFiles: ["<rootDir>/src/setupJest.ts"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(ts|tsx)",
    "<rootDir>/src/**/*.(test|spec).(ts|tsx)",
  ],
  collectCoverageFrom: [
    "src/**/*.(ts|tsx)",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  transformIgnorePatterns: ["node_modules/(?!(dexie|monaco-editor|jose|react-markdown|remark-gfm|yaml|tiptap-extension-resizable-image|otpauth)/)"],
};
