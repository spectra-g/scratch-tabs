import { scanSecrets } from "../engine/scanEngine";

describe("secret scanner engine", () => {
  it("detects provider tokens and produces redacted output", () => {
    const input = [
      "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890",
      "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    ].join("\n");

    const result = scanSecrets(input);

    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((finding) => finding.provider)).toEqual(expect.arrayContaining(["OpenAI", "GitHub"]));
    expect(result.redactedContent).toContain("[REDACTED_OPENAI_");
    expect(result.redactedContent).toContain("[REDACTED_GITHUB_");
    expect(result.redactedContent).not.toContain("abcdefghijklmnopqrstuvwxyz1234567890");
  });

  it("detects private key blocks as critical private key findings", () => {
    const input = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC
-----END PRIVATE KEY-----`;

    const result = scanSecrets(input);

    expect(result.findings[0]).toMatchObject({
      provider: "Private Key",
      severity: "critical",
      reason: "private-key-block",
    });
    expect(result.summary.privateKeys).toBe(1);
  });

  it("marks diff added-line findings", () => {
    const input = "+GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890";
    const result = scanSecrets(input);
    expect(result.findings[0].addedLine).toBe(true);
    expect(result.summary.addedLineFindings).toBe(1);
  });

  it("reduces obvious placeholders to info findings", () => {
    const result = scanSecrets("GITHUB_TOKEN=ghp_example_placeholder_token_1234567890");
    expect(result.findings[0].reason).toBe("likely-placeholder");
    expect(result.findings[0].severity).toBe("info");
  });

  it("decodes JWT metadata locally", () => {
    const token = [
      btoa(JSON.stringify({ alg: "none", typ: "JWT" })).replace(/=/g, ""),
      btoa(JSON.stringify({ iss: "issuer", sub: "subject", iat: 1, exp: 9999999999 })).replace(/=/g, ""),
      "signaturepart",
    ].join(".");

    const result = scanSecrets(`Authorization: Bearer ${token}`);
    const jwtFinding = result.findings.find((finding) => finding.provider === "JWT");

    expect(jwtFinding?.metadata).toMatchObject({
      algorithm: "none",
      issuer: "issuer",
      subject: "subject",
      algNone: true,
    });
  });

  it("classifies npm, Google OAuth, and Discord webhook values as provider findings", () => {
    const input = [
      "NPM_TOKEN=npm_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890",
      "GOOGLE_TOKEN=ya29.a0AfB_byC1234567890abcdefghijklmnopqrstuvwxyz_-",
      "DISCORD_WEBHOOK=https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_123456",
    ].join("\n");

    const result = scanSecrets(input);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "npm", type: "npm access token", severity: "critical" }),
        expect.objectContaining({ provider: "Google", type: "Google OAuth access token", severity: "critical" }),
        expect.objectContaining({ provider: "Discord", type: "Discord webhook URL", severity: "critical" }),
      ]),
    );
  });

  it("detects Redis URIs with embedded password-only credentials", () => {
    const input = "REDIS_URI=redis://:p4ssw0rd_redis_9988@redis-cluster.local:6379/0";

    const result = scanSecrets(input);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "Database",
          type: "Database URL with credentials",
          severity: "critical",
          reason: "credential-url",
        }),
      ]),
    );
    expect(result.redactedContent).toContain("[REDACTED_DATABASE_");
    expect(result.redactedContent).not.toContain("p4ssw0rd_redis_9988");
  });

  it("detects Kubernetes Secret data values by decoding base64 entries", () => {
    const input = [
      "apiVersion: v1",
      "kind: Secret",
      "metadata:",
      "  name: leaked",
      "data:",
      "  username: YWRtaW4=",
      "  password: U3VwZXJTZWNyZXRQYXNzd29yZDEyMyE=",
    ].join("\n");

    const result = scanSecrets(input);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "Kubernetes",
          type: "Kubernetes Secret data value",
          reason: "base64-decoded-secret",
          severity: "high",
          metadata: expect.objectContaining({ key: "password", decodedPreview: "Supe...23!" }),
        }),
      ]),
    );
    expect(result.redactedContent).toContain("[REDACTED_KUBERNETES_");
    expect(result.redactedContent).not.toContain("U3VwZXJTZWNyZXRQYXNzd29yZDEyMyE=");
  });

  it("does not flag URL API paths as credential pair passwords", () => {
    // The word "user" in function generateToken(user) triggered the credential-pair
    // regex which then scanned 160 chars ahead and matched api/v1/notify as user/pass.
    const input = [
      "function generateToken(user) {",
      "  return jwt.sign({ id: user.id }, JWT_SECRET);",
      "}",
      "app.post('/api/v1/notify', async (req, res) => {",
      "  // handler code",
      "});",
    ].join("\n");

    const result = scanSecrets(input);
    const credPairFindings = result.findings.filter((f) => f.ruleId === "credential-pair-password");
    expect(credPairFindings).toHaveLength(0);
  });

  it("prefers Google Cloud over generic Private Key when GCP service account JSON is scanned", () => {
    // Both private-key-block (Generic) and google-service-account-private-key (Google Cloud)
    // share reason "private-key-block" giving them the same base priority. Without the +1 bump
    // for non-generic providers, the generic rule wins because it appears first in secretRules.
    // Use actual newlines inside the JSON value so the google-service-account regex can match.
    const input = `{
  "type": "service_account",
  "project_id": "my-project",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC
-----END RSA PRIVATE KEY-----",
  "client_email": "sa@my-project.iam.gserviceaccount.com"
}`;

    const result = scanSecrets(input);
    const pkFindings = result.findings.filter((f) => f.reason === "private-key-block");
    expect(pkFindings.length).toBeGreaterThan(0);
    expect(pkFindings[0].provider).toBe("Google Cloud");
    expect(pkFindings[0].ruleId).toBe("google-service-account-private-key");
  });

  it("does not flag HTTP URL strings as high-entropy tokens", () => {
    // The URL https://discord.com/api/webhooks/... had enough characters and variety
    // to exceed the Shannon entropy threshold when the preceding quote was the regex boundary.
    const input = `await axios.post('https://discord.com/api/webhooks/1234567890/notareatoken', data)`;

    const result = scanSecrets(input);
    const urlEntropyFindings = result.findings.filter(
      (f) => f.ruleId === "high-entropy-token" && (f.value.startsWith("http") || f.value.startsWith("//")),
    );
    expect(urlEntropyFindings).toHaveLength(0);
  });

  it("detects AWS secret access keys with critical severity", () => {
    // aws-access-key-id exists but the 40-char secret key had no specific rule and
    // fell through to the generic secret-assignment (lower confidence, no AWS provider).
    // Avoid the AWS docs fake key which contains "EXAMPLE" and trips placeholder detection.
    const input = "AWS_SECRET_ACCESS_KEY=xK4mP9vQ2wZ8nB7cL3hF6jR1sT5eY0aI/+Nggmxk";
    const result = scanSecrets(input);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "AWS",
          ruleId: "aws-secret-access-key",
          severity: "critical",
          confidence: "high",
        }),
      ]),
    );
  });

  it("detects Discord bot tokens distinct from webhook URLs", () => {
    // The token format [MN][base64]{23-25}.[base64]{6}.[base64]{27} had no rule;
    // raw bot tokens were only caught by the generic high-entropy fallback.
    const token = "Naaaaaaaaaaaaaaaaaaaaaaaa.GAbcde.aBcDeFgHiJkLmNoPqRsTuVwXyZ_";
    const result = scanSecrets(`DISCORD_TOKEN=${token}`);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "Discord",
          ruleId: "discord-bot-token",
          severity: "critical",
          confidence: "high",
        }),
      ]),
    );
  });

  it("detects punctuation-heavy secret assignments in redacted repository dumps", () => {
    const input = [
      "AWS_ACCESS_KEY_ID=[REDACTED_AWS_1]",
      "GITHUB_PERSONAL_ACCESS_TOKEN=[REDACTED_GITHUB_6]",
      'const JWT_SECRET = "v9y$B&E)H@McQfTjWnZr4u7x!z%C*F-J";',
      'const ADMIN_DASHBOARD_PASS = "admin12345";',
      'crm_api_key = "[REDACTED_GENERIC_9]"',
      "TestUser / Welcome2TheJungle!@#",
    ].join("\n");

    const result = scanSecrets(input);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "Secret-like assignment",
          reason: "secret-name-context",
          severity: "high",
          value: "v9y$B&E)H@McQfTjWnZr4u7x!z%C*F-J",
        }),
      ]),
    );
    expect(result.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: expect.stringContaining("[REDACTED_") }),
      ]),
    );
  });

  it("detects prose username and password credential pairs", () => {
    const input =
      "If you need to debug locally, you can use the following test user credentials:\nTestUser / Welcome2TheJungle!@#";

    const result = scanSecrets(input);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "Credential pair password",
          provider: "Generic",
          severity: "high",
          reason: "secret-name-context",
          value: "Welcome2TheJungle!@#",
          metadata: expect.objectContaining({ username: "TestUser" }),
        }),
      ]),
    );
    expect(result.redactedContent).toContain("TestUser / [REDACTED_GENERIC_");
  });
});
