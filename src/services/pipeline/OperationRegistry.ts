/**
 * Operation Registry
 *
 * Singleton registry for pipeline operations.
 * Formats and tablets self-register their operations to this registry.
 * The pipeline engine only accesses operations through this registry,
 * maintaining decoupling from specific format/tablet implementations.
 */

import { OperationDefinition, OperationCategory } from "./types";

class OperationRegistryImpl {
  /** Map of operation ID to definition */
  private operations: Map<string, OperationDefinition> = new Map();

  /** Map of category ID to category definition */
  private categories: Map<string, OperationCategory> = new Map();

  /** Index: category ID -> set of operation IDs */
  private operationsByCategory: Map<string, Set<string>> = new Map();

  /** Listeners for registration events */
  private listeners: Set<() => void> = new Set();

  /**
   * Register an operation
   *
   * Called by formats/tablets during module initialization.
   * Operations can belong to multiple categories.
   *
   * @param operation - The operation definition to register
   */
  register(operation: OperationDefinition): void {
    if (this.operations.has(operation.id)) {
      console.warn(
        `[OperationRegistry] Operation '${operation.id}' already registered, skipping`,
      );
      return;
    }

    // Validate operation has required fields
    if (!operation.id || !operation.name || !operation.execute) {
      console.error(
        `[OperationRegistry] Invalid operation: missing required fields`,
        operation,
      );
      return;
    }

    // Validate categories
    if (!operation.categories || operation.categories.length === 0) {
      console.warn(
        `[OperationRegistry] Operation '${operation.id}' has no categories, adding to 'uncategorized'`,
      );
      operation.categories = ["uncategorized"];
    }

    this.operations.set(operation.id, operation);

    // Index by categories
    for (const categoryId of operation.categories) {
      const normalizedCategoryId = categoryId.toLowerCase();
      if (!this.operationsByCategory.has(normalizedCategoryId)) {
        this.operationsByCategory.set(normalizedCategoryId, new Set());
      }
      this.operationsByCategory.get(normalizedCategoryId)!.add(operation.id);
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Register multiple operations at once
   *
   * @param operations - Array of operation definitions
   */
  registerAll(operations: OperationDefinition[]): void {
    for (const operation of operations) {
      this.register(operation);
    }
  }

  /**
   * Register a category
   *
   * Categories should be registered before operations for proper ordering.
   *
   * @param category - The category definition
   */
  registerCategory(category: OperationCategory): void {
    const normalizedId = category.id.toLowerCase();
    if (this.categories.has(normalizedId)) {
      // Update existing category (allows overriding order/icon)
      this.categories.set(normalizedId, { ...category, id: normalizedId });
    } else {
      this.categories.set(normalizedId, { ...category, id: normalizedId });
    }
    this.notifyListeners();
  }

  /**
   * Register multiple categories at once
   *
   * @param categories - Array of category definitions
   */
  registerCategories(categories: OperationCategory[]): void {
    for (const category of categories) {
      this.registerCategory(category);
    }
  }

  /**
   * Get an operation by ID
   *
   * @param id - The operation ID
   * @returns The operation definition or undefined
   */
  getById(id: string): OperationDefinition | undefined {
    return this.operations.get(id);
  }

  /**
   * Get all operations in a category
   *
   * @param categoryId - The category ID
   * @returns Array of operations in the category
   */
  getByCategory(categoryId: string): OperationDefinition[] {
    const normalizedId = categoryId.toLowerCase();
    const operationIds = this.operationsByCategory.get(normalizedId);
    if (!operationIds) return [];

    return Array.from(operationIds)
      .map((id) => this.operations.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all registered categories sorted by order
   *
   * @returns Array of categories
   */
  getAllCategories(): OperationCategory[] {
    return Array.from(this.categories.values()).sort(
      (a, b) => a.order - b.order,
    );
  }

  /**
   * Get all categories that have at least one operation
   *
   * @returns Array of non-empty categories
   */
  getNonEmptyCategories(): OperationCategory[] {
    return this.getAllCategories().filter((category) => {
      const ops = this.operationsByCategory.get(category.id);
      return ops && ops.size > 0;
    });
  }

  /**
   * Search operations by query
   *
   * Searches name, description, categories, and keywords.
   *
   * @param query - Search query
   * @returns Array of matching operations
   */
  search(query: string): OperationDefinition[] {
    if (!query || query.trim() === "") {
      return this.getAll();
    }

    const q = query.toLowerCase().trim();

    return Array.from(this.operations.values())
      .filter(
        (op) =>
          op.name.toLowerCase().includes(q) ||
          op.description.toLowerCase().includes(q) ||
          op.id.toLowerCase().includes(q) ||
          op.categories.some((c) => c.toLowerCase().includes(q)) ||
          op.keywords?.some((k) => k.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        // Prioritize exact name matches
        const aNameMatch = a.name.toLowerCase().startsWith(q);
        const bNameMatch = b.name.toLowerCase().startsWith(q);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Get all registered operations
   *
   * @returns Array of all operations
   */
  getAll(): OperationDefinition[] {
    return Array.from(this.operations.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Get all operation IDs
   *
   * @returns Array of operation IDs
   */
  getAllIds(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Check if an operation is registered
   *
   * @param id - The operation ID
   * @returns Whether the operation exists
   */
  has(id: string): boolean {
    return this.operations.has(id);
  }

  /**
   * Get the count of registered operations
   *
   * @returns Number of operations
   */
  get size(): number {
    return this.operations.size;
  }

  /**
   * Get operations by source
   *
   * @param source - The source type
   * @returns Array of operations from that source
   */
  getBySource(source: "core" | "format" | "tablet"): OperationDefinition[] {
    return Array.from(this.operations.values())
      .filter((op) => op.source === source)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Subscribe to registry changes
   *
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("[OperationRegistry] Listener error:", error);
      }
    }
  }

  /**
   * Clear all registrations (primarily for testing)
   */
  clear(): void {
    this.operations.clear();
    this.categories.clear();
    this.operationsByCategory.clear();
    this.notifyListeners();
  }

  /**
   * Get debug information about the registry state
   */
  getDebugInfo(): {
    operationCount: number;
    categoryCount: number;
    operationsByCategory: Record<string, number>;
    operationsBySource: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    for (const [catId, ops] of this.operationsByCategory) {
      byCategory[catId] = ops.size;
    }

    const bySource: Record<string, number> = { core: 0, format: 0, tablet: 0 };
    for (const op of this.operations.values()) {
      if (op.source) {
        bySource[op.source] = (bySource[op.source] || 0) + 1;
      }
    }

    return {
      operationCount: this.operations.size,
      categoryCount: this.categories.size,
      operationsByCategory: byCategory,
      operationsBySource: bySource,
    };
  }
}

/** Singleton instance */
export const operationRegistry = new OperationRegistryImpl();
