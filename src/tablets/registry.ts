import { Tablet, TabletRegistry } from "./types";
import { ChecksumTablet } from "./checksum";
import { DateTimeTablet } from "./datetime";

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

// Static registry for tablets that are always loaded
export const tabletRegistry = {
  staticTablets: {
    checksum: {
      ...ChecksumTablet,
    },
    datetime: {
      ...DateTimeTablet,
    },
  },

  async getById(id: string): Promise<Tablet | null> {
    // Check static tablets first
    const staticTablet = this.staticTablets[id];
    if (staticTablet) {
      return staticTablet;
    }
    
    return null;
  }
  diagram: () => import('./diagram').then(m => m.DiagramTablet),
};