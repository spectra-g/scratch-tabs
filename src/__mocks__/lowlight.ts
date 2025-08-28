
export const createLowlight = jest.fn(() => ({
  highlight: jest.fn((lang, code) => ({ value: code })),
}));
