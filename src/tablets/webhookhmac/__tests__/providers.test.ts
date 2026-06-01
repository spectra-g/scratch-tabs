import { detectProvider, getProvider } from '../providers';
import { defaultCustomConfig } from '../serialization';
import type { VerificationInput } from '../types';

function input(headersText: string): VerificationInput {
  return {
    providerId: 'github',
    method: 'POST',
    url: 'https://example.com/webhook',
    headersText,
    bodyText: '{}',
    secret: 'secret',
    contentType: 'application/json',
    timestampToleranceSeconds: 300,
    customConfig: defaultCustomConfig,
  };
}

describe('webhook HMAC providers', () => {
  it.each([
    ['github', 'X-Hub-Signature-256: sha256=abc'],
    ['stripe', 'Stripe-Signature: t=1700000000,v1=abc'],
    ['slack', 'X-Slack-Signature: v0=abc'],
    ['twilio', 'X-Twilio-Signature: abc'],
    ['shopify', 'X-Shopify-Hmac-Sha256: abc'],
    ['standard', 'webhook-signature: v1,abc'],
  ] as const)('detects %s from headers', (providerId, headersText) => {
    expect(detectProvider(input(headersText)).providerId).toBe(providerId);
  });

  it('builds the Twilio URL plus sorted form parameter canonical string', () => {
    const payload = getProvider('twilio').buildSignedPayload({
      ...input('Content-Type: application/x-www-form-urlencoded\nX-Twilio-Signature: abc'),
      providerId: 'twilio',
      url: 'https://example.com/webhooks/twilio?foo=bar',
      bodyText: 'Body=Hello&From=%2B15551234567&To=%2B15557654321',
      contentType: 'application/x-www-form-urlencoded',
    });

    expect(payload.text).toBe('https://example.com/webhooks/twilio?foo=barBodyHelloFrom+15551234567To+15557654321');
  });

  it('sorts duplicate Twilio form parameter names by value using strict lexical comparison', () => {
    const payload = getProvider('twilio').buildSignedPayload({
      ...input('Content-Type: application/x-www-form-urlencoded\nX-Twilio-Signature: abc'),
      providerId: 'twilio',
      url: 'https://example.com/webhooks/twilio',
      bodyText: 'Digits=9&Digits=1&Body=Hello',
      contentType: 'application/x-www-form-urlencoded',
    });

    expect(payload.text).toBe('https://example.com/webhooks/twilioBodyHelloDigits1Digits9');
  });

  it('builds Standard Webhooks canonical payload', () => {
    const payload = getProvider('standard').buildSignedPayload({
      ...input('webhook-id: msg_1\nwebhook-timestamp: 1700000000\nwebhook-signature: v1,abc'),
      providerId: 'standard',
      bodyText: '{"ok":true}',
    });

    expect(payload.text).toBe('msg_1.1700000000.{"ok":true}');
  });
});
