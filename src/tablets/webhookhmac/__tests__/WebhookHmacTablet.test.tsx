import React, { useState } from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import WebhookHmacTablet from '../WebhookHmacTablet';
import type { WebhookHmacState } from '../types';

const createBackgroundTabMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../../bridge/context', () => ({
  useTabletContext: jest.fn(() => ({ tabId: 'webhook-tab-id' })),
}));

jest.mock('../../bridge/hook', () => ({
  useTabletTabCreation: jest.fn(() => ({
    createBackgroundTab: createBackgroundTabMock,
  })),
}));

function Harness() {
  const [state, setState] = useState<WebhookHmacState>(
    WebhookHmacTablet.createInitialState() as WebhookHmacState,
  );

  return (
    <>
      {WebhookHmacTablet.render(state, (nextState) => {
        const serialized = WebhookHmacTablet.serializeState(nextState);
        setState(JSON.parse(serialized));
      })}
    </>
  );
}

describe('WebhookHmacTablet runtime state', () => {
  beforeEach(() => {
    createBackgroundTabMock.mockClear();
  });

  it('keeps request fields editable through live serialization', () => {
    render(<Harness />);

    const secret = screen.getByTestId('webhook-secret-input') as HTMLInputElement;
    const headers = screen.getByTestId('webhook-headers-input') as HTMLTextAreaElement;
    const body = screen.getByTestId('webhook-body-input') as HTMLTextAreaElement;

    fireEvent.change(secret, { target: { value: 'github_sample_secret' } });
    fireEvent.change(headers, { target: { value: 'X-Hub-Signature-256: sha256=abc' } });
    fireEvent.change(body, { target: { value: '{"zen":"test"}' } });

    expect(secret.value).toBe('github_sample_secret');
    expect(headers.value).toBe('X-Hub-Signature-256: sha256=abc');
    expect(body.value).toBe('{"zen":"test"}');
  });

  it('restores request fields after the tablet is remounted', () => {
    const initial = WebhookHmacTablet.createInitialState({
      secret: 'github_sample_secret',
      headersText: 'X-Hub-Signature-256: sha256=abc',
      bodyText: '{"zen":"test"}',
    }) as WebhookHmacState;
    const serialized = WebhookHmacTablet.serializeState(initial);
    const restored = WebhookHmacTablet.deserializeState(serialized) as WebhookHmacState;

    expect(restored.data.secret).toBe('github_sample_secret');
    expect(restored.data.headersText).toBe('X-Hub-Signature-256: sha256=abc');
    expect(restored.data.bodyText).toBe('{"zen":"test"}');
    expect(restored.data.showSecret).toBe(false);
  });

  it('restores encoded secrets from JSON-parsed tablet state during normal rendering', () => {
    const initial = WebhookHmacTablet.createInitialState({
      secret: 'github_sample_secret',
      headersText: 'X-Hub-Signature-256: sha256=abc',
      bodyText: '{"zen":"test"}',
    }) as WebhookHmacState;
    const jsonParsedState = JSON.parse(WebhookHmacTablet.serializeState(initial)) as WebhookHmacState;

    const { unmount } = render(WebhookHmacTablet.render(jsonParsedState, jest.fn()) as React.ReactElement);
    expect((screen.getByTestId('webhook-secret-input') as HTMLInputElement).value).toBe('github_sample_secret');
    unmount();
    cleanup();

    render(WebhookHmacTablet.render(jsonParsedState, jest.fn()) as React.ReactElement);
    expect((screen.getByTestId('webhook-secret-input') as HTMLInputElement).value).toBe('github_sample_secret');
  });

  it('opens the safe report in a background markdown tab', async () => {
    const bodyText = '{"zen":"Keep it logically awesome."}';
    const state = WebhookHmacTablet.createInitialState({
      secret: 'github_sample_secret',
      headersText: 'X-Hub-Signature-256: sha256=b143bbdd7e1c889ac9231cbd1bde5d39e5c5e7bd62a6fdd013baeffe4717c7d4',
      bodyText,
    }) as WebhookHmacState;

    render(WebhookHmacTablet.render(state, jest.fn()) as React.ReactElement);
    fireEvent.click(screen.getByTestId('webhook-verify-button'));
    await screen.findByText('Signature verified');

    fireEvent.click(screen.getByRole('button', { name: /open report/i }));

    expect(createBackgroundTabMock).toHaveBeenCalledWith(
      'Webhook HMAC Report.md',
      expect.stringContaining('Webhook HMAC verification: pass'),
      'markdown',
      'webhook-tab-id',
    );
  });
});
