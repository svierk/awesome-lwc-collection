import getDocuments from '@salesforce/apex/ContentDocumentController.getDocuments';
import getLatestVersion from '@salesforce/apex/ContentDocumentController.getLatestVersion';
import ContentDocumentTable from 'c/contentDocumentTable';
import { getNavigateCalledWith } from 'lightning/navigation';
import { deleteRecord } from 'lightning/uiRecordApi';
import { createElement } from 'lwc';

const mockData = require('./data/contentDocumentTable.json');
const mockGetDocuments = require('./data/getDocuments.json');
const mockError = require('./data/error.json');

jest.mock(
  '@salesforce/apex/ContentDocumentController.getDocuments',
  () => {
    const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
    return {
      default: createApexTestWireAdapter(jest.fn())
    };
  },
  { virtual: true }
);

jest.mock(
  '@salesforce/apex/ContentDocumentController.getLatestVersion',
  () => {
    return {
      default: jest.fn()
    };
  },
  { virtual: true }
);

let element;

describe('c-content-document-table', () => {
  beforeEach(() => {
    element = createElement('c-content-document-table', {
      is: ContentDocumentTable
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should be accessible and show card icon and title when show card option is selected', async () => {
    // given
    element.cardIcon = mockData.cardIcon;
    element.cardTitle = mockData.cardTitle;
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;
    element.showCard = mockData.showCard;
    element.showDeleteAction = mockData.showDeleteAction;
    element.showDownloadAction = mockData.showDownloadAction;
    element.showViewAction = mockData.showViewAction;

    // when
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);
    const card = element.shadowRoot.querySelector('lightning-card');

    // then
    expect(card.iconName).toBe(mockData.cardIcon);
    expect(card.title).toBe(mockData.cardTitle);
    await expect(element).toBeAccessible();
  });

  it('should execute download file action when download file event is fired', async () => {
    // given
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;

    // when
    getLatestVersion.mockResolvedValue('123');
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);

    const childElement = element.shadowRoot.querySelector('c-content-document-table-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'download'
          },
          row: mockGetDocuments[0]
        }
      })
    );

    // then
    expect(getLatestVersion).toHaveBeenCalledTimes(1);
  });

  it('should handle error when download file action fails', async () => {
    // given
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;

    // when
    getLatestVersion.mockRejectedValue(mockError);
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);

    const childElement = element.shadowRoot.querySelector('c-content-document-table-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'download'
          },
          row: mockGetDocuments[0]
        }
      })
    );

    // then
    expect(getLatestVersion).toHaveBeenCalledTimes(1);
  });

  it('should execute view file navigation when view action event is fired', async () => {
    // given
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;

    // when
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);

    const childElement = element.shadowRoot.querySelector('c-content-document-table-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'view'
          },
          row: mockGetDocuments[0]
        }
      })
    );
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__recordPage');
    expect(pageReference.attributes.actionName).toBe('view');
  });

  it('should execute delete file operation when delete file action event is fired', async () => {
    // given
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;

    // when
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);

    const childElement = element.shadowRoot.querySelector('c-content-document-table-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'delete'
          },
          row: mockGetDocuments[0]
        }
      })
    );

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord.mock.calls[0][0]).toEqual(mockGetDocuments[0].Id);
  });

  it('should handle error when delete file operation fails', async () => {
    // given
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;

    // when
    deleteRecord.mockRejectedValue(mockError);
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);

    const childElement = element.shadowRoot.querySelector('c-content-document-table-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'delete'
          },
          row: mockGetDocuments[0]
        }
      })
    );

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord.mock.calls[0][0]).toEqual(mockGetDocuments[0].Id);
  });

  it('should execute nothing when invalid row action event is fired', async () => {
    // given
    const mockRowActionHandler = jest.fn();
    element.folder = mockData.folder;
    element.library = mockData.library;
    element.recordId = mockData.recordId;

    // when
    document.body.appendChild(element);
    getDocuments.emit(mockGetDocuments);

    const childElement = element.shadowRoot.querySelector('c-content-document-table-extension');
    childElement.addEventListener('rowaction', mockRowActionHandler);
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'invalid'
          },
          row: mockGetDocuments[0]
        }
      })
    );

    // then
    expect(mockRowActionHandler).toHaveBeenCalledTimes(1);
  });
});
