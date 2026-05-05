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

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

let element;

describe('c-custom-datatable', () => {
  beforeEach(() => {
    element = createElement('c-custom-datatable', { is: CustomDatatable });
    element.objectApiName = mockData.objectApiName;
    element.fieldSetApiName = mockData.fieldSetApiName;
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  function mountWithDefaults() {
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emit(mockGetRecords);
  }

  function dispatchRowAction(childElement, name) {
    childElement.dispatchEvent(new CustomEvent('rowaction', { detail: { action: { name }, row: mockGetRecords[0] } }));
  }

  it('should be accessible and show card icon and title when show card option is selected', async () => {
    // given
    element.cardIcon = mockData.cardIcon;
    element.cardTitle = mockData.cardTitle;
    element.showCard = mockData.showCard;
    element.showDeleteRowAction = mockData.showDeleteRowAction;
    element.showEditRowAction = mockData.showEditRowAction;
    element.showViewRowAction = mockData.showViewRowAction;

    // when
    mountWithDefaults();
    const card = element.shadowRoot.querySelector('lightning-card');

    // then
    expect(card.iconName).toBe(mockData.cardIcon);
    expect(card.title).toBe(mockData.cardTitle);
    await expect(element).toBeAccessible();
  });

  it('should execute view record navigation when view row action event is fired', async () => {
    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    dispatchRowAction(childElement, 'view');
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__recordPage');
    expect(pageReference.attributes.actionName).toBe('view');
  });

  it('should execute edit record navigation when edit row action event is fired', async () => {
    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    dispatchRowAction(childElement, 'edit');
    const { pageReference } = getNavigateCalledWith();

    // then
    expect(pageReference).not.toBeNull();
    expect(pageReference.type).toBe('standard__recordPage');
    expect(pageReference.attributes.actionName).toBe('edit');
  });

  it('should execute delete record operation when delete row action event is fired', async () => {
    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    dispatchRowAction(childElement, 'delete');

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord.mock.calls[0][0]).toEqual(mockGetRecords[0].Id);
  });

  it('should handle error when delete record operation fails', async () => {
    // given
    deleteRecord.mockRejectedValue(mockDeleteRecordError);

    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    dispatchRowAction(childElement, 'delete');

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord.mock.calls[0][0]).toEqual(mockGetRecords[0].Id);
  });

  it('should execute nothing when invalid row action event is fired', async () => {
    // given
    const mockRowActionHandler = jest.fn();

    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.addEventListener('rowaction', mockRowActionHandler);
    dispatchRowAction(childElement, 'invalid');

    // then
    expect(mockRowActionHandler).toHaveBeenCalledTimes(1);
  });

  it('should execute update record operation when save event is fired after inline editing', async () => {
    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('save', { detail: { draftValues: [mockGetRecords[0]] } }));

    // then
    return Promise.resolve().then(() => {
      expect(updateRecord).toHaveBeenCalledTimes(1);
      expect(updateRecord.mock.calls[0][0].fields).toEqual(mockGetRecords[0]);
    });
  });

  it('should handle error when update record operation fails', async () => {
    // given
    updateRecord.mockRejectedValue(mockUpdateRecordError);

    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('save', { detail: { draftValues: [mockGetRecords[0]] } }));

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
    element.isUsedAsRelatedList = mockData.isUsedAsRelatedList;
    element.showCard = mockData.showCard;
    element.showMultipleRowDeleteAction = mockData.showMultipleRowDeleteAction;
    deleteRecord.mockResolvedValue();

    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('rowselection', { detail: { selectedRows: mockGetRecords } }));

    await flushPromises();
    element.shadowRoot.querySelector('lightning-button').click();

    // then
    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledTimes(3);
    });
  });

  it('should handle error when delete operation for multiple records fails', async () => {
    // given
    element.cardIcon = mockData.cardIcon;
    element.cardTitle = mockData.cardTitle;
    element.isUsedAsRelatedList = mockData.isUsedAsRelatedList;
    element.showCard = mockData.showCard;
    element.showMultipleRowDeleteAction = mockData.showMultipleRowDeleteAction;
    deleteRecord.mockRejectedValue(mockDeleteRecordError);

    // when
    mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('rowselection', { detail: { selectedRows: mockGetRecords } }));

    await flushPromises();
    element.shadowRoot.querySelector('lightning-button').click();

    // then
    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledTimes(3);
    });
  });

  it('should show pagination controls when enable pagination is true and data exists', async () => {
    // given
    element.enablePagination = true;
    element.pageSize = 2;

    // when
    mountWithDefaults();
    getRecordCount.emit(mockGetRecords.length);

    await flushPromises();

    // then
    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    expect(pagination).not.toBeNull();
    expect(pagination.paginationLabel).toContain('Page 1 of');
    expect(pagination.isFirstPage).toBe(true);
    expect(pagination.isLastPage).toBe(false);
  });

  it('should show error toast when wired get records fails', async () => {
    // given
    element.enableSearch = true;

    // when
    document.body.appendChild(element);
    getColumns.emit(mockGetColumns);
    getRecords.emitError({ body: { message: "field 'xyz' can not be filtered in a query call" } });

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('c-datatable-extension');
    expect(datatable.data).toEqual([]);
  });

  it('should reset page to 1 when search term changes', async () => {
    // given
    element.enableSearch = true;
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    mountWithDefaults();
    getRecordCount.emit(mockGetRecords.length);

    await flushPromises();

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('next'));

    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of');

    // when
    const searchInput = element.shadowRoot.querySelector('lightning-input.search-input');
    searchInput.value = 'test';
    searchInput.dispatchEvent(new CustomEvent('change', { detail: { value: 'test' } }));

    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of');
  });

  it('should reset page to 1 and update sort state when sort event is fired', async () => {
    // given
    element.enableSorting = true;
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    mountWithDefaults();
    getRecordCount.emit(mockGetRecords.length);

    await flushPromises();

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('next'));

    await flushPromises();

    // then — currently on page 2
    expect(pagination.paginationLabel).toContain('Page 2 of');

    // when — sort event fired by datatable
    const datatable = element.shadowRoot.querySelector('c-datatable-extension');
    datatable.dispatchEvent(new CustomEvent('sort', { detail: { fieldName: 'CaseNumber', sortDirection: 'asc' } }));

    await flushPromises();

    // then — page resets to 1 and sort indicator state is updated
    expect(pagination.paginationLabel).toContain('Page 1 of');
    expect(datatable.sortedBy).toBe('CaseNumber');
    expect(datatable.sortedDirection).toBe('asc');
  });

  it('should update current page when navigation events are dispatched', async () => {
    // given
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    mountWithDefaults();
    getRecordCount.emit(mockGetRecords.length);

    await flushPromises();

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('next'));

    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of');

    // when
    pagination.dispatchEvent(new CustomEvent('last'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain(`Page ${mockGetRecords.length} of`);
    expect(pagination.isLastPage).toBe(true);

    // when
    pagination.dispatchEvent(new CustomEvent('previous'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain(`Page ${mockGetRecords.length - 1} of`);

    // when
    pagination.dispatchEvent(new CustomEvent('first'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of');
    expect(pagination.isFirstPage).toBe(true);
  });
});
