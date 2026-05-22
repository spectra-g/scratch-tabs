import {
  TAG,
  AsnNode,
  parseDer,
  decodeOid,
  decodeString,
  decodeTime,
  decodeInteger,
  findChild,
  findChildren,
} from "./derParser";
import { oidToName } from "./oidMap";

export interface DistinguishedName {
  CN?: string;
  O?: string;
  OU?: string;
  C?: string;
  ST?: string;
  L?: string;
  [attr: string]: string | undefined;
}

export interface SubjectAltName {
  type: "DNS" | "IP" | "Email" | "URI" | "Other";
  value: string;
}

export interface X509Certificate {
  version: number;
  serialNumber: string;
  subject: DistinguishedName;
  issuer: DistinguishedName;
  notBefore: Date;
  notAfter: Date;
  subjectAltNames: SubjectAltName[];
  keyAlgorithm: string;
  /** RSA key size in bits, undefined for non-RSA. */
  keyBits?: number;
  signatureAlgorithm: string;
  isCA: boolean;
  isSelfSigned: boolean;
  keyUsage: string[];
  extKeyUsage: string[];
}

export type PemBlock =
  | { type: "CERTIFICATE"; parsed: X509Certificate; der: Uint8Array; raw: string }
  | { type: "PRIVATE_KEY"; keyType: string; raw: string }
  | { type: "PUBLIC_KEY"; keyType: string; raw: string }
  | { type: "CSR"; subject?: DistinguishedName; raw: string }
  | { type: "OTHER"; label: string; raw: string };

// ────────────────────────────────────────────────────────────────────────────
// Name parsing
// ────────────────────────────────────────────────────────────────────────────

function parseName(nameNode: AsnNode): DistinguishedName {
  const dn: DistinguishedName = {};
  for (const rdnSet of findChildren(nameNode, TAG.SET)) {
    for (const atv of findChildren(rdnSet, TAG.SEQUENCE)) {
      const oidNode = findChild(atv, TAG.OID);
      if (!oidNode) continue;
      const oid = decodeOid(oidNode.value);
      const shortName = oidToName(oid);
      // The value follows the OID — it's the second child
      const valNode = atv.children[1];
      if (!valNode) continue;
      const strValue = decodeString(valNode.tag, valNode.value);
      dn[shortName] = strValue;
    }
  }
  return dn;
}

// ────────────────────────────────────────────────────────────────────────────
// Extension parsing
// ────────────────────────────────────────────────────────────────────────────

function parseSAN(extValueBytes: Uint8Array): SubjectAltName[] {
  const results: SubjectAltName[] = [];
  try {
    const seqNode = parseDer(extValueBytes);
    for (const entry of seqNode.children) {
      const tag = entry.tag & 0x1f; // low 5 bits = context tag number
      switch (tag) {
        case 1: // rfc822Name (email)
          results.push({ type: "Email", value: new TextDecoder().decode(entry.value) });
          break;
        case 2: // dNSName
          results.push({ type: "DNS", value: new TextDecoder().decode(entry.value) });
          break;
        case 6: // uniformResourceIdentifier
          results.push({ type: "URI", value: new TextDecoder().decode(entry.value) });
          break;
        case 7: // iPAddress
          if (entry.value.length === 4) {
            results.push({ type: "IP", value: Array.from(entry.value).join(".") });
          } else if (entry.value.length === 16) {
            const groups: string[] = [];
            for (let i = 0; i < 16; i += 2) {
              groups.push(
                ((entry.value[i] << 8) | entry.value[i + 1])
                  .toString(16)
                  .padStart(4, "0"),
              );
            }
            results.push({ type: "IP", value: groups.join(":") });
          }
          break;
        default:
          results.push({ type: "Other", value: `[${tag}]` });
      }
    }
  } catch {
    // Malformed extension — ignore
  }
  return results;
}

const KEY_USAGE_BITS = [
  "digitalSignature",
  "nonRepudiation",
  "keyEncipherment",
  "dataEncipherment",
  "keyAgreement",
  "keyCertSign",
  "cRLSign",
  "encipherOnly",
  "decipherOnly",
];

function parseKeyUsage(bytes: Uint8Array): string[] {
  if (bytes.length < 2) return [];
  // BIT STRING: first byte = unused bits count
  const unusedBits = bytes[0];
  const usage: string[] = [];
  for (let byteIdx = 1; byteIdx < bytes.length; byteIdx++) {
    for (let bit = 7; bit >= 0; bit--) {
      const bitIndex = (byteIdx - 1) * 8 + (7 - bit);
      if (bitIndex >= KEY_USAGE_BITS.length) break;
      if (byteIdx === bytes.length - 1 && bit < unusedBits) break;
      if (bytes[byteIdx] & (1 << bit)) {
        usage.push(KEY_USAGE_BITS[bitIndex]);
      }
    }
  }
  return usage;
}

function parseExtKeyUsage(extValueBytes: Uint8Array): string[] {
  try {
    const seq = parseDer(extValueBytes);
    return findChildren(seq, TAG.OID).map((n) => oidToName(decodeOid(n.value)));
  } catch {
    return [];
  }
}

function parseExtensions(
  extsCtxNode: AsnNode,
): Pick<X509Certificate, "subjectAltNames" | "isCA" | "keyUsage" | "extKeyUsage"> {
  const result = {
    subjectAltNames: [] as SubjectAltName[],
    isCA: false,
    keyUsage: [] as string[],
    extKeyUsage: [] as string[],
  };

  try {
    // [3] EXPLICIT → SEQUENCE of Extension
    const extSeq = extsCtxNode.children[0];
    if (!extSeq) return result;

    for (const extSeqNode of findChildren(extSeq, TAG.SEQUENCE)) {
      const oidNode = findChild(extSeqNode, TAG.OID);
      if (!oidNode) continue;
      const oid = decodeOid(oidNode.value);

      // Extension value is wrapped in an OCTET STRING
      const octetNode = findChild(extSeqNode, TAG.OCTET_STRING);
      if (!octetNode) continue;

      switch (oid) {
        case "2.5.29.17": // subjectAltName
          result.subjectAltNames = parseSAN(octetNode.value);
          break;
        case "2.5.29.19": { // basicConstraints
          try {
            const bc = parseDer(octetNode.value);
            const boolNode = findChild(bc, TAG.BOOLEAN);
            result.isCA = boolNode ? boolNode.value[0] !== 0 : false;
          } catch {
            // ignore
          }
          break;
        }
        case "2.5.29.15": { // keyUsage — wrapped in BIT STRING
          try {
            const kuSeq = parseDer(octetNode.value);
            const bitNode = findChild(kuSeq, TAG.BIT_STRING);
            if (bitNode) result.keyUsage = parseKeyUsage(bitNode.value);
          } catch {
            // ignore
          }
          break;
        }
        case "2.5.29.37": // extKeyUsage
          result.extKeyUsage = parseExtKeyUsage(octetNode.value);
          break;
      }
    }
  } catch {
    // Malformed extensions — return partial result
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Public key algorithm + key size
// ────────────────────────────────────────────────────────────────────────────

function parseKeyAlgorithm(spkiNode: AsnNode): string {
  try {
    const algSeq = findChild(spkiNode, TAG.SEQUENCE);
    if (!algSeq) return "Unknown";
    const oidNode = findChild(algSeq, TAG.OID);
    if (!oidNode) return "Unknown";
    const oid = decodeOid(oidNode.value);
    const name = oidToName(oid);

    if (name === "EC") {
      const curveOidNode = algSeq.children[1];
      if (curveOidNode?.tag === TAG.OID) {
        return `ECDSA (${oidToName(decodeOid(curveOidNode.value))})`;
      }
      return "ECDSA";
    }

    return name;
  } catch {
    return "Unknown";
  }
}

/**
 * For RSA keys, parse the modulus from the SubjectPublicKeyInfo BIT STRING
 * and return the key size in bits.
 */
function parseRsaKeyBits(spkiNode: AsnNode): number | undefined {
  try {
    const algSeq = findChild(spkiNode, TAG.SEQUENCE);
    if (!algSeq) return undefined;
    const oidNode = findChild(algSeq, TAG.OID);
    if (!oidNode) return undefined;
    if (oidToName(decodeOid(oidNode.value)) !== "RSA") return undefined;

    // BIT STRING is the second child of SubjectPublicKeyInfo
    const bitStringNode = spkiNode.children[1];
    if (!bitStringNode || bitStringNode.tag !== TAG.BIT_STRING) return undefined;

    // BIT STRING value: first byte = unused bits, rest = DER of RSAPublicKey
    const rsaKeyDer = bitStringNode.value.slice(1);
    const rsaKeySeq = parseDer(rsaKeyDer);
    const modulusNode = rsaKeySeq.children[0];
    if (!modulusNode || modulusNode.tag !== TAG.INTEGER) return undefined;

    // The modulus may have a leading 0x00 byte (sign bit); strip it
    let modBytes = modulusNode.value;
    if (modBytes[0] === 0x00) modBytes = modBytes.slice(1);
    return modBytes.length * 8;
  } catch {
    return undefined;
  }
}

/** Compute SHA-256 fingerprint of DER bytes as uppercase hex pairs. */
export async function computeFingerprint(der: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", der);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":");
}

function dnToString(dn: DistinguishedName): string {
  return Object.entries(dn)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

// ────────────────────────────────────────────────────────────────────────────
// Main certificate parser
// ────────────────────────────────────────────────────────────────────────────

export function parseX509Certificate(der: Uint8Array): X509Certificate {
  const certSeq = parseDer(der);

  // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
  const tbs = certSeq.children[0];
  if (!tbs) throw new Error("Missing TBSCertificate");

  let fieldIndex = 0;

  // version [0] EXPLICIT INTEGER (optional, defaults to v1)
  let version = 1;
  if (tbs.children[fieldIndex]?.tag === TAG.CTX_0) {
    const versionNode = tbs.children[fieldIndex].children[0];
    if (versionNode) version = versionNode.value[0] + 1;
    fieldIndex++;
  }

  // serialNumber INTEGER
  const serialNode = tbs.children[fieldIndex++];
  const serialNumber = serialNode ? decodeInteger(serialNode.value) : "";

  // signature AlgorithmIdentifier (skip)
  fieldIndex++;

  // issuer Name
  const issuerNode = tbs.children[fieldIndex++];
  const issuer = issuerNode ? parseName(issuerNode) : {};

  // validity Validity
  const validityNode = tbs.children[fieldIndex++];
  let notBefore = new Date(0);
  let notAfter = new Date(0);
  if (validityNode) {
    const nb = validityNode.children[0];
    const na = validityNode.children[1];
    if (nb) notBefore = decodeTime(nb.tag, nb.value);
    if (na) notAfter = decodeTime(na.tag, na.value);
  }

  // subject Name
  const subjectNode = tbs.children[fieldIndex++];
  const subject = subjectNode ? parseName(subjectNode) : {};

  // subjectPublicKeyInfo
  const spkiNode = tbs.children[fieldIndex++];
  const keyAlgorithm = spkiNode ? parseKeyAlgorithm(spkiNode) : "Unknown";
  const keyBits = spkiNode ? parseRsaKeyBits(spkiNode) : undefined;

  // Extensions [3] (optional)
  let subjectAltNames: SubjectAltName[] = [];
  let isCA = false;
  let keyUsage: string[] = [];
  let extKeyUsage: string[] = [];

  for (let i = fieldIndex; i < tbs.children.length; i++) {
    if (tbs.children[i].tag === TAG.CTX_3) {
      const ext = parseExtensions(tbs.children[i]);
      subjectAltNames = ext.subjectAltNames;
      isCA = ext.isCA;
      keyUsage = ext.keyUsage;
      extKeyUsage = ext.extKeyUsage;
      break;
    }
  }

  // Signature algorithm (second child of outer Certificate SEQUENCE)
  let signatureAlgorithm = "Unknown";
  const sigAlgSeq = certSeq.children[1];
  if (sigAlgSeq) {
    const sigOidNode = findChild(sigAlgSeq, TAG.OID);
    if (sigOidNode) signatureAlgorithm = oidToName(decodeOid(sigOidNode.value));
  }

  const isSelfSigned = dnToString(subject) === dnToString(issuer);

  return {
    version,
    serialNumber,
    subject,
    issuer,
    notBefore,
    notAfter,
    subjectAltNames,
    keyAlgorithm,
    keyBits,
    signatureAlgorithm,
    isCA,
    isSelfSigned,
    keyUsage,
    extKeyUsage,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PEM block parsing
// ────────────────────────────────────────────────────────────────────────────

const PEM_BLOCK_RE =
  /-----BEGIN ([A-Z0-9 ]+)-----\r?\n([\s\S]*?)\r?\n-----END \1-----/g;

export function parsePemBlocks(content: string): PemBlock[] {
  const blocks: PemBlock[] = [];

  for (const match of content.matchAll(PEM_BLOCK_RE)) {
    const label = match[1].trim();
    const b64 = match[2].replace(/\s+/g, "");
    const raw = match[0];

    let der: Uint8Array;
    try {
      der = base64ToDer(b64);
    } catch {
      blocks.push({ type: "OTHER", label, raw });
      continue;
    }

    if (label === "CERTIFICATE") {
      try {
        const parsed = parseX509Certificate(der);
        blocks.push({ type: "CERTIFICATE", parsed, der, raw });
        continue;
      } catch {
        // Fall through to OTHER
      }
    }

    if (label.includes("PRIVATE KEY")) {
      blocks.push({ type: "PRIVATE_KEY", keyType: extractKeyType(label), raw });
      continue;
    }

    if (label.includes("PUBLIC KEY")) {
      blocks.push({ type: "PUBLIC_KEY", keyType: extractKeyType(label), raw });
      continue;
    }

    if (label.includes("CERTIFICATE REQUEST")) {
      try {
        const csr = parseCsr(der);
        blocks.push({ type: "CSR", subject: csr, raw });
      } catch {
        blocks.push({ type: "CSR", raw });
      }
      continue;
    }

    blocks.push({ type: "OTHER", label, raw });
  }

  return blocks;
}

function base64ToDer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extractKeyType(label: string): string {
  if (label.startsWith("RSA")) return "RSA";
  if (label.startsWith("EC")) return "EC";
  if (label.startsWith("DSA")) return "DSA";
  if (label === "PRIVATE KEY" || label === "ENCRYPTED PRIVATE KEY") return "PKCS#8";
  return label.split(" ")[0];
}

function parseCsr(der: Uint8Array): DistinguishedName {
  // CertificationRequest ::= SEQUENCE { certificationRequestInfo, signatureAlgorithm, signature }
  // certificationRequestInfo ::= SEQUENCE { version, subject, subjectPKInfo, attributes }
  const csrSeq = parseDer(der);
  const csrInfo = csrSeq.children[0];
  if (!csrInfo) return {};
  const subjectNode = csrInfo.children[1];
  if (!subjectNode) return {};
  return parseName(subjectNode);
}
