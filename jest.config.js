module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        '**/__tests__/(unit|e2e|integration)/**/*.test.ts'
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/**/*.d.ts'
    ],
    coverageDirectory: './coverage',
    coverageReporters: ['html', 'lcov', 'text-summary'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testTimeout: 15000
};