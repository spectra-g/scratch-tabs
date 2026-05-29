import { DEFAULT_REMEDIATION } from "../constants";
import { secretRules } from "../rules";
import { SecretFinding, SecretRule, SecretScanResult } from "../types";
import { decodeBase64Candidate, isHighEntropy } from "./entropy";
import { isLikelyPlaceholder, isRedactedPlaceholder } from "./falsePositive";
import { decodeJwtMetadata } from "./jwtDecode";
import { buildLineStarts, getLinePosition, isDiffAddedLine } from "./lineIndex";
import { fingerprintSecret, redactContent, redactValue } from "./redaction";
import { adjustFindingForContext } from "./scoring";
import { SEVERITY_RANK } from "../constants";

interface CandidateMatch {
  rule: SecretRule;
  value: string;
  start: number;
  end: number;
  metadata?: Record<string, string | number | boolean | string[]>;
}

function cloneRegex(regex: RegExp): RegExp {
  return new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
}

function collectRuleMatches(input: string): CandidateMatch[] {
  const matches: CandidateMatch[] = [];

  for (const rule of secretRules) {
    const regex = cloneRegex(rule.regex);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      const groupIndex = rule.secretGroup ?? 1;
      const value = match[groupIndex] ?? match.slice(1).find(Boolean) ?? match[0];
      const groupOffset = match[0].indexOf(value);
      const start = match.index + Math.max(0, groupOffset);

      matches.push({
        rule,
        value,
        start,
        end: start + value.length,
      });

      if (match[0].length === 0) regex.lastIndex += 1;
    }
  }

  return matches;
}

function collectEntropyMatches(input: string): CandidateMatch[] {
  const tokenRegex = /(?:^|[^\w/+\-.])([A-Za-z0-9_~+/.\-]{24,500}={0,2})(?=$|[^\w/+\-.])/g;
  const matches: CandidateMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(input)) !== null) {
    const value = match[1];
    const start = match.index + match[0].indexOf(value);
    const decoded = decodeBase64Candidate(value);

    if (isHighEntropy(value) && !value.startsWith("http") && !/^\/\//.test(value)) {
      matches.push({
        rule: {
          id: "high-entropy-token",
          name: "High entropy string",
          provider: "Generic",
          severity: "medium",
          confidence: "low",
          reason: "high-entropy",
          regex: tokenRegex,
          explanation: "Opaque high-entropy value resembles a generated secret.",
        },
        value,
        start,
        end: start + value.length,
      });
    }

    if (decoded && /(?:secret|token|password|api[_-]?key|private[_-]?key)/i.test(decoded)) {
      matches.push({
        rule: {
          id: "base64-decoded-secret",
          name: "Base64 decoded secret",
          provider: "Generic",
          severity: "high",
          confidence: "medium",
          reason: "base64-decoded-secret",
          regex: tokenRegex,
          explanation: "Base64-like value decodes to text with secret indicators.",
        },
        value,
        start,
        end: start + value.length,
      });
    }
  }

  return matches;
}

function collectKubernetesSecretMatches(input: string): CandidateMatch[] {
  if (!/\bkind:\s*Secret\b/i.test(input)) {
    return [];
  }

  const matches: CandidateMatch[] = [];
  const lines = input.match(/^.*(?:\n|$)/gm) ?? [];
  let offset = 0;
  let dataIndent: number | null = null;

  for (const line of lines) {
    const lineWithoutNewline = line.replace(/\r?\n$/, "");
    const dataHeader = /^(\s*)(?:data|stringData):\s*$/.exec(lineWithoutNewline);

    if (dataHeader) {
      dataIndent = dataHeader[1].length;
      offset += line.length;
      continue;
    }

    if (dataIndent !== null) {
      const indent = lineWithoutNewline.match(/^\s*/)?.[0].length ?? 0;
      if (lineWithoutNewline.trim() && indent <= dataIndent) {
        dataIndent = null;
      } else {
        const entryMatch = /^\s+([A-Za-z0-9_.\-]+):\s*["']?([A-Za-z0-9+/=]{8,500})["']?\s*$/.exec(lineWithoutNewline);
        if (entryMatch) {
          const key = entryMatch[1];
          const value = entryMatch[2];
          const decoded = decodeKubernetesBase64(value);

          if (decoded && isPrintableSecretValue(decoded)) {
            const start = offset + line.indexOf(value);
            matches.push({
              rule: {
                id: "kubernetes-decoded-secret-value",
                name: "Kubernetes Secret data value",
                provider: "Kubernetes",
                severity: "high",
                confidence: "high",
                reason: "base64-decoded-secret",
                regex: /^\s+([A-Za-z0-9_.\-]+):\s*["']?([A-Za-z0-9+/=]{8,500})["']?\s*$/g,
                explanation: "Kubernetes Secret data value decodes to credential material locally.",
              },
              value,
              start,
              end: start + value.length,
              metadata: {
                key,
                decodedPreview: `${decoded.slice(0, 4)}...${decoded.slice(-3)}`,
              },
            });
          }
        }
      }
    }

    offset += line.length;
  }

  return matches;
}

function collectCredentialPairMatches(input: string): CandidateMatch[] {
  const matches: CandidateMatch[] = [];
  const credentialContextRegex =
    /(?:credentials?|login|user(?:name)?|test user)[\s\S]{0,160}\b([A-Za-z][A-Za-z0-9_.@-]{2,64})\s*\/\s*([^\s"'`<>\/]{8,128})/gi;
  let match: RegExpExecArray | null;

  while ((match = credentialContextRegex.exec(input)) !== null) {
    const password = match[2];
    const start = match.index + match[0].lastIndexOf(password);

    matches.push({
      rule: {
        id: "credential-pair-password",
        name: "Credential pair password",
        provider: "Generic",
        severity: "high",
        confidence: "medium",
        reason: "secret-name-context",
        regex: credentialContextRegex,
        explanation: "Nearby text describes credentials and includes a username/password pair.",
      },
      value: password,
      start,
      end: start + password.length,
      metadata: {
        username: match[1],
      },
    });

    if (match[0].length === 0) credentialContextRegex.lastIndex += 1;
  }

  return matches;
}

function decodeKubernetesBase64(value: string): string | null {
  try {
    return atob(value);
  } catch {
    return null;
  }
}

function isPrintableSecretValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 4) return false;
  return /^[\x09\x0a\x0d\x20-\x7e]+$/.test(trimmed);
}

function removeOverlapping(matches: CandidateMatch[]): CandidateMatch[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start || matchPriority(b) - matchPriority(a));

  const selected: CandidateMatch[] = [];
  for (const match of sorted) {
    const overlapIndex = selected.findIndex((existing) => match.start < existing.end && match.end > existing.start);
    if (overlapIndex === -1) {
      selected.push(match);
      continue;
    }

    if (matchPriority(match) > matchPriority(selected[overlapIndex])) {
      selected[overlapIndex] = match;
    }
  }

  return selected;
}

function matchPriority(match: CandidateMatch): number {
  let score = 10;
  if (match.rule.reason === "private-key-block") score = 100;
  else if (match.rule.reason === "jwt-structure") score = 90;
  else if (match.rule.reason === "credential-url") score = 85;
  else if (match.rule.reason === "provider-pattern") score = 80;
  else if (match.rule.reason === "base64-decoded-secret") score = 70;
  else if (match.rule.reason === "secret-name-context") score = 55;
  // Provider-specific rules beat same-reason generic/catch-all fallbacks at the same position.
  // "Private Key" is the catch-all provider for generic PEM blocks, treated the same as "Generic".
  if (match.rule.provider !== "Generic" && match.rule.provider !== "Private Key") score += 1;
  return score;
}

function createFinding(input: string, lineStarts: number[], match: CandidateMatch, ordinal: number): SecretFinding {
  const position = getLinePosition(input, lineStarts, match.start);
  const contextStart = Math.max(0, position.lineStart - 160);
  const contextEnd = Math.min(input.length, position.lineEnd + 160);
  const placeholder = isLikelyPlaceholder(match.value, position.text);
  const fingerprint = fingerprintSecret(match.value);
  const jwtMetadata = match.rule.id === "jwt-token" ? decodeJwtMetadata(match.value) : null;

  const baseFinding: SecretFinding = {
    id: `${match.rule.id}-${position.line}-${position.column}-${fingerprint}`,
    ruleId: match.rule.id,
    provider: match.rule.provider,
    type: match.rule.name,
    severity: match.rule.severity,
    confidence: match.rule.confidence,
    reason: placeholder ? "likely-placeholder" : match.rule.reason,
    explanation: placeholder
      ? "The value matched a secret pattern, but common placeholder indicators were found nearby."
      : match.rule.explanation,
    remediation: match.rule.remediation ?? DEFAULT_REMEDIATION,
    start: match.start,
    end: match.end,
    line: position.line,
    column: position.column,
    value: match.value,
    redactedValue: redactValue(match.value, match.rule.provider, ordinal),
    fingerprint,
    preview: position.text.replace(match.value, redactValue(match.value, match.rule.provider, ordinal)),
    context: input.slice(contextStart, contextEnd).replace(match.value, redactValue(match.value, match.rule.provider, ordinal)),
    addedLine: isDiffAddedLine(position.text),
    status: "open",
    metadata: match.metadata ?? jwtMetadata ?? undefined,
  };

  return adjustFindingForContext(baseFinding);
}

export function scanSecrets(input: string): SecretScanResult {
  if (!input.trim()) {
    return {
      findings: [],
      redactedContent: "",
      summary: {
        total: 0,
        criticalHigh: 0,
        providers: [],
        addedLineFindings: 0,
        privateKeys: 0,
      },
    };
  }

  const lineStarts = buildLineStarts(input);
  const matches = removeOverlapping([
    ...collectRuleMatches(input),
    ...collectKubernetesSecretMatches(input),
    ...collectCredentialPairMatches(input),
    ...collectEntropyMatches(input),
  ]);
  const findings = matches
    .map((match, index) => createFinding(input, lineStarts, match, index + 1))
    .filter((finding) => !isRedactedPlaceholder(finding.value))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.line - b.line);

  const providers = Array.from(new Set(findings.map((finding) => finding.provider))).sort();

  return {
    findings,
    redactedContent: redactContent(input, findings),
    summary: {
      total: findings.length,
      criticalHigh: findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length,
      providers,
      addedLineFindings: findings.filter((finding) => finding.addedLine).length,
      privateKeys: findings.filter((finding) => finding.reason === "private-key-block").length,
    },
  };
}
