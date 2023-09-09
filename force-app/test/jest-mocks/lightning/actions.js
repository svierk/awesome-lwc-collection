/**
 * This is a modified version of the lightning/actions mock from:
 * https://github.com/trailheadapps/lwc-recipes/blob/main/force-app/test/jest-mocks/lightning/actions.js
 */
export const CloseScreenEventName = 'lightning__actionsclosescreen';

export class CloseActionScreenEvent extends CustomEvent {
  constructor() {
    super(CloseScreenEventName, { bubbles: false, composed: false });
  }
}
