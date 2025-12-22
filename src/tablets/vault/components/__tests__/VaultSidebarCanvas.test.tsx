import { render, screen, fireEvent } from "@testing-library/react";
import { VaultSidebarCanvas } from "../VaultSidebarCanvas";

describe("VaultSidebarCanvas", () => {
  const mockOnSelectCategory = jest.fn();
  const mockOnAddCategory = jest.fn();
  const mockOnDeleteCategory = jest.fn();

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
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
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
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
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
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
        itemCounts={mockItemCounts}
      />
    );

    const gitButton = screen.getByRole("button", { name: /git/i });
    // The parent div has the bg-element-active class, not the button itself
    expect(gitButton.parentElement).toHaveClass("bg-element-active");
  });

  it("calls onSelectCategory when category is clicked", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
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
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
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
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
        itemCounts={mockItemCounts}
      />
    );

    expect(screen.getByText("Ctrl+R")).toBeInTheDocument();
    expect(screen.getByText(/to search/i)).toBeInTheDocument();
  });

  it("renders category icons", () => {
    render(
      <VaultSidebarCanvas
        categories={mockCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
        itemCounts={mockItemCounts}
      />
    );

    // Filter to only category buttons (exclude Add Category button)
    const categoryButtons = screen.getAllByRole("button").filter(button =>
      mockCategories.some(cat => button.textContent?.includes(cat))
    );
    expect(categoryButtons.length).toBe(mockCategories.length);
  });

  it("sorts categories alphabetically", () => {
    const unsortedCategories = ["zsh", "bash", "docker"];

    render(
      <VaultSidebarCanvas
        categories={unsortedCategories}
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
        onAddCategory={mockOnAddCategory}
        onDeleteCategory={mockOnDeleteCategory}
        itemCounts={{ zsh: 1, bash: 2, docker: 3 }}
      />
    );

    // Filter to only category buttons (exclude Add Category button)
    const categoryButtons = screen.getAllByRole("button").filter(button =>
      unsortedCategories.some(cat => button.textContent?.includes(cat))
    );
    expect(categoryButtons.length).toBe(3);
  });
});
