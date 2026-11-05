import VisualforceToPdf from 'c/visualforceToPdf';
import { createElement } from 'lwc';

describe('c-visualforce-to-pdf', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-visualforce-to-pdf', {
      is: VisualforceToPdf
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should render the viewer without a card by default', async () => {
    // given
    const element = createElement('c-visualforce-to-pdf', {
      is: VisualforceToPdf
    });
    element.url = '/apex/AccountDetails';

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('lightning-card')).toBeNull();
    expect(element.shadowRoot.querySelector('iframe').getAttribute('src')).toBe('/apex/AccountDetails');
    await expect(element).toBeAccessible();
  });

  it('should wrap the viewer in a card', async () => {
    // given
    const element = createElement('c-visualforce-to-pdf', {
      is: VisualforceToPdf
    });
    element.url = '/apex/AccountDetails';
    element.showCard = true;
    element.cardTitle = 'Account Details';

    // when
    document.body.appendChild(element);

    // then
    const card = element.shadowRoot.querySelector('lightning-card');
    expect(card.iconName).toBe('doctype:pdf');
    expect(card.title).toBe('Account Details');
    expect(card.querySelector('iframe').getAttribute('src')).toBe('/apex/AccountDetails');
    await expect(element).toBeAccessible();
  });
});
