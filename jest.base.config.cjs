module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@app/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@app/constracts(|/.*)$': '<rootDir>/libs/constracts/src/$1',
    '^@app/database(|/.*)$': '<rootDir>/libs/database/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.kilo/'],
};
