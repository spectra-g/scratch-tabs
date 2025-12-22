import React from "react";

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
  rows = 3,
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="input-themed w-full px-3 py-2 font-mono text-sm resize-none"
    />
  );
};
