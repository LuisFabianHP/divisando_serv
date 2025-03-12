module.exports = {
    testEnvironment: 'node',
    //setupFilesAfterEnv: ['./tests/setupTests.js'],
    moduleNameMapper: {
        '^@config/(.*)$': '<rootDir>/config/$1',
        '^@controllers/(.*)$': '<rootDir>/controllers/$1',
        '^@models/(.*)$': '<rootDir>/models/$1',
        '^@middlewares/(.*)$': '<rootDir>/middlewares/$1',
        '^@utils/(.*)$': '<rootDir>/utils/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        '^@routes/(.*)$': '<rootDir>/routes/$1',
    },
};
  