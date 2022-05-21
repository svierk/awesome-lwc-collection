const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
  ...jestConfig,
  coverageReporters: ['clover', 'json', 'text', 'lcov', 'cobertura'],
  modulePathIgnorePatterns: ['/.localdevserver'],
  moduleNameMapper: {
    '^lightning/actions$': '<rootDir>/force-app/test/jest-mocks/lightning/actions',
    '^lightning/messageService$': '<rootDir>/force-app/test/jest-mocks/lightning/messageService',
    '^lightning/navigation$': '<rootDir>/force-app/test/jest-mocks/lightning/navigation',
    '^lightning/platformShowToastEvent$': '<rootDir>/force-app/test/jest-mocks/lightning/platformShowToastEvent',
    '^lightning/uiRecordApi$': '<rootDir>/force-app/test/jest-mocks/lightning/uiRecordApi'
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'tests',
        outputName: 'test-results-lwc.xml'
      }
    ]
  ]
};
