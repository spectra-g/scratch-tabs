import {
  createInitialState,
  deserializeWebhookHmacState,
  serializeWebhookHmacState,
} from '../serialization';

describe('webhook HMAC serialization', () => {
  it('stores request fields and encodes the signing secret', () => {
    const state = createInitialState({
      secret: 'super-secret',
      headersText: 'Stripe-Signature: t=1,v1=abc',
      bodyText: '{"customer":"cus_123"}',
      showSecret: true,
    });

    const saved = JSON.parse(serializeWebhookHmacState(state));

    expect(saved.data.secret).toBe('');
    expect(saved.data.encodedSecret).toBe('c3VwZXItc2VjcmV0');
    expect(saved.data.headersText).toBe('Stripe-Signature: t=1,v1=abc');
    expect(saved.data.bodyText).toBe('{"customer":"cus_123"}');
    expect(saved.data.showSecret).toBe(false);
  });

  it('recovers defaults from invalid JSON', () => {
    expect(deserializeWebhookHmacState('not json').type).toBe('webhookhmac');
  });

  it('restores encoded secrets while keeping them masked', () => {
    const restored = deserializeWebhookHmacState(JSON.stringify({
      type: 'webhookhmac',
      data: {
        secret: '',
        encodedSecret: 'c2VjcmV0',
        bodyText: 'body',
        headersText: 'X-Signature: abc',
      },
    }));

    expect(restored.data.secret).toBe('secret');
    expect(restored.data.bodyText).toBe('body');
    expect(restored.data.headersText).toBe('X-Signature: abc');
    expect(restored.data.showSecret).toBe(false);
  });
});
