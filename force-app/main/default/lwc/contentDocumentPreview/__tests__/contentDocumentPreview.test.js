import ContentDocumentPreview from 'c/contentDocumentPreview';
import { getNavigateCalledWith } from 'lightning/navigation';
import { createElement } from 'lwc';

describe('c-content-document-preview', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should be accessible and show file preview on click', async () => {
    // given
    const element = createElement('c-content-document-preview', {
      is: ContentDocumentPreview
    });
    element.preview = {
      id: '123',
      name: 'File'
    };

    // when
    document.body.appendChild(element);
    const link = element.shadowRoot.querySelector('a');
    link.click();
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__namedPage');
    expect(pageReference.attributes.pageName).toBe('filePreview');
    await expect(element).toBeAccessible();
  });
});
