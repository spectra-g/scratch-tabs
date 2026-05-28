import React from "react";

interface OpenApiBadgeProps {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
}

const tones: Record<NonNullable<OpenApiBadgeProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  muted: "bg-element text-secondary border-base",
};

export const OpenApiBadge: React.FC<OpenApiBadgeProps> = ({ children, tone = "default" }) => (
  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
    {children}
  </span>
);
