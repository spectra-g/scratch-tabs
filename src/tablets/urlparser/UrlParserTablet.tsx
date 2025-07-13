import React, { useState, useCallback, useEffect } from "react";
import { Tablet, TabletState } from "../types";
import { UrlParserUI } from "./UrlParserUI";
import { UrlComponents, UrlParserState, UrlWarning } from "./types";
import { parseUrl, composeUrl, compareUrlParsing } from "./utils/urlUtils";

export const UrlParserTablet: Tablet = {
  id: "urlparser",
  label: "URL Parser",
  keywords: [
    "url",
    "uri",
    "parser",
    "analyzer",
    "web",
    "http",
    "https",
    "domain",
    "query",
    "fragment",
  ],

  createInitialState(): UrlParserState {
    return {
      type: "urlparser",
      data: {
        url: "",
        components: {
          scheme: "",
          username: "",
          password: "",
          host: "",
          port: "",
          path: "",
          query: "",
          fragment: "",
          queryParams: {},
        },
        warnings: [],
        history: [],
        viewMode: "decoded",
        comparisonMode: false,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "urlparser" && parsed.data) {
        return parsed as UrlParserState;
      }
    } catch (e) {
      console.error("Failed to parse URL Parser state:", e);
    }
    return this.createInitialState();
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const typedState = state as UrlParserState;

    // Update URL from components
    const handleUpdateUrl = useCallback(
      (newUrl: string) => {
        // Parse the new URL
        const { components, warnings } = parseUrl(newUrl);

        // Update state with new URL, components, and warnings
        onChange({
          ...typedState,
          data: {
            ...typedState.data,
            url: newUrl,
            components,
            warnings,
            // Add to history if it's a valid URL and not already in history
            history:
              newUrl && !typedState.data.history.includes(newUrl)
                ? [newUrl, ...typedState.data.history].slice(0, 50)
                : typedState.data.history,
            // Generate comparison results if comparison mode is enabled
            comparisonResults: typedState.data.comparisonMode
              ? compareUrlParsing(newUrl)
              : undefined,
          },
        });
      },
      [typedState, onChange],
    );

    // Update components and recompose URL
    const handleUpdateComponent = useCallback(
      (value: string, component: keyof UrlComponents) => {
        const updatedComponents = {
          ...typedState.data.components,
          [component]: value,
        };

        // Special handling for query parameters
        if (component === "query") {
          // Parse the new query string into parameters
          const params: Record<string, string> = {};
          value.split("&").forEach((param) => {
            const [key, val] = param.split("=");
            if (key) {
              params[key] = val || "";
            }
          });
          updatedComponents.queryParams = params;
        }

        // Recompose the URL from updated components
        const newUrl = composeUrl(updatedComponents);

        // Parse the new URL to get updated warnings
        const { warnings } = parseUrl(newUrl);

        // Update state
        onChange({
          ...typedState,
          data: {
            ...typedState.data,
            url: newUrl,
            components: updatedComponents,
            warnings,
            // Add to history if it's a valid URL and not already in history
            history:
              newUrl && !typedState.data.history.includes(newUrl)
                ? [newUrl, ...typedState.data.history].slice(0, 50)
                : typedState.data.history,
            // Update comparison results if comparison mode is enabled
            comparisonResults: typedState.data.comparisonMode
              ? compareUrlParsing(newUrl)
              : undefined,
          },
        });
      },
      [typedState, onChange],
    );

    // Update query parameters
    const handleUpdateQueryParams = useCallback(
      (params: Record<string, string>) => {
        // Convert params object to query string
        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${value}`)
          .join("&");

        // Update the query component
        handleUpdateComponent(queryString, "query");
      },
      [handleUpdateComponent],
    );

    // Toggle encoding mode
    const handleToggleEncoding = useCallback(() => {
      onChange({
        ...typedState,
        data: {
          ...typedState.data,
          viewMode:
            typedState.data.viewMode === "encoded" ? "decoded" : "encoded",
        },
      });
    }, [typedState, onChange]);

    // Toggle comparison mode
    const handleToggleComparison = useCallback(() => {
      const newComparisonMode = !typedState.data.comparisonMode;
      onChange({
        ...typedState,
        data: {
          ...typedState.data,
          comparisonMode: newComparisonMode,
          comparisonResults: newComparisonMode
            ? compareUrlParsing(typedState.data.url)
            : undefined,
        },
      });
    }, [typedState, onChange]);

    // Clear URL
    const handleClearUrl = useCallback(() => {
      onChange({
        ...typedState,
        data: {
          ...typedState.data,
          url: "",
          components: {
            scheme: "",
            username: "",
            password: "",
            host: "",
            port: "",
            path: "",
            query: "",
            fragment: "",
            queryParams: {},
          },
          warnings: [],
          comparisonResults: undefined,
        },
      });
    }, [typedState, onChange]);

    // Paste from clipboard
    const handlePaste = useCallback(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          handleUpdateUrl(text);
        }
      } catch (error) {
        console.error("Failed to read clipboard:", error);
      }
    }, [handleUpdateUrl]);

    return (
      <UrlParserUI
        url={typedState.data.url}
        components={typedState.data.components}
        warnings={typedState.data.warnings}
        history={typedState.data.history}
        viewMode={typedState.data.viewMode}
        comparisonMode={typedState.data.comparisonMode}
        comparisonResults={typedState.data.comparisonResults}
        onUpdateUrl={handleUpdateUrl}
        onUpdateComponent={handleUpdateComponent}
        onUpdateQueryParams={handleUpdateQueryParams}
        onToggleEncoding={handleToggleEncoding}
        onToggleComparison={handleToggleComparison}
        onClearUrl={handleClearUrl}
        onPaste={handlePaste}
      />
    );
  },
};
