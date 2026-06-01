import React, { useState } from 'react';
import { WebhookHmacUI } from './WebhookHmacUI';
import type { WebhookHmacData, WebhookHmacState } from './types';
import { hydrateWebhookHmacData } from './serialization';

interface WebhookHmacRuntimeProps {
  state: WebhookHmacState;
  onChange: (state: WebhookHmacState) => void;
}

export function WebhookHmacRuntime({ state, onChange }: WebhookHmacRuntimeProps) {
  const [runtimeData, setRuntimeData] = useState<WebhookHmacData>(() => hydrateWebhookHmacData(state.data));

  return (
    <WebhookHmacUI
      data={runtimeData}
      onChange={(data) => {
        setRuntimeData(data);
        onChange({ ...state, data });
      }}
    />
  );
}
