import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./Button";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = "Copy",
  size = "sm",
  variant = "secondary",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      size={size}
      variant={variant}
      icon={copied ? Check : Copy}
      className={className}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
};
