import { JsonTreeView, JsonTreeViewModal, useJsonTreeView } from "../index";

describe("JsonTreeView Index Exports", () => {
  it("should export JsonTreeView component", () => {
    expect(JsonTreeView).toBeDefined();
    expect(typeof JsonTreeView).toBe("function");
  });

  it("should export JsonTreeViewModal component", () => {
    expect(JsonTreeViewModal).toBeDefined();
    expect(typeof JsonTreeViewModal).toBe("function");
  });

  it("should export useJsonTreeView hook", () => {
    expect(useJsonTreeView).toBeDefined();
    expect(typeof useJsonTreeView).toBe("function");
  });

  it("should have correct default export structure", () => {
    // Test that the components can be imported and used
    expect(JsonTreeView).toBeDefined();
    expect(JsonTreeViewModal).toBeDefined();
    expect(useJsonTreeView).toBeDefined();
    
    // Test that the hook has the expected structure (without calling it)
    expect(typeof useJsonTreeView).toBe("function");
  });
}); 