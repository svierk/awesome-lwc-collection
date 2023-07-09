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
});
