import { providerRules } from "../rules/providerRules";
import { secretRules } from "../rules";

function rule(id: string) {
  const found = providerRules.find((item) => item.id === id);
  if (!found) throw new Error(`Missing rule ${id}`);
  found.regex.lastIndex = 0;
  return found;
}

describe("secret scanner provider rules", () => {
  it("can reconstruct every scanner rule regex from source and flags", () => {
    for (const scannerRule of secretRules) {
      expect(() => new RegExp(scannerRule.regex.source, scannerRule.regex.flags)).not.toThrow();
    }
  });

  it("matches AWS access key IDs", () => {
    const match = rule("aws-access-key-id").regex.exec("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE");
    expect(match?.[1]).toBe("AKIAIOSFODNN7EXAMPLE");
  });

  it("matches GitHub fine-grained tokens", () => {
    const token = "github_pat_11AAABBBB_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
    expect(rule("github-token").regex.test(token)).toBe(true);
  });

  it("matches database URLs with credentials", () => {
    const value = "postgres://user:pass123@db.example.com:5432/app";
    expect(rule("database-url").regex.test(value)).toBe(true);
  });

  it("matches Redis URLs with password-only credentials", () => {
    const value = "redis://:p4ssw0rd_redis_9988@redis-cluster.local:6379/0";
    expect(rule("database-url").regex.test(value)).toBe(true);
  });

  it("matches npm access tokens", () => {
    const value = "npm_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890";
    expect(rule("npm-token").regex.test(value)).toBe(true);
  });

  it("matches Google OAuth access tokens", () => {
    const value = "ya29.a0AfB_byC1234567890abcdefghijklmnopqrstuvwxyz_-";
    expect(rule("google-oauth-token").regex.test(value)).toBe(true);
  });

  it("matches Discord webhook URLs", () => {
    const value = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_123456";
    expect(rule("discord-webhook").regex.test(value)).toBe(true);
  });
});
