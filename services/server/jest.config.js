/**
 * @type {import('jest').Config}
 */
const baseConfig = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'app',
  transform: {
    '^.+\\.(t|j)s$': '@swc/jest',
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.ts', '!**/*.(controller|module|spec|integration|filter).ts'],
  coveragePathIgnorePatterns: ['(app/const)', '(app/fixtures)', '(app/main.ts)'],
};
/**
 * @type {import('jest').Config}
 */
const config = {
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 84,
      functions: 90,
      lines: 90,
    },
  },
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
