jest.mock("../../tablets/tabletMetadata", () => ({
  tabletMetadata: [],
}));

jest.mock("../../views/registry", () => ({
  smartViewRegistry: {
    getAllViews: jest.fn().mockReturnValue([]),
  },
}));

jest.mock("../../db", () => ({
  getRecentTools: jest.fn().mockResolvedValue([]),
  addRecentTool: jest.fn().mockResolvedValue(undefined),
}));

import "../../formats/toml/index";
import { toolService } from "../toolService";

describe("toolService TOML metadata", () => {
  it("includes TOML in the format tool metadata", async () => {
    const tools = await toolService.getAllTools();
    const toml = tools.find((tool) => tool.type === "format" && tool.id === "toml");

    expect(toml).toMatchObject({
      id: "toml",
      type: "format",
      label: "TOML",
      languageId: "toml",
    });
    expect(toml?.keywords).toEqual(expect.arrayContaining(["toml"]));
  });
});
