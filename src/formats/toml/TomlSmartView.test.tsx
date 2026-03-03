import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TomlSmartView } from "./TomlSmartView";

const noop = () => undefined;

describe("TomlSmartView", () => {
  it("AC-001: mounts without crashing for TOML content", () => {
    render(
      <TomlSmartView
        content={'title = "App"\n[server]\nhost = "localhost"'}
        onContentChange={noop}
        tabId="tab-1"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByTestId("toml-smart-view")).toBeInTheDocument();
  });

  it("AC-002: shows structured UI placeholder for valid TOML", () => {
    render(
      <TomlSmartView
        content={'title = "App"\n[server]\nhost = "localhost"'}
        onContentChange={noop}
        tabId="tab-2"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByTestId("toml-structured-placeholder")).toBeInTheDocument();
    expect(screen.getByText("Structured TOML editor coming soon")).toBeInTheDocument();
  });

  it("AC-005: shows parse error state for invalid TOML", () => {
    render(
      <TomlSmartView
        content={'title = "App"\n[server\nhost = "localhost"'}
        onContentChange={noop}
        tabId="tab-3"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByTestId("toml-smart-view-error")).toBeInTheDocument();
    expect(screen.getByText("TOML parse error")).toBeInTheDocument();
  });
});
