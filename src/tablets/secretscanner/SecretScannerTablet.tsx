import React from "react";
import { Tablet, TabletState } from "../types";
import { SECRET_SCANNER_LABEL } from "./constants";
import { scanSecrets } from "./engine/scanEngine";
import { SecretScannerUI } from "./SecretScannerUI";
import { SecretScannerPayload, SecretScannerState } from "./types";

function createState(payload?: SecretScannerPayload): SecretScannerState {
  const input = payload?.content ?? "";
  const result = input ? scanSecrets(input) : { findings: [], redactedContent: "" };

  return {
    type: "secretscanner",
    data: {
      input,
      sourceTitle: payload?.title,
      findings: result.findings,
      redactedContent: result.redactedContent,
      selectedFindingId: result.findings[0]?.id,
      autoScan: false,
      hideLowConfidence: false,
      statusFilter: "all",
      severityFilter: "all",
      providerFilter: "all",
      suppressedFingerprints: [],
      lastScannedAt: input ? Date.now() : undefined,
      scanError: undefined,
    },
  };
}

export const SecretScannerTablet: Tablet = {
  id: "secretscanner",
  label: SECRET_SCANNER_LABEL,
  description: "Scan text, configs, diffs, logs, and tokens for secrets entirely offline.",
  keywords: ["secret", "scanner", "security", "token", "credential", "api key", "offline", "redact"],
  config: {
    showStandardHeader: false,
  },
  createInitialState(payload?: SecretScannerPayload): TabletState {
    return createState(payload);
  },
  serializeState(state: TabletState): string {
    const typedState = state as SecretScannerState;
    const safeState: SecretScannerState = {
      ...typedState,
      data: {
        ...typedState.data,
        findings: typedState.data.findings.map((finding) => ({
          ...finding,
          value: "",
        })),
      },
    };
    return JSON.stringify(safeState);
  },
  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json) as SecretScannerState;
      if (parsed.type !== "secretscanner" || !parsed.data) {
        return createState();
      }
      return {
        ...createState(),
        ...parsed,
        data: {
          ...createState().data,
          ...parsed.data,
          findings: parsed.data.findings ?? [],
          redactedContent: parsed.data.redactedContent ?? "",
          suppressedFingerprints: parsed.data.suppressedFingerprints ?? [],
        },
      };
    } catch {
      return createState();
    }
  },
  render(state: TabletState, onChange: (state: TabletState) => void) {
    return (
      <SecretScannerUI
        state={state as SecretScannerState}
        onChange={(nextState) => onChange(nextState)}
      />
    );
  },
};

export default SecretScannerTablet;
