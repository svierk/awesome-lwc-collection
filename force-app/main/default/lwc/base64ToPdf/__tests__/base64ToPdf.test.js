import Base64ToPdf from 'c/base64ToPdf';
import { createElement } from 'lwc';

describe('c-base64-to-pdf', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('is accessible and displays pdf', async () => {
    // given
    const element = createElement('c-base64-to-pdf', {
      is: Base64ToPdf
    });

    // when
    document.body.appendChild(element);
    const card = element.shadowRoot.querySelector('lightning-card');

    // then
    expect(card.iconName).toBe('doctype:pdf');
    expect(card.title).toBe('Base64 To PDF');
    await expect(element).toBeAccessible();
  });
});
