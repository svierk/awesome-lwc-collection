import ContentDocumentIcon from 'c/contentDocumentIcon';
import { createElement } from 'lwc';

describe('c-content-document-icon', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-content-document-icon', {
      is: ContentDocumentIcon
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
