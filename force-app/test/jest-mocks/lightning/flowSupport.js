export const FlowAttributeChangeEventName = 'lightning__flowattributechange';
export const FlowNavigationNextEventName = 'lightning__flownavigationnext';

export class FlowAttributeChangeEvent extends CustomEvent {
  constructor(attributeName, attributeValue) {
    super(FlowAttributeChangeEventName, {
      composed: true,
      cancelable: true,
      bubbles: true,
      detail: {
        attributeName,
        attributeValue
      }
    });
  }
}

export class FlowNavigationNextEvent extends CustomEvent {
  constructor(attributeName, attributeValue) {
    super(FlowNavigationNextEventName, {
      composed: true,
      cancelable: true,
      bubbles: true,
      detail: {
        attributeName,
        attributeValue
      }
    });
  }
}
