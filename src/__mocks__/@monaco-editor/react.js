const React = require('react');

function Editor({ value, onChange }) {
  // Render a simple textarea for testing
  return React.createElement('textarea', {
    value,
    onChange: (e) => onChange && onChange(e.target.value),
    'data-testid': 'monaco-mock',
  });
}

module.exports = Editor;
module.exports.default = Editor; 