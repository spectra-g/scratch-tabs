import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

interface AlertProps {
  children: React.ReactNode;
  variant: "info" | "success" | "warning" | "error";
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant,
  title,
  onClose,
  className = "",
}) => {
  const variantStyles = {
    info: "bg-info-subtle text-info border border-info-subtle/20",
    success: "bg-success-subtle text-success border border-success-subtle/20",
    warning: "bg-warning-subtle text-warning border border-warning-subtle/20",
    error: "bg-danger-subtle text-danger border border-danger-subtle/20",
  };

  const IconComponent = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  }[variant];

  return (
    <div
      className={`border rounded-md p-3 ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent size={18} />
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={`text-sm ${title ? "mt-1" : ""}`}>{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className="ml-auto flex-shrink-0 -mt-1 -mr-1 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
