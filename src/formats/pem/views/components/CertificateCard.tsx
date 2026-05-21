import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Hash,
  AlertTriangle,
} from "../../../../components/Icons";
import { X509Certificate } from "../../utils/x509Parser";
import { ValidityBadge } from "./ValidityBadge";
import { FieldRow } from "./FieldRow";

interface ChainLink {
  blockIndex: number;
  issuedByIndex: number | null;
}

interface Props {
  cert: X509Certificate;
  index: number;
  total: number;
  fingerprint?: string;
  chainLink?: ChainLink;
}

function formatDN(dn: Record<string, string | undefined>): string {
  const order = ["CN", "O", "OU", "L", "ST", "C"];
  const parts: string[] = [];
  for (const key of order) {
    if (dn[key]) parts.push(`${key}=${dn[key]}`);
  }
  for (const [k, v] of Object.entries(dn)) {
    if (!order.includes(k) && v) parts.push(`${k}=${v}`);
  }
  return parts.join(", ") || "(empty)";
}

function formatDate(d: Date): string {
  return d.toUTCString();
}

// ─── Validity timeline ────────────────────────────────────────────────────────

const ValidityTimeline: React.FC<{ notBefore: Date; notAfter: Date }> = ({
  notBefore,
  notAfter,
}) => {
  const now = Date.now();
  const start = notBefore.getTime();
  const end = notAfter.getTime();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));

  const isExpired = now > end;
  const isExpiringSoon = !isExpired && (end - now) / 86_400_000 < 30;

  const barColor = isExpired
    ? "bg-danger"
    : isExpiringSoon
    ? "bg-warning"
    : "bg-success";

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{notBefore.toLocaleDateString()}</span>
        <span>{notAfter.toLocaleDateString()}</span>
      </div>
      <div className="h-2 bg-element rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="relative"
        style={{ marginLeft: `calc(${Math.min(pct, 97)}% - 1px)` }}
      >
        <div className="w-0.5 h-2 bg-main opacity-50" />
      </div>
      <div className="text-xs text-secondary text-center mt-1">Now</div>
    </div>
  );
};

// ─── Key size badge ───────────────────────────────────────────────────────────

const KeySizeBadge: React.FC<{ bits: number }> = ({ bits }) => {
  const isWeak = bits < 2048;
  const isStrong = bits >= 4096;
  const colorClass = isWeak
    ? "bg-danger-subtle text-danger border-danger"
    : isStrong
    ? "bg-success-subtle text-success border-success"
    : "bg-element text-secondary border-base";

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${colorClass}`}>
      <Hash size={10} />
      {bits}-bit
      {isWeak && <AlertTriangle size={9} />}
    </span>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export const CertificateCard: React.FC<Props> = ({
  cert,
  index,
  total,
  fingerprint,
  chainLink,
}) => {
  const [expanded, setExpanded] = useState(true);

  const title = cert.subject.CN ?? formatDN(cert.subject);
  const isChainRoot = chainLink?.issuedByIndex === null;

  return (
    <div className="border border-base rounded-lg overflow-hidden mb-3">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-secondary hover:bg-element transition-colors text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <ShieldCheck size={16} className="text-info flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-main truncate">{title}</span>
            {total > 1 && (
              <span className="text-xs text-secondary">({index + 1}/{total})</span>
            )}
            {cert.isCA && (
              <span className="text-xs px-1.5 py-0.5 bg-info-subtle text-info rounded border border-info">CA</span>
            )}
            {cert.isSelfSigned && (
              <span className="text-xs px-1.5 py-0.5 bg-element text-secondary rounded border border-base">Self-signed</span>
            )}
            {isChainRoot && !cert.isSelfSigned && (
              <span className="text-xs px-1.5 py-0.5 bg-element text-secondary rounded border border-base">Root</span>
            )}
            {cert.keyBits && <KeySizeBadge bits={cert.keyBits} />}
          </div>
          <div className="mt-1">
            <ValidityBadge notBefore={cert.notBefore} notAfter={cert.notAfter} />
          </div>
        </div>
        {expanded
          ? <ChevronDown size={14} className="text-secondary flex-shrink-0" />
          : <ChevronRight size={14} className="text-secondary flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-4">
          {/* Validity timeline */}
          <ValidityTimeline notBefore={cert.notBefore} notAfter={cert.notAfter} />

          {/* Fingerprint (shown as soon as computed) */}
          {fingerprint && (
            <Section title="Fingerprint (SHA-256)">
              <FieldRow label="SHA-256" value={fingerprint} mono />
            </Section>
          )}

          <Section title="Subject">
            <FieldRow label="Distinguished Name" value={formatDN(cert.subject)} />
            {cert.subject.CN && <FieldRow label="Common Name" value={cert.subject.CN} />}
            {cert.subject.O && <FieldRow label="Organization" value={cert.subject.O} />}
            {cert.subject.OU && <FieldRow label="Org Unit" value={cert.subject.OU} />}
            {cert.subject.C && <FieldRow label="Country" value={cert.subject.C} />}
            {cert.subject.ST && <FieldRow label="State/Province" value={cert.subject.ST} />}
            {cert.subject.L && <FieldRow label="Locality" value={cert.subject.L} />}
          </Section>

          <Section title="Issuer">
            <FieldRow label="Distinguished Name" value={formatDN(cert.issuer)} />
            {cert.issuer.CN && <FieldRow label="Common Name" value={cert.issuer.CN} />}
            {cert.issuer.O && <FieldRow label="Organization" value={cert.issuer.O} />}
            {cert.isSelfSigned && (
              <div className="text-xs text-secondary italic py-1">
                Self-signed — issuer equals subject
              </div>
            )}
          </Section>

          <Section title="Validity">
            <FieldRow label="Not Before" value={formatDate(cert.notBefore)} />
            <FieldRow label="Not After" value={formatDate(cert.notAfter)} />
          </Section>

          <Section title="Keys & Algorithms">
            <FieldRow
              label="Public Key"
              value={cert.keyBits ? `${cert.keyAlgorithm} (${cert.keyBits}-bit)` : cert.keyAlgorithm}
              copyable={false}
            />
            <FieldRow label="Signature" value={cert.signatureAlgorithm} copyable={false} />
            <FieldRow label="Serial Number" value={cert.serialNumber} mono />
            <FieldRow label="Version" value={`v${cert.version}`} copyable={false} />
          </Section>

          {cert.subjectAltNames.length > 0 && (
            <Section title={`Subject Alternative Names (${cert.subjectAltNames.length})`}>
              {cert.subjectAltNames.map((san, i) => (
                <FieldRow key={i} label={san.type} value={san.value} mono={san.type === "IP"} />
              ))}
            </Section>
          )}

          {(cert.keyUsage.length > 0 || cert.extKeyUsage.length > 0) && (
            <Section title="Key Usage">
              {cert.keyUsage.length > 0 && (
                <FieldRow label="Key Usage" value={cert.keyUsage.join(", ")} copyable={false} />
              )}
              {cert.extKeyUsage.length > 0 && (
                <FieldRow label="Extended" value={cert.extKeyUsage.join(", ")} copyable={false} />
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1.5">{title}</div>
    <div className="bg-surface rounded border border-base px-3 py-1">{children}</div>
  </div>
);
