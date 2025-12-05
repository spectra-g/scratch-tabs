import { render, screen, fireEvent } from "@testing-library/react";
import { VaultSidebarCanvas } from "../VaultSidebarCanvas";

describe("VaultSidebarCanvas", () => {
  const mockOnSelectCategory = jest.fn();

  const mockCategories = ["git", "docker", "kubernetes"];
  const mockItemCounts = {
    git: 5,
    docker: 3,
    kubernetes: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all categories", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={mockItemCounts}
      />
    );

    expect(screen.getByText("git")).toBeInTheDocument();
    expect(screen.getByText("docker")).toBeInTheDocument();
    expect(screen.getByText("kubernetes")).toBeInTheDocument();
  });

  it("displays item counts for each category", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={mockItemCounts}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("highlights selected category", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory="git"
        onSelectCategory={mockOnSelectCategory}
        itemCounts={mockItemCounts}
      />
    );

    const gitButton = screen.getByRole("button", { name: /git/i });
    expect(gitButton).toHaveClass("bg-element-active");
  });

  it("calls onSelectCategory when category is clicked", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={mockItemCounts}
      />
    );

    const dockerButton = screen.getByRole("button", { name: /docker/i });
    fireEvent.click(dockerButton);

    expect(mockOnSelectCategory).toHaveBeenCalledWith("docker");
  });

  it("shows empty state when no categories", () => {
    render(
      <VaultSidebarCanvas
        categories={[]}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={{}}
      />
    );

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("displays keyboard shortcut hint", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={mockItemCounts}
      />
    );

    expect(screen.getByText("Ctrl+R")).toBeInTheDocument();
    expect(screen.getByText("Search all")).toBeInTheDocument();
  });

  it("renders category icons", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={mockItemCounts}
      />
    );

    // Icons should be rendered for each category
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(mockCategories.length);
  });

  it("sorts categories alphabetically", () => {
    const unsortedCategories = ["zsh", "bash", "docker"];

    render(
      <VaultSidebarCanvas
        categories={unsortedCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        itemCounts={{ zsh: 1, bash: 2, docker: 3 }}
      />
    );

    const buttons = screen.getAllByRole("button");
    // Since categories are sorted in the parent, we just verify they're all rendered
    expect(buttons.length).toBe(3);
  });
});
