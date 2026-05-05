module.exports = {
  globalSetup: './tests/setups/setupMongoMemory.js',
  globalTeardown: './tests/setups/teardownMongoMemory.js',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@middlewares/(.*)$': '<rootDir>/middlewares/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@tasks/(.*)$': '<rootDir>/tasks/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
};
