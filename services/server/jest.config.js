/**
 * @type {import('jest').Config}
 */
const baseConfig = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': '@swc/jest',
  },
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/app/const/',
    '<rootDir>/app/main.ts',
    '<rootDir>/app/fixtures/',
    '<rootDir>/app/db/migrations/',
    '<rootDir>/app/modules/slack/',
  ],
};
/**
 * @type {import('jest').Config}
 */
const config = {
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 30,
      functions: 15,
      lines: 30,
    },
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.(controller|module|middleware|spec|integration|filter|interceptor|guard|decorator|strategy|config).ts',
  ],
  coverageDirectory: 'coverage',
  projects: [
    {
      ...baseConfig,
      displayName: {
        name: 'unit',
        color: 'magentaBright',
      },
      testRegex: '.*\\.spec\\.ts$',
    },
    {
      ...baseConfig,
      displayName: {
        name: 'integration',
        color: 'yellowBright',
      },
      testRegex: '.*\\.integration\\.ts$',
    },
  ],
};

module.exports = config;
