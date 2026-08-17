import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    // Enable ESM support
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        // '^.+\\.[tj]sx?$' to process ts/js with `ts-jest`
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/routes/**/*.ts',
        '!src/server.ts',
        '!src/app.ts',
        '!src/container/**/*.ts',
    ],
    coverageDirectory: 'coverage',
    testMatch: ['**/tests/**/*.test.ts'],
};

export default jestConfig;
