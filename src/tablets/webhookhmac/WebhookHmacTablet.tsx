import React from 'react';
import type { Tablet } from '../types';
import { WebhookHmacRuntime } from './WebhookHmacRuntime';
import type { WebhookHmacState } from './types';
import {
  createInitialState,
  deserializeWebhookHmacState,
  serializeWebhookHmacState,
} from './serialization';

export default {
  id: 'webhookhmac',
  label: 'Webhook HMAC Verifier',
  keywords: [
    'webhook',
    'hmac',
    'signature',
    'stripe',
    'github',
    'slack',
    'twilio',
    'shopify',
    'svix',
    'standard webhooks',
    'verify',
    'security',
  ],
  createInitialState,
  serializeState: serializeWebhookHmacState,
  deserializeState: deserializeWebhookHmacState,
  render: (state: WebhookHmacState, onChange: (state: WebhookHmacState) => void) =>
    React.createElement(WebhookHmacRuntime, { state, onChange }),
} satisfies Tablet;
