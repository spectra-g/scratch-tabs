/**
 * Core Pipeline Categories
 *
 * Defines the default categories for organizing operations in the UI.
 * Categories are registered at app initialization.
 *
 * Additional categories can be registered by formats/tablets if needed.
 */

import { OperationCategory } from "./types";
import { operationRegistry } from "./OperationRegistry";

/**
 * Core categories available to all operations
 */
export const coreCategories: OperationCategory[] = [
  {
    id: "text",
    name: "Text Processing",
    icon: "Type",
    order: 10,
  },
  {
    id: "lines",
    name: "Line Operations",
    icon: "List",
    order: 20,
  },
  {
    id: "sorting",
    name: "Sorting",
    icon: "ArrowDownAZ",
    order: 30,
  },
  {
    id: "formatting",
    name: "Formatting",
    icon: "AlignLeft",
    order: 40,
  },
  {
    id: "encoding",
    name: "Encoding",
    icon: "Binary",
    order: 50,
  },
  {
    id: "json",
    name: "JSON",
    icon: "Braces",
    order: 60,
  },
  {
    id: "xml",
    name: "XML",
    icon: "Code",
    order: 70,
  },
  {
    id: "filtering",
    name: "Filtering",
    icon: "Filter",
    order: 80,
  },
  {
    id: "redaction",
    name: "Redaction",
    icon: "EyeOff",
    order: 90,
  },
  {
    id: "hashing",
    name: "Hashing",
    icon: "Hash",
    order: 100,
  },
  {
    id: "utilities",
    name: "Utilities",
    icon: "Wrench",
    order: 110,
  },
  {
    id: "advanced",
    name: "Advanced",
    icon: "Code2",
    order: 999,
  },
];

/**
 * Register all core categories
 *
 * Call this during app initialization before operations are registered.
 */
export function registerCoreCategories(): void {
  operationRegistry.registerCategories(coreCategories);
}

/**
 * Get a category by ID
 */
export function getCategoryById(id: string): OperationCategory | undefined {
  return coreCategories.find((c) => c.id === id.toLowerCase());
}
