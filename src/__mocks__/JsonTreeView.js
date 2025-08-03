// Mock implementation of JsonTreeView for Jest
const MockJsonTreeView = ({ jsonString }) => {
  return React.createElement('div', { 'data-testid': 'json-tree-view' }, jsonString);
};

module.exports = MockJsonTreeView;