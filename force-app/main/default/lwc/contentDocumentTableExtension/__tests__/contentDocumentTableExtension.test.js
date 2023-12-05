import ContentDocumentTableExtension from 'c/contentDocumentTableExtension';
import { createElement } from 'lwc';

describe('c-content-document-table-extension', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-content-document-table-extension', {
      is: ContentDocumentTableExtension
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
