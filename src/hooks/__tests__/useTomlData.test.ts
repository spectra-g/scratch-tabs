import { act, renderHook } from "@testing-library/react";
import { useTomlData } from "../useTomlData";
import * as parser from "../../parsers/tomlParser";

describe("useTomlData", () => {
  const onContentChange = jest.fn();

  beforeEach(() => {
    onContentChange.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("AC-001: parses valid TOML into a structured model", () => {
    const content = [
      'title = "My App"',
      "[server]",
      'host = "localhost"',
      "port = 8080",
    ].join("\n");

    const { result } = renderHook(() => useTomlData(content, onContentChange));

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.data.title).toBe("My App");
    expect(result.current.data.server).toEqual({ host: "localhost", port: 8080 });
  });

  it("AC-002: updates model and serializes to TOML", () => {
    const { result } = renderHook(() => useTomlData("", onContentChange));

    act(() => {
      result.current.setValue(["app", "name"], "scratch-tabs");
      result.current.setValue(["app", "debug"], true);
    });

    const serialized = result.current.serialize();

    expect(serialized).toContain('app = { name = "scratch-tabs", debug = true }');
  });

  it("AC-003: debounces onContentChange and uses lastSyncedContentRef to avoid loops", () => {
    const parseSpy = jest.spyOn(parser, "parseToml");
    const { result, rerender } = renderHook(
      ({ content }) => useTomlData(content, onContentChange),
      { initialProps: { content: 'title = "v1"' } },
    );

    expect(parseSpy).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setValue(["title"], "v2");
    });

    expect(onContentChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(305);
    });

    expect(onContentChange).toHaveBeenCalledTimes(1);
    const syncedContent = onContentChange.mock.calls[0][0] as string;

    rerender({ content: syncedContent });

    // Should not reparse for content that originated from this hook.
    expect(parseSpy).toHaveBeenCalledTimes(1);

    parseSpy.mockRestore();
  });

  it("AC-005: round-trips complex TOML with semantic equivalence", () => {
    const complex = [
      'title = "TOML Example"',
      "enabled = true",
      "ratio = 1.5",
      'tags = ["one", "two"]',
      "metadata = { owner = \"team\", retries = 2 }",
      "[database]",
      'host = "db.internal"',
      "ports = [5432, 5433]",
      '["service.config"]',
      '"display name" = "Main API"',
    ].join("\n");

    const { result } = renderHook(() => useTomlData(complex, onContentChange));

    const serialized = result.current.serialize();
    const reparsed = parser.parseToml(serialized);

    expect(reparsed.error).toBeNull();
    expect(reparsed.data).toEqual(result.current.data);
  });

  it("reports parse errors without crashing and clears after valid reparse", () => {
    const { result, rerender } = renderHook(
      ({ content }) => useTomlData(content, onContentChange),
      { initialProps: { content: "invalid toml line" } },
    );

    expect(result.current.error).toContain("Failed to parse TOML");

    rerender({ content: 'title = "ok"' });

    expect(result.current.error).toBeNull();
    expect(result.current.data.title).toBe("ok");
  });
});
