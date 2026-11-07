import ErrorAlert from 'c/errorAlert';
import { createElement } from 'lwc';

describe('c-error-alert', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should announce the message as an alert and be accessible', async () => {
    // given
    const element = createElement('c-error-alert', { is: ErrorAlert });
    element.message = 'Something went wrong.';

    // when
    document.body.appendChild(element);

    // then
    const alert = element.shadowRoot.querySelector('[role="alert"]');
    expect(alert.classList).toContain('slds-alert_error');
    expect(alert.textContent).toBe('Something went wrong.');
    expect(alert.querySelector('lightning-icon').alternativeText).toBe('Error');
    await expect(element).toBeAccessible();
  });
});
