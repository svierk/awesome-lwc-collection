import IFrame from 'c/iFrame';
import { createElement } from 'lwc';

describe('c-i-frame', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-i-frame', {
      is: IFrame
    });
    element.sandbox = 'test';

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should render the iframe without a card by default', async () => {
    // given
    const element = createElement('c-i-frame', {
      is: IFrame
    });
    element.url = 'https://example.com/';

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('lightning-card')).toBeNull();
    expect(element.shadowRoot.querySelector('iframe').src).toBe('https://example.com/');
    await expect(element).toBeAccessible();
  });

  it('should wrap the iframe in a card and keep its configuration', async () => {
    // given
    const element = createElement('c-i-frame', {
      is: IFrame
    });
    element.url = 'https://example.com/';
    element.sandbox = 'allow-scripts';
    element.showCard = true;
    element.cardIcon = 'standard:link';
    element.cardTitle = 'Website';

    // when
    document.body.appendChild(element);

    // then
    const card = element.shadowRoot.querySelector('lightning-card');
    expect(card.iconName).toBe('standard:link');
    expect(card.title).toBe('Website');
    const iframe = card.querySelector('iframe');
    expect(iframe.src).toBe('https://example.com/');
    expect(iframe.sandbox).toBe('allow-scripts');
    await expect(element).toBeAccessible();
  });
});
