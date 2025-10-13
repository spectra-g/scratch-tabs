import React from "react";
import type { LucideIcon } from "lucide-react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  disabled = false,
  className = "",
  title,
  type = "button",
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";

  const variantStyles = {
    primary:
      "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 focus:ring-blue-500/50",
    secondary:
      "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 focus:ring-gray-500/50",
    danger:
      "bg-red-500/20 text-red-400 hover:bg-red-500/30 focus:ring-red-500/50",
    success:
      "bg-green-500/20 text-green-400 hover:bg-green-500/30 focus:ring-green-500/50",
    warning:
      "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 focus:ring-yellow-500/50",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
      title={title}
    >
      {Icon && (
        <Icon
          size={size === "sm" ? 14 : size === "md" ? 16 : 18}
          className={children ? "mr-2" : ""}
        />
      )}
      {children}
    </button>
  );
};
