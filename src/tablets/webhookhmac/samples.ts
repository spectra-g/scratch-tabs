import type { ProviderId, WebhookHmacData } from './types';
import { createDefaultData } from './serialization';
import { hmacString } from './verifier';

export interface WebhookSample {
  id: ProviderId;
  label: string;
  load(): Promise<WebhookHmacData>;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export const samples: WebhookSample[] = [
  {
    id: 'github',
    label: 'GitHub ping',
    async load() {
      const bodyText = '{"zen":"Keep it logically awesome."}';
      const secret = 'github_sample_secret';
      const signature = await hmacString(secret, bodyText, 'SHA-256', 'hex');
      return {
        ...createDefaultData(),
        providerId: 'github',
        url: 'https://example.com/webhooks/github',
        headersText: `X-GitHub-Event: ping\nX-Hub-Signature-256: sha256=${signature}\nContent-Type: application/json`,
        bodyText,
        secret,
      };
    },
  },
  {
    id: 'stripe',
    label: 'Stripe event',
    async load() {
      const bodyText = '{"id":"evt_test_webhook","object":"event"}';
      const secret = 'whsec_sample_secret';
      const timestamp = String(nowSeconds());
      const signature = await hmacString(secret, `${timestamp}.${bodyText}`, 'SHA-256', 'hex');
      return {
        ...createDefaultData(),
        providerId: 'stripe',
        url: 'https://example.com/webhooks/stripe',
        headersText: `Stripe-Signature: t=${timestamp},v1=${signature}\nContent-Type: application/json`,
        bodyText,
        secret,
      };
    },
  },
  {
    id: 'slack',
    label: 'Slack command',
    async load() {
      const bodyText = 'token=sample&team_id=T123&text=hello';
      const secret = 'slack_sample_secret';
      const timestamp = String(nowSeconds());
      const signature = await hmacString(secret, `v0:${timestamp}:${bodyText}`, 'SHA-256', 'hex');
      return {
        ...createDefaultData(),
        providerId: 'slack',
        url: 'https://example.com/webhooks/slack',
        contentType: 'application/x-www-form-urlencoded',
        headersText: `X-Slack-Request-Timestamp: ${timestamp}\nX-Slack-Signature: v0=${signature}\nContent-Type: application/x-www-form-urlencoded`,
        bodyText,
        secret,
      };
    },
  },
  {
    id: 'shopify',
    label: 'Shopify order',
    async load() {
      const bodyText = '{"shop":"example.myshopify.com","topic":"orders/create"}';
      const secret = 'shopify_sample_secret';
      const signature = await hmacString(secret, bodyText, 'SHA-256', 'base64');
      return {
        ...createDefaultData(),
        providerId: 'shopify',
        url: 'https://example.com/webhooks/shopify',
        headersText: `X-Shopify-Hmac-Sha256: ${signature}\nContent-Type: application/json`,
        bodyText,
        secret,
      };
    },
  },
  {
    id: 'standard',
    label: 'Standard Webhooks',
    async load() {
      const bodyText = '{"type":"invoice.paid"}';
      const secret = 'standard_sample_secret';
      const timestamp = String(nowSeconds());
      const id = 'msg_sample';
      const signature = await hmacString(secret, `${id}.${timestamp}.${bodyText}`, 'SHA-256', 'base64');
      return {
        ...createDefaultData(),
        providerId: 'standard',
        url: 'https://example.com/webhooks/standard',
        headersText: `webhook-id: ${id}\nwebhook-timestamp: ${timestamp}\nwebhook-signature: v1,${signature}\nContent-Type: application/json`,
        bodyText,
        secret,
      };
    },
  },
  {
    id: 'custom',
    label: 'Custom SHA-512',
    async load() {
      const bodyText = 'local-test-payload';
      const secret = 'custom_sample_secret';
      const signature = await hmacString(secret, bodyText, 'SHA-512', 'base64url');
      return {
        ...createDefaultData(),
        providerId: 'custom',
        url: 'https://example.com/webhooks/custom',
        headersText: `X-Signature: ${signature}`,
        bodyText,
        secret,
        customConfig: {
          ...createDefaultData().customConfig,
          algorithm: 'SHA-512',
          encoding: 'base64url',
          headerName: 'X-Signature',
          signedPayloadTemplate: '{body}',
        },
      };
    },
  },
];
