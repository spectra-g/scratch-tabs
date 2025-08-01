// Mock implementation of @tanstack/react-virtual for Jest
const { useRef } = require('react');

const useVirtualizer = ({ count, getScrollElement, estimateSize, overscan }) => {
  const virtualItems = [];
  
  // Create virtual items for all rows to ensure they render in tests
  for (let i = 0; i < count; i++) {
    virtualItems.push({
      key: i,
      index: i,
      start: i * (estimateSize ? estimateSize(i) : 35),
      size: estimateSize ? estimateSize(i) : 35,
    });
  }

  return {
    getVirtualItems: () => virtualItems,
    getTotalSize: () => virtualItems.reduce((total, item) => total + item.size, 0),
    scrollToIndex: () => {},
  };
};

module.exports = {
  useVirtualizer,
};