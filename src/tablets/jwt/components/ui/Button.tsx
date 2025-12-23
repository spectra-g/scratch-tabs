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
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-canvas";

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50",
    secondary:
      "bg-surface-secondary text-secondary hover:bg-element-hover hover:text-main focus:ring-secondary/50",
    danger:
      "bg-danger-subtle text-danger hover:bg-danger-subtle/80 focus:ring-danger/50",
    success:
      "bg-success-subtle text-success hover:bg-success-subtle/80 focus:ring-success/50",
    warning:
      "bg-warning-subtle text-warning hover:bg-warning-subtle/80 focus:ring-warning/50",
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
