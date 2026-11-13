/**
 * Jest 30 + ts-jest.
 *
 * `@nestjs/*` v12 est publié en ESM ; `transformIgnorePatterns` demande donc à
 * Jest de compiler ces paquets (et eux seuls) en CommonJS avant exécution.
 */
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!@nestjs)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
