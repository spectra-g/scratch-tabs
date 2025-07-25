import React from 'react';

export const ClearButton: React.FC<{ onClear: () => void; disabled?: boolean }> = ({ onClear, disabled }) => (
  <button title="Clear text" onClick={onClear} disabled={disabled}>
    Clear
  </button>
); 