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
      "bg-primary/20 hover:bg-primary/30 text-info border-info/50 focus:ring-focus",
    action:
      "bg-surface-raised hover:bg-element-hover text-main border-base focus:ring-focus",
    equals:
      "bg-success/20 hover:bg-success/30 text-success border-success/50 focus:ring-success",
    mode: `border-base ${isActive ? "bg-primary/20 text-info" : "bg-element text-muted hover:bg-element-hover hover:text-main"}`,
    default:
      "bg-element hover:bg-element-hover text-main border-base focus:ring-gray-500",
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