import getColumns from '@salesforce/apex/CustomDatatableUtil.convertFieldSetToColumns';
import getRecordCount from '@salesforce/apex/CustomDatatableUtil.getRecordCount';
import getRecords from '@salesforce/apex/CustomDatatableUtil.getRecordsWithFieldSet';
import CustomDatatable from 'c/customDatatable';
import { getNavigateCalledWith } from 'lightning/navigation';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';
import { createElement } from 'lwc';

const mockData = require('./data/customDatatable.json');
const mockGetColumns = require('./data/getColumns.json');
const mockGetRecords = require('./data/getRecords.json');
const mockDeleteRecordError = require('./data/deleteRecordError.json');
const mockUpdateRecordError = require('./data/updateRecordError.json');

jest.mock(
  '@salesforce/apex/CustomDatatableUtil.convertFieldSetToColumns',
  () => {
    const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
    return {
      default: createApexTestWireAdapter(jest.fn())
    };
  },
  { virtual: true }
);

jest.mock(
  '@salesforce/apex/CustomDatatableUtil.getRecordsWithFieldSet',
  () => {
    const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
    return {
      default: createApexTestWireAdapter(jest.fn())
    };
  },
  { virtual: true }
);

jest.mock(
  '@salesforce/apex/CustomDatatableUtil.getRecordCount',
  () => {
    const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
    return {
      default: createApexTestWireAdapter(jest.fn())
    };
  },
  { virtual: true }
);

let element;

describe('c-custom-datatable', () => {
  beforeEach(() => {
    element = createElement('c-custom-datatable', {
      is: CustomDatatable
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
    element.fieldSetApiName = mockData.fieldSetApiName;
    element.objectApiName = mockData.objectApiName;
    element.showCard = mockData.showCard;
    element.showDeleteRowAction = mockData.showDeleteRowAction;
    element.showEditRowAction = mockData.showEditRowAction;
    element.showViewRowAction = mockData.showViewRowAction;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);
    const card = element.shadowRoot.querySelector('lightning-card');

    // then
    expect(card.iconName).toBe(mockData.cardIcon);
    expect(card.title).toBe(mockData.cardTitle);
    await expect(element).toBeAccessible();
  });

  it('should execute view record navigation when view row action event is fired', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'view'
          },
          row: mockGetRecords[0]
        }
      })
    );
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__recordPage');
    expect(pageReference.attributes.actionName).toBe('view');
  });

  it('should execute edit record navigation when edit row action event is fired', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'edit'
          },
          row: mockGetRecords[0]
        }
      })
    );
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__recordPage');
    expect(pageReference.attributes.actionName).toBe('edit');
  });

  it('should execute delete record operation when delete row action event is fired', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'delete'
          },
          row: mockGetRecords[0]
        }
      })
    );

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord.mock.calls[0][0]).toEqual(mockGetRecords[0].Id);
  });

  it('should handle error when delete record operation fails', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    deleteRecord.mockRejectedValue(mockDeleteRecordError);
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'delete'
          },
          row: mockGetRecords[0]
        }
      })
    );

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord.mock.calls[0][0]).toEqual(mockGetRecords[0].Id);
  });

  it('should execute nothing when invalid row action event is fired', async () => {
    // given
    const mockRowActionHandler = jest.fn();
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.addEventListener('rowaction', mockRowActionHandler);
    childElement.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: {
          action: {
            name: 'invalid'
          },
          row: mockGetRecords[0]
        }
      })
    );

    // then
    expect(mockRowActionHandler).toHaveBeenCalledTimes(1);
  });

  it('should execute update record operation when save event is fired after inline editing', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('save', {
        detail: {
          draftValues: [mockGetRecords[0]]
        }
      })
    );

    // then
    return Promise.resolve().then(() => {
      expect(updateRecord).toHaveBeenCalledTimes(1);
      expect(updateRecord.mock.calls[0][0].fields).toEqual(mockGetRecords[0]);
    });
  });

  it('should handle error when update record operation fails', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;

    // when
    updateRecord.mockRejectedValue(mockUpdateRecordError);
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('save', {
        detail: {
          draftValues: [mockGetRecords[0]]
        }
      })
    );

    // then
    return Promise.resolve().then(() => {
      expect(updateRecord).toHaveBeenCalledTimes(1);
      expect(updateRecord.mock.calls[0][0].fields).toEqual(mockGetRecords[0]);
    });
  });

  it('should execute delete record action when multiple rows are selected', async () => {
    // given
    element.cardIcon = mockData.cardIcon;
    element.cardTitle = mockData.cardTitle;
    element.fieldSetApiName = mockData.fieldSetApiName;
    element.isUsedAsRelatedList = mockData.isUsedAsRelatedList;
    element.objectApiName = mockData.objectApiName;
    element.showCard = mockData.showCard;
    element.showMultipleRowDeleteAction = mockData.showMultipleRowDeleteAction;

    // when
    deleteRecord.mockResolvedValue();
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowselection', {
        detail: {
          selectedRows: mockGetRecords
        }
      })
    );

    await new Promise((r) => setTimeout(r, 0));

    const deleteButton = element.shadowRoot.querySelector('lightning-button');
    deleteButton.click();

    // then
    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledTimes(3);
    });
  });

  it('should handle error when delete operation for multiple records fails', async () => {
    // given
    element.cardIcon = mockData.cardIcon;
    element.cardTitle = mockData.cardTitle;
    element.fieldSetApiName = mockData.fieldSetApiName;
    element.isUsedAsRelatedList = mockData.isUsedAsRelatedList;
    element.objectApiName = mockData.objectApiName;
    element.showCard = mockData.showCard;
    element.showMultipleRowDeleteAction = mockData.showMultipleRowDeleteAction;

    // when
    deleteRecord.mockRejectedValue(mockDeleteRecordError);
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);

    const childElement = element.shadowRoot.querySelector('c-custom-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowselection', {
        detail: {
          selectedRows: mockGetRecords
        }
      })
    );

    await new Promise((r) => setTimeout(r, 0));

    const deleteButton = element.shadowRoot.querySelector('lightning-button');
    deleteButton.click();

    // then
    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledTimes(3);
    });
  });

  it('should show pagination controls when enable pagination is true and data exists', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;
    element.enablePagination = true;
    element.pageSize = 2;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);
    getRecordCount.emit(mockGetRecords.length);

    await new Promise((r) => setTimeout(r, 0));

    // then
    const pagination = element.shadowRoot.querySelector('c-custom-datatable-pagination');
    expect(pagination).not.toBeNull();
    expect(pagination.paginationLabel).toContain('Page 1 of');
    expect(pagination.isFirstPage).toBe(true);
    expect(pagination.isLastPage).toBe(false);
  });

  it('should not show pagination controls when enable pagination is false', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;
    element.enablePagination = false;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);
    getRecordCount.emit(mockGetRecords.length);

    await new Promise((r) => setTimeout(r, 0));

    // then
    const pagination = element.shadowRoot.querySelector('c-custom-datatable-pagination');
    expect(pagination).toBeNull();
  });

  it('should update current page when navigation events are dispatched', async () => {
    // given
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);
    getRecordCount.emit(mockGetRecords.length);

    await new Promise((r) => setTimeout(r, 0));

    const pagination = element.shadowRoot.querySelector('c-custom-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('next'));

    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of');

    // when
    pagination.dispatchEvent(new CustomEvent('last'));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain(`Page ${mockGetRecords.length} of`);
    expect(pagination.isLastPage).toBe(true);

    // when
    pagination.dispatchEvent(new CustomEvent('previous'));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain(`Page ${mockGetRecords.length - 1} of`);

    // when
    pagination.dispatchEvent(new CustomEvent('first'));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of');
    expect(pagination.isFirstPage).toBe(true);
  });
});
