const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@google-cloud/secret-manager$': '<rootDir>/__mocks__/google-cloud-secret-manager-mock.ts',
    '^firebase-functions/(.*)$': '<rootDir>/__mocks__/firebase-functions-mock.ts',
    '^firebase-functions$': '<rootDir>/__mocks__/firebase-functions-mock.ts',
    '^firebase-admin/(.*)$': '<rootDir>/__mocks__/firebase-admin-mock.ts',
    '^firebase-admin$': '<rootDir>/__mocks__/firebase-admin-mock.ts',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|jwks-rsa|firebase-admin|firebase-functions)/)',
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
