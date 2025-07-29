// Mock for react-markdown to avoid ES module issues in Jest
module.exports = function ReactMarkdown({ children }) {
  return children;
};