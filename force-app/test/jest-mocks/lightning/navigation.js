/**
 * For the original lightning/navigation mock that comes by default with
 * @salesforce/sfdx-lwc-jest, see:
 * https://github.com/salesforce/sfdx-lwc-jest/blob/master/src/lightning-stubs/navigation/navigation.js
 * This is a modified version from:
 * https://github.com/trailheadapps/lwc-recipes/blob/main/force-app/test/jest-mocks/lightning/navigation.js
 */

import { createTestWireAdapter } from '@salesforce/wire-service-jest-util';
export const CurrentPageReference = createTestWireAdapter(jest.fn());

let _navigatePageReference, _generatePageReference, _replace;

const Navigate = Symbol('Navigate');
const GenerateUrl = Symbol('GenerateUrl');
export const NavigationMixin = (Base) => {
  return class extends Base {
    [Navigate](pageReference, replace) {
      _navigatePageReference = pageReference;
      _replace = replace;
    }
    [GenerateUrl](pageReference) {
      _generatePageReference = pageReference;
      return new Promise((resolve) => resolve('https://www.example.com'));
    }
  };
};
NavigationMixin.Navigate = Navigate;
NavigationMixin.GenerateUrl = GenerateUrl;

export const getNavigateCalledWith = () => {
  return {
    pageReference: _navigatePageReference,
    replace: _replace
  };
};

export const getGenerateUrlCalledWith = () => ({
  pageReference: _generatePageReference
});
