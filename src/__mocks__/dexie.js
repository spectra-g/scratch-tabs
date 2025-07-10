// Mock implementation of Dexie for Jest tests
class MockDexie {
  constructor(name) {
    this.name = name;
  }

  version(version) {
    return {
      stores: () => ({
        upgrade: () => this,
      }),
    };
  }

  table(name) {
    return {
      add: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
          first: jest.fn(() => Promise.resolve(null)),
        })),
      })),
      toArray: jest.fn(() => Promise.resolve([])),
      delete: jest.fn(),
      clear: jest.fn(),
    };
  }

  open() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }

  delete() {
    return Promise.resolve();
  }
}

module.exports = MockDexie;
module.exports.default = MockDexie;
