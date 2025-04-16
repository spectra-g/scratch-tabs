import React from 'react';

interface ConversionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export const ConversionInput: React.FC<ConversionInputProps> = ({
  value,
  onChange,
  placeholder,
  rows = 3
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 font-mono text-sm resize-none custom-scrollbar"
    />
  );
};