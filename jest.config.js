const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');
const setupFilesAfterEnv = jestConfig.setupFilesAfterEnv || [];
setupFilesAfterEnv.push('<rootDir>/jest-sa11y-setup.js');

module.exports = {
  ...jestConfig,
  testRegex: '/__tests__/.*.test.js$',
  coverageReporters: ['clover', 'json', 'text', 'lcov', 'cobertura'],
  modulePathIgnorePatterns: ['/.localdevserver'],
  moduleNameMapper: {
    '^lightning/actions$': '<rootDir>/force-app/test/jest-mocks/lightning/actions',
    '^lightning/empApi$': '<rootDir>/force-app/test/jest-mocks/lightning/empApi',
    '^lightning/flowSupport$': '<rootDir>/force-app/test/jest-mocks/lightning/flowSupport',
    '^lightning/messageService$': '<rootDir>/force-app/test/jest-mocks/lightning/messageService',
    '^lightning/modal$': '<rootDir>/force-app/test/jest-mocks/lightning/modal',
    '^lightning/navigation$': '<rootDir>/force-app/test/jest-mocks/lightning/navigation',
    '^lightning/platformShowToastEvent$': '<rootDir>/force-app/test/jest-mocks/lightning/platformShowToastEvent',
    '^lightning/platformWorkspaceApi$': '<rootDir>/force-app/test/jest-mocks/lightning/platformWorkspaceApi',
    '^lightning/refresh$': '<rootDir>/force-app/test/jest-mocks/lightning/refresh',
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
  ],
  setupFilesAfterEnv
};
