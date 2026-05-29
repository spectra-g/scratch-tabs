import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SecretScannerTablet } from "../SecretScannerTablet";
import { SecretScannerState } from "../types";

// ---------- infrastructure mocks ----------

jest.mock("../../bridge/context", () => ({
  useTabletContext: jest.fn(() => ({ tabId: "test-tab-id" })),
  TabletContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../bridge/hook", () => ({
  useTabletBridge: jest.fn(() => ({})),
  useTabletTabCreation: jest.fn(() => ({
    createBackgroundTab: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the worker: synchronously respond on postMessage using the real scanEngine.
jest.mock("../engine/secretScannerWorker?worker", () => {
  return jest.fn().mockImplementation(() => {
    const worker = {
      onmessage: null as ((e: { data: unknown }) => void) | null,
      onerror: null as ((e: { message: string }) => void) | null,
      postMessage(data: { id: number; input: string }) {
        // Respond asynchronously (next microtask) so the UI can set isScanning first.
        const { scanSecrets } = jest.requireActual("../engine/scanEngine") as typeof import("../engine/scanEngine");
        setTimeout(() => {
          worker.onmessage?.({ data: { id: data.id, result: scanSecrets(data.input) } });
        }, 0);
      },
      terminate: jest.fn(),
    };
    return worker;
  });
}, { virtual: true });

// ---------- helpers ----------

function renderTablet(state: SecretScannerState, handleChange = jest.fn()) {
  const { rerender } = render(SecretScannerTablet.render(state, handleChange) as React.ReactElement);
  return { rerender: (s: SecretScannerState) => rerender(SecretScannerTablet.render(s, handleChange) as React.ReactElement), handleChange };
}

// ---------- suite ----------

describe("SecretScannerTablet", () => {
  beforeEach(() => {
    jest.spyOn(console, "debug").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  afterEach(() => jest.restoreAllMocks());

  // ---- static tablet API ----

  it("creates populated initial state from Open-in payload", () => {
    const state = SecretScannerTablet.createInitialState({
      content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890",
      title: "env.local",
    }) as SecretScannerState;

    expect(state.type).toBe("secretscanner");
    expect(state.data.sourceTitle).toBe("env.local");
    expect(state.data.findings).toHaveLength(1);
    expect(state.data.redactedContent).toContain("[REDACTED_GITHUB_");
    expect(state.data.suppressedFingerprints).toEqual([]);
  });

  it("serializes without storing raw finding values while preserving editable input", () => {
    const state = SecretScannerTablet.createInitialState({
      content: "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890",
    }) as SecretScannerState;

    const serialized = SecretScannerTablet.serializeState(state);

    expect(serialized).toContain("OpenAI");
    expect(serialized).toContain("OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(JSON.parse(serialized).data.findings[0].value).toBe("");
  });

  it("deserializeState preserves suppressedFingerprints", () => {
    const state = SecretScannerTablet.createInitialState({
      content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    }) as SecretScannerState;
    const withSuppressions = { ...state, data: { ...state.data, suppressedFingerprints: ["abc123"] } };
    const serialized = SecretScannerTablet.serializeState(withSuppressions);
    const deserialized = SecretScannerTablet.deserializeState(serialized) as SecretScannerState;

    expect(deserialized.data.suppressedFingerprints).toEqual(["abc123"]);
  });

  it("deserializeState defaults suppressedFingerprints to [] for legacy state", () => {
    const state = SecretScannerTablet.createInitialState() as SecretScannerState;
    const legacyJson = JSON.stringify({ ...state, data: { ...state.data, suppressedFingerprints: undefined } });
    const deserialized = SecretScannerTablet.deserializeState(legacyJson) as SecretScannerState;

    expect(deserialized.data.suppressedFingerprints).toEqual([]);
  });

  // ---- scanning via worker ----

  it("scans pasted input and displays safe redaction output", async () => {
    let state = SecretScannerTablet.createInitialState() as SecretScannerState;
    const handleChange = jest.fn((next: SecretScannerState) => {
      state = next;
      rerender(state);
    });
    const { rerender } = renderTablet(state, handleChange);

    fireEvent.change(screen.getByTestId("secret-scanner-input"), {
      target: { value: "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890" },
    });
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => {
      expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
    });

    expect(console.debug).toHaveBeenCalledWith(
      "[SecretScanner] scan complete",
      expect.objectContaining({ inputLength: 54, findingCount: 1 }),
    );
    expect(screen.getByTestId("secret-scanner-redacted")).toHaveTextContent("[REDACTED_OPENAI_");
    expect(screen.getByTestId("secret-scanner-redacted")).not.toHaveTextContent("sk-abcdefghijklmnopqrstuvwxyz1234567890");
  });

  it("scans the latest pasted input before the parent state re-renders", async () => {
    let state = SecretScannerTablet.createInitialState() as SecretScannerState;
    const handleChange = jest.fn((next: SecretScannerState) => {
      state = SecretScannerTablet.deserializeState(SecretScannerTablet.serializeState(next)) as SecretScannerState;
    });
    const { rerender } = renderTablet(state, handleChange);

    fireEvent.change(screen.getByTestId("secret-scanner-input"), {
      target: { value: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890" },
    });
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));
    rerender(state);

    await waitFor(() => {
      expect(state.data.findings).toHaveLength(1);
      expect(state.data.findings[0].provider).toBe("GitHub");
    });
  });

  it("shows findings when rendering a partial persisted state without filter defaults", async () => {
    const scanned = SecretScannerTablet.createInitialState({
      content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    }) as SecretScannerState;
    const partialState = {
      ...scanned,
      data: {
        input: scanned.data.input,
        findings: scanned.data.findings,
        redactedContent: scanned.data.redactedContent,
        autoScan: false,
        suppressedFingerprints: [],
      },
    } as SecretScannerState;

    render(SecretScannerTablet.render(partialState, jest.fn()) as React.ReactElement);

    expect(screen.getAllByText("GitHub").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No findings match/i)).not.toBeInTheDocument();
  });

  // ---- suppression ----

  it("auto-marks previously suppressed fingerprints as false-positive on re-scan", async () => {
    const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";
    const initialState = SecretScannerTablet.createInitialState({
      content: `GITHUB_TOKEN=${token}`,
    }) as SecretScannerState;
    const fingerprint = initialState.data.findings[0].fingerprint;

    let state = { ...initialState, data: { ...initialState.data, suppressedFingerprints: [fingerprint] } };
    const handleChange = jest.fn((next: SecretScannerState) => {
      state = next;
      rerender(state);
    });
    const { rerender } = renderTablet(state, handleChange);

    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => {
      expect(state.data.findings.length).toBeGreaterThan(0);
      const finding = state.data.findings.find((f) => f.fingerprint === fingerprint);
      expect(finding?.status).toBe("false-positive");
    });
  });

  it("adds fingerprint to suppressedFingerprints when marked as false positive", async () => {
    let state = SecretScannerTablet.createInitialState({
      content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    }) as SecretScannerState;
    const handleChange = jest.fn((next: SecretScannerState) => {
      state = next;
      rerender(state);
    });
    const { rerender } = renderTablet(state, handleChange);

    await waitFor(() => expect(screen.getAllByText("GitHub").length).toBeGreaterThan(0));

    const fp = state.data.findings[0].fingerprint;
    fireEvent.click(screen.getByRole("button", { name: /false positive/i }));

    await waitFor(() => {
      expect(state.data.suppressedFingerprints).toContain(fp);
      expect(state.data.findings[0].status).toBe("false-positive");
    });
  });

  it("removes fingerprint from suppressedFingerprints when reopened", async () => {
    let state = SecretScannerTablet.createInitialState({
      content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890",
    }) as SecretScannerState;
    const handleChange = jest.fn((next: SecretScannerState) => {
      state = next;
      rerender(state);
    });
    const { rerender } = renderTablet(state, handleChange);

    await waitFor(() => expect(screen.getAllByText("GitHub").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /false positive/i }));
    await waitFor(() => expect(state.data.findings[0].status).toBe("false-positive"));

    fireEvent.click(screen.getByRole("button", { name: /reopen/i }));
    await waitFor(() => {
      expect(state.data.findings[0].status).toBe("open");
      expect(state.data.suppressedFingerprints).not.toContain(state.data.findings[0].fingerprint);
    });
  });

  it("marks all duplicate fingerprints as false-positive in one click", async () => {
    const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";
    const input = [`GITHUB_TOKEN=${token}`, `ANOTHER_GITHUB=${token}`].join("\n");

    let state = SecretScannerTablet.createInitialState() as SecretScannerState;
    const handleChange = jest.fn((next: SecretScannerState) => {
      state = next;
      rerender(state);
    });
    const { rerender } = renderTablet(state, handleChange);

    fireEvent.change(screen.getByTestId("secret-scanner-input"), { target: { value: input } });
    fireEvent.click(screen.getByRole("button", { name: /scan/i }));

    await waitFor(() => expect(state.data.findings.length).toBeGreaterThan(0));

    const fp = state.data.findings[0].fingerprint;
    // All findings with this fingerprint should share the same fp
    const duplicates = state.data.findings.filter((f) => f.fingerprint === fp);
    expect(duplicates.length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: /false positive/i }));

    await waitFor(() => {
      const allFP = state.data.findings.filter((f) => f.fingerprint === fp).every((f) => f.status === "false-positive");
      expect(allFP).toBe(true);
    });
  });
});
