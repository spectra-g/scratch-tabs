import React from "react";

export interface CalculatorButtonProps {
  value: string | React.ReactNode;
  onClick: () => void;
  variant?: "default" | "operator" | "action" | "equals" | "mode";
  className?: string;
  ariaLabel?: string;
  isActive?: boolean;
}

export const CalculatorButton: React.FC<CalculatorButtonProps> = ({
  value,
  onClick,
  variant = "default",
  className = "",
  ariaLabel,
  isActive = false,
}) => {
  const baseStyle =
    "border rounded-lg p-2 text-base md:text-lg font-medium transition-all duration-100 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95 active:brightness-90 transform";

  const variantMap = {
    operator:
      "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50 focus:ring-blue-500",
    action:
      "bg-gray-600/60 hover:bg-gray-500/60 text-gray-200 border-gray-600/50 focus:ring-gray-400",
    equals:
      "bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-500/50 focus:ring-green-500",
    mode: `border-gray-600/50 ${isActive ? "bg-blue-500/20 text-blue-300" : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"}`,
    default:
      "bg-gray-700/50 hover:bg-gray-600/50 text-gray-100 border-gray-600/50 focus:ring-gray-500",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variantMap[variant]} ${className}`}
      aria-label={ariaLabel || (typeof value === "string" ? value : undefined)}
    >
      {value}
    </button>
  );
};