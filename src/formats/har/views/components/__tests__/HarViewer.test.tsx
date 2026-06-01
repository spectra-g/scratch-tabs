import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HarViewer } from "../HarViewer";
import { HarFile } from "../../types";

// Mock react-resizable-panels
jest.mock("react-resizable-panels", () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}));

// Stub virtualizer to avoid layout mocks
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 36,
      })),
    getTotalSize: () => count * 36,
    scrollToIndex: jest.fn(),
  }),
}));

Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  value: () => ({ width: 1000, height: 600, top: 0, left: 0, bottom: 600, right: 1000, x: 0, y: 0 }),
});

const mockAddBackgroundTab = jest.fn();
jest.mock("../../../../../stores/rootStore", () => ({
  useRootStore: () => ({ addBackgroundTab: mockAddBackgroundTab }),
}));

jest.mock("../../../../../utils/tabUtils", () => ({
  createTab: (opts: object) => ({ id: "mock-tab", ...opts }),
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeHarContent(overrides: { status?: number; hasAuth?: boolean } = {}) {
  const { status = 200, hasAuth = false } = overrides;
  const headers: { name: string; value: string }[] = [];
  if (hasAuth) headers.push({ name: "Authorization", value: "Bearer secret" });

  return JSON.stringify({
    log: {
      version: "1.2",
      creator: { name: "Test", version: "1" },
      entries: [
        {
          startedDateTime: "2023-06-01T10:00:00.000Z",
          time: 250,
          request: {
            method: "GET",
            url: "https://api.example.com/users",
            httpVersion: "HTTP/1.1",
            headers,
            queryString: [],
            cookies: [],
            headersSize: 200,
            bodySize: -1,
          },
          response: {
            status,
            statusText: status === 200 ? "OK" : "Error",
            httpVersion: "HTTP/1.1",
            headers: [{ name: "Content-Type", value: "application/json" }],
            cookies: [],
            content: { size: 500, mimeType: "application/json", text: '{"ok":true}' },
            redirectURL: "",
            headersSize: 150,
            bodySize: 500,
          },
          cache: {},
          timings: { blocked: 0, dns: 5, connect: 10, ssl: 8, send: 0.5, wait: 200, receive: 26.5 },
        },
      ],
    },
  });
}

const commonProps = {
  onContentChange: jest.fn(),
  tabId: "test-tab",
  isActive: true,
  side: "left" as const,
};

function makeHarFromEntries(entries: Array<{ method?: string; url?: string; status?: number }>) {
  const parsed = JSON.parse(makeHarContent());
  parsed.log.entries = entries.map((entry, index) => ({
    ...parsed.log.entries[0],
    startedDateTime: `2023-06-01T10:00:0${index}.000Z`,
    request: {
      ...parsed.log.entries[0].request,
      method: entry.method ?? "GET",
      url: entry.url ?? `https://api.example.com/item-${index}`,
    },
    response: {
      ...parsed.log.entries[0].response,
      status: entry.status ?? 200,
      statusText: (entry.status ?? 200) === 200 ? "OK" : "Error",
    },
  }));
  return JSON.stringify(parsed);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("HarViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the HAR viewer container", () => {
    render(<HarViewer content={makeHarContent()} {...commonProps} />);
    expect(screen.getByTestId("har-viewer")).toBeInTheDocument();
  });

  it("shows error message for invalid JSON", () => {
    render(<HarViewer content="not json at all" {...commonProps} />);
    expect(screen.getByText(/failed to parse/i)).toBeInTheDocument();
  });

  it("shows error message for missing entries", () => {
    const bad = JSON.stringify({ log: { version: "1.2" } });
    render(<HarViewer content={bad} {...commonProps} />);
    expect(screen.getByText(/failed to parse/i)).toBeInTheDocument();
  });

  it("displays the summary bar with request count", () => {
    render(<HarViewer content={makeHarContent()} {...commonProps} />);
    expect(screen.getByText(/1 request/i)).toBeInTheDocument();
  });

  it("shows privacy banner when Authorization header is present", () => {
    render(<HarViewer content={makeHarContent({ hasAuth: true })} {...commonProps} />);
    expect(screen.getByText(/sensitive data detected/i)).toBeInTheDocument();
  });

  it("does not show privacy banner when no sensitive data", () => {
    render(<HarViewer content={makeHarContent()} {...commonProps} />);
    expect(screen.queryByText(/sensitive data detected/i)).not.toBeInTheDocument();
  });

  it("allows dismissing the privacy banner", () => {
    render(<HarViewer content={makeHarContent({ hasAuth: true })} {...commonProps} />);
    const dismissBtn = screen.getByLabelText(/dismiss/i);
    fireEvent.click(dismissBtn);
    expect(screen.queryByText(/sensitive data detected/i)).not.toBeInTheDocument();
  });

  it("renders view toggle tabs (waterfall, table)", () => {
    render(<HarViewer content={makeHarContent()} {...commonProps} />);
    expect(screen.getByText("waterfall")).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
  });

  it("renders search input in toolbar", () => {
    render(<HarViewer content={makeHarContent()} {...commonProps} />);
    expect(screen.getByPlaceholderText(/filter by url/i)).toBeInTheDocument();
  });

  it("deletes selected HAR requests from the underlying content", () => {
    render(
      <HarViewer
        content={makeHarFromEntries([
          { url: "https://api.example.com/delete-me" },
          { url: "https://api.example.com/keep-me" },
        ])}
        {...commonProps}
      />,
    );

    fireEvent.click(screen.getByLabelText("Select HAR request 1"));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(commonProps.onContentChange).toHaveBeenCalledTimes(1);
    const next = JSON.parse(commonProps.onContentChange.mock.calls[0][0]);
    expect(next.log.entries).toHaveLength(1);
    expect(next.log.entries[0].request.url).toBe("https://api.example.com/keep-me");
  });

  it("compares two selected HAR requests and can show differences only", () => {
    render(
      <HarViewer
        content={makeHarFromEntries([
          { method: "GET", url: "https://api.example.com/same", status: 200 },
          { method: "POST", url: "https://api.example.com/same", status: 404 },
        ])}
        {...commonProps}
      />,
    );

    fireEvent.click(screen.getByLabelText("Select HAR request 1"));
    fireEvent.click(screen.getByLabelText("Select HAR request 2"));
    fireEvent.click(screen.getByRole("button", { name: /compare/i }));

    expect(screen.getByText("Compare HAR Requests")).toBeInTheDocument();
    expect(screen.getByText("request.method")).toBeInTheDocument();
    expect(screen.getByText("request.url")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Differences only"));
    expect(screen.getByText("request.method")).toBeInTheDocument();
    expect(screen.queryByText("request.url")).not.toBeInTheDocument();
  });

  it("merges pasted HAR content into the current HAR", () => {
    const incoming = makeHarFromEntries([{ url: "https://api.example.com/merged" }]);
    render(
      <HarViewer
        content={makeHarFromEntries([{ url: "https://api.example.com/current" }])}
        {...commonProps}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /merge/i }));
    fireEvent.change(screen.getByTestId("har-merge-textarea"), {
      target: { value: incoming },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^merge$/i }).at(-1)!);

    expect(commonProps.onContentChange).toHaveBeenCalledTimes(1);
    const next = JSON.parse(commonProps.onContentChange.mock.calls[0][0]) as HarFile;
    expect(next.log.entries.map((entry) => entry.request.url)).toEqual([
      "https://api.example.com/current",
      "https://api.example.com/merged",
    ]);
  });
});
