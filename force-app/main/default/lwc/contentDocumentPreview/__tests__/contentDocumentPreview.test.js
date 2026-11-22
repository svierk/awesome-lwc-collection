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
    const button = element.shadowRoot.querySelector('lightning-button');
    button.click();
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(button.label).toBe('File');
    expect(button.variant).toBe('base');
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__namedPage');
    expect(pageReference.attributes.pageName).toBe('filePreview');
    expect(pageReference.state.selectedRecordId).toBe('123');
    await expect(element).toBeAccessible();
  });
});
