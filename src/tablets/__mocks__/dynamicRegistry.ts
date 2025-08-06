import { TabletMetadata } from "../tabletMetadata";
import { Tablet } from "../types";

// Mock implementation of DynamicTabletRegistryImpl for Jest tests
class MockDynamicTabletRegistryImpl {
  getAllMetadata(): TabletMetadata[] {
    // Return empty array for tests - tests can override this if needed
    return [];
  }

  async getById(id: string): Promise<Tablet | undefined> {
    // Return undefined for tests - specific tests can mock this method if needed
    return undefined;
  }
}

export const dynamicTabletRegistry = new MockDynamicTabletRegistryImpl();