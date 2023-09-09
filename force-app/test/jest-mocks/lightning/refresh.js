/**
 * This is a modified version of the lightning/refresh mock from:
 * https://github.com/trailheadapps/lwc-recipes/blob/main/force-app/test/jest-mocks/lightning/refresh.js
 */
export const RefreshEventName = 'lightning__refreshevent';

export class RefreshEvent extends CustomEvent {
  constructor() {
    super(RefreshEventName, { bubbles: true, composed: true });
  }
}
