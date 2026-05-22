import React from "react";
import { AlertTriangle, CheckCircle, XCircle } from "../../../../components/Icons";

interface Props {
  notBefore: Date;
  notAfter: Date;
}

export const ValidityBadge: React.FC<Props> = ({ notBefore, notAfter }) => {
  const now = new Date();
  const msRemaining = notAfter.getTime() - now.getTime();
  const daysRemaining = Math.floor(msRemaining / 86_400_000);
  const isExpired = msRemaining < 0;
  const isNotYetValid = now < notBefore;
  const isExpiringSoon = !isExpired && daysRemaining <= 30;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-danger-subtle text-danger border border-danger">
        <XCircle size={12} />
        Expired {Math.abs(daysRemaining)}d ago
      </span>
    );
  }

  if (isNotYetValid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning-subtle text-warning border border-warning">
        <AlertTriangle size={12} />
        Not yet valid
      </span>
    );
  }

  if (isExpiringSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning-subtle text-warning border border-warning">
        <AlertTriangle size={12} />
        Expires in {daysRemaining}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-success-subtle text-success border border-success">
      <CheckCircle size={12} />
      Valid · {daysRemaining}d left
    </span>
  );
};
