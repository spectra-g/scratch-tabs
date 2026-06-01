import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WebhookHmacUI } from '../WebhookHmacUI';
import { createDefaultData } from '../serialization';
import type { VerificationResult, WebhookHmacData } from '../types';
import { verifyWithProvider } from '../verifier';

const createBackgroundTabMock = jest.fn().mockResolvedValue(undefined);
const mockPendingVerifications: Array<{
  bodyText: string;
  resolve: (result: VerificationResult) => void;
}> = [];

jest.mock('../../bridge/context', () => ({
  useTabletContext: jest.fn(() => ({ tabId: 'webhook-tab-id' })),
}));

jest.mock('../../bridge/hook', () => ({
  useTabletTabCreation: jest.fn(() => ({
    createBackgroundTab: createBackgroundTabMock,
  })),
}));

jest.mock('../verifier', () => ({
  hmacString: jest.fn(),
  verifyWithProvider: jest.fn((_provider, input) => new Promise((resolve) => {
    mockPendingVerifications.push({
      bodyText: input.bodyText,
      resolve: resolve as (result: VerificationResult) => void,
    });
  })),
}));

function result(status: VerificationResult['status'], signedPayloadPreview: string): VerificationResult {
  return {
    status,
    provider: 'github',
    providerLabel: 'GitHub',
    algorithm: 'SHA-256',
    signedPayloadPreview,
    signedPayloadBytes: signedPayloadPreview.length,
    computedSignature: '',
    receivedSignatures: [],
    signatureEncoding: 'hex',
    replayStatus: 'unavailable',
    diagnostics: [],
    probableCauses: [],
    copyableReport: `Webhook HMAC verification: ${status}`,
  };
}

function Harness() {
  const [data, setData] = useState<WebhookHmacData>({
    ...createDefaultData(),
    secret: 'secret',
    headersText: 'X-Hub-Signature-256: sha256=abc',
    bodyText: 'first',
  });

  return <WebhookHmacUI data={data} onChange={setData} />;
}

describe('WebhookHmacUI verification ordering', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPendingVerifications.length = 0;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not let stale auto-verification results overwrite newer results', async () => {
    render(<Harness />);

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(verifyWithProvider).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByTestId('webhook-body-input'), { target: { value: 'second' } });

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(verifyWithProvider).toHaveBeenCalledTimes(2);

    const first = mockPendingVerifications.find((item) => item.bodyText === 'first');
    const second = mockPendingVerifications.find((item) => item.bodyText === 'second');
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    await act(async () => {
      second?.resolve(result('pass', 'second'));
    });
    expect(screen.getByTestId('webhook-verification-status')).toHaveTextContent('Signature verified');

    await act(async () => {
      first?.resolve(result('fail', 'first'));
    });
    expect(screen.getByTestId('webhook-verification-status')).toHaveTextContent('Signature verified');
  });
});
