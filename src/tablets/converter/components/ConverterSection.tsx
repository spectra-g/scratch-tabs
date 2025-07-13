import React from "react";

interface ConverterSectionProps {
  children: React.ReactNode;
}

export const ConverterSection: React.FC<ConverterSectionProps> = ({
  children,
}) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
};
