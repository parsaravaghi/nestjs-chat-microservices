const baseConfig = require('./jest.base.config.cjs');

module.exports = {
  ...baseConfig,
  displayName: 'e2e',
  testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
  maxWorkers: 1,
};
