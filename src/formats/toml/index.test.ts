import React from "react";
import { Settings } from "../../components/Icons";
import { TomlFormatModule } from "./toml-format-module";

describe("TOML format smart-view module", () => {
  test("AC-003: getSmartViews returns TOML smart view config", () => {
    const module = new TomlFormatModule();
    const views = module.getSmartViews?.();

    expect(views).toBeDefined();
    expect(views).toHaveLength(1);

    const [view] = views!;
    expect(view.id).toBe("toml-structured-editor");
    expect(view.languageId).toBe("toml");
    expect(view.label).toBe("TOML Structure");
    expect(view.icon).toBe(Settings);
    expect(view.mode).toBe("replaces");
    expect(typeof view.component).toBe("function");
  });

  test("AC-004: getStatusBarItems returns SmartView toggle parity", () => {
    const module = new TomlFormatModule();
    const items = module.getStatusBarItems?.();

    expect(items).toBeDefined();
    expect(items).toHaveLength(1);

    const [item] = items!;
    expect(item.id).toBe("toml-smart-view-button");
    expect(item.priority).toBe(10);

    const element = item.component({
      activeTab: {
        id: "tab-1",
      } as any,
    });

    expect(React.isValidElement(element)).toBe(true);
  });
});
