module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/test/jest.setup.js'],
  moduleFileExtensions: ['js', 'json'],
  // include both *.test.js and *.spec.js so E2E specs using render/playwright can run under Jest
  testMatch: ['**/test/**/*.{test,spec}.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/e2e/'],
};
