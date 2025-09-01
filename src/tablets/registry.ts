import { Tablet, TabletRegistry } from "./types";

class TabletRegistryImpl implements TabletRegistry {
  private tablets: Tablet[] = [];

  register(tablet: Tablet): void {
    if (this.tablets.some((t) => t.id === tablet.id)) {
      return;
    }
    this.tablets.push(tablet);
    // Sort tablets by label whenever a new one is registered
    this.tablets.sort((a, b) => a.label.localeCompare(b.label));
  }

  getAll(): Tablet[] {
    return [...this.tablets];
  }

  getById(id: string): Tablet | undefined {
    return this.tablets.find((t) => t.id === id);
  }

  search(query: string): Tablet[] {
    if (!query) return this.tablets;

    const normalizedQuery = query.toLowerCase();
    return this.tablets.filter((tablet) => {
      // Match against ID, label, and keywords
      return (
        tablet.id.toLowerCase().includes(normalizedQuery) ||
        tablet.label.toLowerCase().includes(normalizedQuery) ||
        tablet.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
      );
    });
  }
}

// Export singleton instance
export const tabletRegistry = new TabletRegistryImpl();