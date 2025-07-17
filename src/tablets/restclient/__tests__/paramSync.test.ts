import { describe, it, expect } from "@jest/globals";
import { ParameterSyncManager } from "../utils/paramSync";
import { KeyValuePair, HttpRequest } from "../types";

describe("ParameterSyncManager", () => {
  describe("syncFromUrl", () => {
    it("should extract params from URL and enable them", () => {
      const url = "https://api.example.com/test?page=1&limit=10";
      const currentParams: KeyValuePair[] = [
        { key: "page", value: "2", enabled: false },
        { key: "other", value: "foo", enabled: true },
      ];
      const result = ParameterSyncManager.syncFromUrl(url, currentParams);
      expect(result.url).toBe(url);
      expect(result.params).toEqual([
        { key: "page", value: "1", enabled: true },
        { key: "limit", value: "10", enabled: true },
        { key: "other", value: "foo", enabled: false },
      ]);
    });

    it("should disable params not present in URL", () => {
      const url = "https://api.example.com/test?a=1";
      const currentParams: KeyValuePair[] = [
        { key: "a", value: "1", enabled: true },
        { key: "b", value: "2", enabled: true },
      ];
      const result = ParameterSyncManager.syncFromUrl(url, currentParams);
      expect(result.params).toEqual([
        { key: "a", value: "1", enabled: true },
        { key: "b", value: "2", enabled: false },
      ]);
    });

    it("should handle URLs with no params", () => {
      const url = "https://api.example.com/test";
      const currentParams: KeyValuePair[] = [
        { key: "foo", value: "bar", enabled: true },
      ];
      const result = ParameterSyncManager.syncFromUrl(url, currentParams);
      expect(result.params).toEqual([
        { key: "foo", value: "bar", enabled: false },
      ]);
    });

    it("should handle invalid URLs by disabling all params", () => {
      const url = "not a valid url";
      const currentParams: KeyValuePair[] = [
        { key: "foo", value: "bar", enabled: true },
      ];
      const result = ParameterSyncManager.syncFromUrl(url, currentParams);
      expect(result.url).toBe(url);
      expect(result.params).toEqual([
        { key: "foo", value: "bar", enabled: false },
      ]);
    });
  });

  describe("syncFromParams", () => {
    it("should build URL from enabled params", () => {
      const newParams: KeyValuePair[] = [
        { key: "a", value: "1", enabled: true },
        { key: "b", value: "2", enabled: false },
        { key: "c", value: "3", enabled: true },
      ];
      const currentUrl = "https://api.example.com/test?old=param";
      const result = ParameterSyncManager.syncFromParams(newParams, currentUrl);
      expect(result.url).toBe("https://api.example.com/test?a=1&c=3");
      expect(result.params).toBe(newParams);
    });

    it("should return base URL if no enabled params", () => {
      const newParams: KeyValuePair[] = [
        { key: "a", value: "1", enabled: false },
      ];
      const currentUrl = "https://api.example.com/test?foo=bar";
      const result = ParameterSyncManager.syncFromParams(newParams, currentUrl);
      expect(result.url).toBe("https://api.example.com/test");
    });

    it("should handle URLs with no query string", () => {
      const newParams: KeyValuePair[] = [
        { key: "x", value: "y", enabled: true },
      ];
      const currentUrl = "https://api.example.com/test";
      const result = ParameterSyncManager.syncFromParams(newParams, currentUrl);
      expect(result.url).toBe("https://api.example.com/test?x=y");
    });
  });

  describe("syncFromExternal", () => {
    const baseRequest: HttpRequest = {
      method: "GET",
      url: "https://api.example.com/test?foo=bar",
      headers: [],
      auth: { type: "none", params: {} },
      params: [
        { key: "foo", value: "bar", enabled: true },
        { key: "baz", value: "qux", enabled: true },
      ],
      body: { type: "none", content: "", params: [] },
      variables: [],
    };

    it("should sync from url if url is provided", () => {
      const parsedRequest = { url: "https://api.example.com/test?a=1" };
      const result = ParameterSyncManager.syncFromExternal(parsedRequest, baseRequest);
      expect(result.url).toBe("https://api.example.com/test?a=1");
      expect(result.params).toEqual([
        { key: "a", value: "1", enabled: true },
        { key: "foo", value: "bar", enabled: false },
        { key: "baz", value: "qux", enabled: false },
      ]);
    });

    it("should sync from params if only params are provided", () => {
      const parsedRequest = {
        params: [
          { key: "x", value: "y", enabled: true },
        ],
      };
      const result = ParameterSyncManager.syncFromExternal(parsedRequest, baseRequest);
      expect(result.url).toBe("https://api.example.com/test?x=y");
      expect(result.params).toEqual([
        { key: "x", value: "y", enabled: true },
      ]);
    });

    it("should return parsedRequest as-is if no url or params", () => {
      const parsedRequest = { method: "POST" as any };
      const result = ParameterSyncManager.syncFromExternal(parsedRequest, baseRequest);
      expect(result).toEqual(parsedRequest);
    });
  });
}); 