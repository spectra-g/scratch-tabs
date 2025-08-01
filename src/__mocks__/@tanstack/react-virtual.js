// Mock implementation of @tanstack/react-virtual for Jest
const { useRef } = require('react');

const useVirtualizer = ({ count, getScrollElement, estimateSize, overscan }) => {
  const virtualItems = [];
  
  // Create virtual items for all rows to ensure they render in tests
  for (let i = 0; i < count; i++) {
    virtualItems.push({
      key: i,
      index: i,
      start: i * (estimateSize ? estimateSize() : 35),
      size: estimateSize ? estimateSize() : 35,
    });
  }

  return {
    getVirtualItems: () => virtualItems,
    getTotalSize: () => count * (estimateSize ? estimateSize() : 35),
    scrollToIndex: () => {},
  };
};

module.exports = {
  useVirtualizer,
};