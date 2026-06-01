import { getProvider } from '../providers';
import { defaultCustomConfig } from '../serialization';
import {
  constantTimeEqual,
  hmacString,
  signatureToBytes,
  verifyWithProvider,
} from '../verifier';
import type { VerificationInput } from '../types';

function input(overrides: Partial<VerificationInput>): VerificationInput {
  return {
    providerId: 'github',
    method: 'POST',
    url: 'https://example.com/webhook',
    headersText: '',
    bodyText: '',
    secret: 'secret',
    contentType: 'application/json',
    timestampToleranceSeconds: 300,
    customConfig: defaultCustomConfig,
    nowSeconds: 1_700_000_000,
    ...overrides,
  };
}

describe('webhook HMAC verifier', () => {
  it('compares equal-length byte arrays without string equality', () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(false);
  });

  it('decodes unpadded standard base64 signatures', () => {
    expect(signatureToBytes('AQID', 'base64')).toEqual(new Uint8Array([1, 2, 3]));
    expect(signatureToBytes('AQIDBA', 'base64')).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('verifies GitHub SHA-256 signatures', async () => {
    const bodyText = '{"zen":"Keep it logically awesome."}';
    const secret = 'github_sample_secret';
    const signature = await hmacString(secret, bodyText, 'SHA-256', 'hex');

    const result = await verifyWithProvider(getProvider('github'), input({
      providerId: 'github',
      secret,
      bodyText,
      headersText: `X-Hub-Signature-256: sha256=${signature}`,
    }));

    expect(result.status).toBe('pass');
    expect(result.matchedSignature).toBe(`sha256=${signature}`);
  });

  it('fails GitHub when body bytes change', async () => {
    const signature = await hmacString('secret', '{"a":1}', 'SHA-256', 'hex');
    const result = await verifyWithProvider(getProvider('github'), input({
      bodyText: '{"a":2}',
      headersText: `X-Hub-Signature-256: sha256=${signature}`,
    }));

    expect(result.status).toBe('fail');
    expect(result.diagnostics.some((item) => item.title === 'Signature mismatch')).toBe(true);
  });

  it('verifies Stripe signatures and flags stale timestamps', async () => {
    const bodyText = '{"id":"evt_test_webhook","object":"event"}';
    const timestamp = 1_699_999_000;
    const secret = 'whsec_sample_secret';
    const signature = await hmacString(secret, `${timestamp}.${bodyText}`, 'SHA-256', 'hex');

    const result = await verifyWithProvider(getProvider('stripe'), input({
      providerId: 'stripe',
      bodyText,
      secret,
      headersText: `Stripe-Signature: t=${timestamp},v1=${signature}`,
    }));

    expect(result.status).toBe('warning');
    expect(result.replayStatus).toBe('stale');
  });

  it('verifies Slack v0 signatures', async () => {
    const bodyText = 'token=sample&team_id=T123&text=hello';
    const timestamp = 1_700_000_000;
    const secret = 'slack_sample_secret';
    const signature = await hmacString(secret, `v0:${timestamp}:${bodyText}`, 'SHA-256', 'hex');

    const result = await verifyWithProvider(getProvider('slack'), input({
      providerId: 'slack',
      bodyText,
      secret,
      contentType: 'application/x-www-form-urlencoded',
      headersText: `X-Slack-Request-Timestamp: ${timestamp}\nX-Slack-Signature: v0=${signature}`,
    }));

    expect(result.status).toBe('pass');
    expect(result.replayStatus).toBe('valid');
  });

  it('verifies Shopify base64 signatures', async () => {
    const bodyText = '{"shop":"example.myshopify.com","topic":"orders/create"}';
    const secret = 'shopify_sample_secret';
    const signature = await hmacString(secret, bodyText, 'SHA-256', 'base64');

    const result = await verifyWithProvider(getProvider('shopify'), input({
      providerId: 'shopify',
      bodyText,
      secret,
      headersText: `X-Shopify-Hmac-Sha256: ${signature}`,
    }));

    expect(result.status).toBe('pass');
    expect(result.signatureEncoding).toBe('base64');
  });

  it('verifies custom SHA-512 base64url signatures', async () => {
    const bodyText = 'local-test-payload';
    const secret = 'custom_sample_secret';
    const customConfig = {
      ...defaultCustomConfig,
      algorithm: 'SHA-512' as const,
      encoding: 'base64url' as const,
      headerName: 'X-Signature',
      signedPayloadTemplate: '{body}',
    };
    const signature = await hmacString(secret, bodyText, 'SHA-512', 'base64url');

    const result = await verifyWithProvider(getProvider('custom', customConfig), input({
      providerId: 'custom',
      bodyText,
      secret,
      customConfig,
      contentType: 'text/plain',
      headersText: `X-Signature: ${signature}`,
    }));

    expect(result.status).toBe('pass');
    expect(signatureToBytes(signature, 'base64url')).not.toBeNull();
  });
});
