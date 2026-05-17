// Test for department lookup filter management
// Note: This test runs in Node.js environment, so DOM APIs are mocked

// Mock dependencies
jest.mock('../src/js/utils/toast.js', () => ({
  showToast: jest.fn(),
}));

jest.mock('../src/js/utils/modal.js', () => ({
  showConfirmModal: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Import the real module
const {
  initializeDefaultFilters,
} = require('../src/js/modules/department-lookup.js');

describe('Department Lookup Filter Management', () => {
  beforeEach(() => {
    // Clear mocks before each test
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('initializeDefaultFilters creates default filter configuration', () => {
    initializeDefaultFilters();
    // We need to re-require or check the exported live binding.
    // Since we are using destructuring require, we might get a stale copy if it was a value export,
    // but filterConfig is a reference (array) or we imported the getter.
    // However, require in Jest/Babel usually handles this.
    // Let's rely on the fact that we can check the length and content.

    // Note: In ESM, importing a 'let' gives a live binding.
    // With 'require' and Babel, it might be an object property getter.
    // Let's re-import to be safe if the array reference changed (which it shouldn't here, initialization might push or replace?)
    // initializeDefaultFilters does: filterConfig = [...] which REPLACES the reference.
    // This makes 'let filterConfig' hard to test with 'require' destructuring because we got the initial value (empty array).

    // To properly test a module that reassigns exports, we should import the whole namespace.
    const deptLookup = require('../src/js/modules/department-lookup.js');
    deptLookup.initializeDefaultFilters();

    expect(deptLookup.filterConfig).toBeDefined();
    expect(Array.isArray(deptLookup.filterConfig)).toBe(true);
    expect(deptLookup.filterConfig.length).toBe(3);
    expect(deptLookup.filterConfig[0].label).toBe('Departments'); // Note: 'Departments' plural in code
  });

  test('filter types can be custom strings', () => {
    const deptLookup = require('../src/js/modules/department-lookup.js');
    deptLookup.initializeDefaultFilters();

    // Add a filter with a custom type
    // We need to modify the array.
    deptLookup.filterConfig.push({
      label: 'VIP Clients',
      type: 'vip',
      id: 'vip',
      checked: true,
    });
    deptLookup.filterConfig.push({
      label: 'Remote Workers',
      type: 'remote',
      id: 'remote',
      checked: true,
    });

    expect(deptLookup.filterConfig.find((f) => f.type === 'vip')).toBeDefined();
    expect(
      deptLookup.filterConfig.find((f) => f.type === 'remote')
    ).toBeDefined();
  });
});
