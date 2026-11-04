import Base64ToPdf from 'c/base64ToPdf';
import { createElement } from 'lwc';

describe('c-base64-to-pdf', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('is accessible and displays correct icon and title', async () => {
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

  it('should offer the example pdf when no data is set', () => {
    // given
    const element = createElement('c-base64-to-pdf', { is: Base64ToPdf });

    // when
    document.body.appendChild(element);

    // then
    const link = element.shadowRoot.querySelector('a');
    expect(link.href).toContain('data:application/pdf;base64,');
    expect(link.getAttribute('download')).toBe('example.pdf');
  });

  it('should offer the given data under the given file name', () => {
    // given
    const element = createElement('c-base64-to-pdf', { is: Base64ToPdf });
    element.base64 = 'SGVsbG8=';
    element.fileName = 'invoice.pdf';

    // when
    document.body.appendChild(element);

    // then
    const link = element.shadowRoot.querySelector('a');
    expect(link.getAttribute('href')).toBe('data:application/pdf;base64,SGVsbG8=');
    expect(link.getAttribute('download')).toBe('invoice.pdf');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', '']
  ])('should offer no download while the data is %s', async (_label, value) => {
    // given
    const element = createElement('c-base64-to-pdf', { is: Base64ToPdf });
    element.base64 = value;

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('a')).toBeNull();
    await expect(element).toBeAccessible();
  });
});
