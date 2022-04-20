const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
  ...jestConfig,
  modulePathIgnorePatterns: ['/.localdevserver'],
  moduleNameMapper: {
    '^lightning/navigation$': '<rootDir>/force-app/test/jest-mocks/lightning/navigation',
    '^lightning/uiRecordApi$': '<rootDir>/force-app/test/jest-mocks/lightning/uiRecordApi'
  }
};
