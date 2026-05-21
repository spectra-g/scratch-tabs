/** Maps OID dot-notation strings to human-readable names. */
export const OID_MAP: Record<string, string> = {
  // Distinguished Name attributes
  "2.5.4.3": "CN",
  "2.5.4.4": "SN",
  "2.5.4.5": "serialNumber",
  "2.5.4.6": "C",
  "2.5.4.7": "L",
  "2.5.4.8": "ST",
  "2.5.4.9": "street",
  "2.5.4.10": "O",
  "2.5.4.11": "OU",
  "2.5.4.12": "title",
  "2.5.4.17": "postalCode",
  "2.5.4.42": "GN",
  "2.5.4.43": "initials",
  "2.5.4.65": "pseudonym",
  "1.2.840.113549.1.9.1": "emailAddress",

  // Public key algorithms
  "1.2.840.113549.1.1.1": "RSA",
  "1.2.840.10040.4.1": "DSA",
  "1.2.840.10045.2.1": "EC",
  "1.3.101.110": "X25519",
  "1.3.101.111": "X448",
  "1.3.101.112": "Ed25519",
  "1.3.101.113": "Ed448",

  // Signature algorithms
  "1.2.840.113549.1.1.4": "MD5withRSA",
  "1.2.840.113549.1.1.5": "SHA1withRSA",
  "1.2.840.113549.1.1.11": "SHA256withRSA",
  "1.2.840.113549.1.1.12": "SHA384withRSA",
  "1.2.840.113549.1.1.13": "SHA512withRSA",
  "1.2.840.113549.1.1.14": "SHA224withRSA",
  "1.2.840.10045.4.3.1": "ECDSAwithSHA224",
  "1.2.840.10045.4.3.2": "ECDSAwithSHA256",
  "1.2.840.10045.4.3.3": "ECDSAwithSHA384",
  "1.2.840.10045.4.3.4": "ECDSAwithSHA512",
  "1.2.840.10040.4.3": "SHA1withDSA",

  // Named EC curves
  "1.2.840.10045.3.1.7": "P-256",
  "1.3.132.0.34": "P-384",
  "1.3.132.0.35": "P-521",
  "1.3.132.0.1": "K-163",
  "1.3.132.0.10": "secp256k1",

  // Extensions
  "2.5.29.14": "subjectKeyIdentifier",
  "2.5.29.15": "keyUsage",
  "2.5.29.17": "subjectAltName",
  "2.5.29.18": "issuerAltName",
  "2.5.29.19": "basicConstraints",
  "2.5.29.31": "cRLDistributionPoints",
  "2.5.29.32": "certificatePolicies",
  "2.5.29.35": "authorityKeyIdentifier",
  "2.5.29.37": "extKeyUsage",
  "1.3.6.1.5.5.7.1.1": "authorityInfoAccess",
  "1.3.6.1.5.5.7.48.1": "OCSP",
  "1.3.6.1.5.5.7.48.2": "caIssuers",

  // Extended key usage
  "1.3.6.1.5.5.7.3.1": "serverAuth",
  "1.3.6.1.5.5.7.3.2": "clientAuth",
  "1.3.6.1.5.5.7.3.3": "codeSigning",
  "1.3.6.1.5.5.7.3.4": "emailProtection",
  "1.3.6.1.5.5.7.3.8": "timeStamping",
  "1.3.6.1.5.5.7.3.9": "OCSPSigning",
};

export function oidToName(oid: string): string {
  return OID_MAP[oid] ?? oid;
}
