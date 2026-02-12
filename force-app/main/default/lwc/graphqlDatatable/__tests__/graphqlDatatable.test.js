import GraphqlDatatable from 'c/graphqlDatatable';
import { graphql } from 'lightning/graphql';
import { getNavigateCalledWith } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';
import { createElement } from 'lwc';

const mockObjectInfo = require('./data/objectInfo.json');
const mockGraphqlResponse = require('./data/graphqlResponse.json');

const RECORD_ID = '0037Q000007dN20QAE';
const MOCK_ERROR = { body: { message: 'some error message' } };

function cloneResponse(overrides = {}) {
  const resp = JSON.parse(JSON.stringify(mockGraphqlResponse));
  Object.assign(resp.uiapi.query.Contact, overrides);
  return resp;
}

let element;

describe('c-graphql-datatable', () => {
  beforeEach(() => {
    element = createElement('c-graphql-datatable', {
      is: GraphqlDatatable
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should build columns including reference and unknown fields and be accessible with card layout', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    element.showCard = true;
    element.cardIcon = 'standard:contact';
    element.cardTitle = 'All Contacts';
    element.showViewRowAction = true;
    element.showEditRowAction = true;
    element.showDeleteRowAction = true;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const card = element.shadowRoot.querySelector('lightning-card');
    const datatable = element.shadowRoot.querySelector('c-datatable-extension');

    // then
    expect(card.iconName).toBe('standard:contact');
    expect(card.title).toBe('All Contacts');
    expect(datatable.columns).toHaveLength(7);
    expect(datatable.columns[0]).toMatchObject({ fieldName: 'Name', label: 'Full Name', type: 'text' });
    expect(datatable.columns[1]).toMatchObject({ fieldName: 'Email', type: 'email' });
    expect(datatable.columns[2]).toMatchObject({ fieldName: 'Phone', type: 'phone' });
    expect(datatable.columns[3]).toMatchObject({ fieldName: 'CreatedDate', label: 'Created Date', type: 'date' });
    expect(datatable.columns[4]).toMatchObject({ fieldName: 'AccountId', label: 'Account', type: 'datatableLookup' });
    expect(datatable.columns[4].typeAttributes).toBeDefined();
    expect(datatable.columns[5]).toMatchObject({ fieldName: 'UnknownField', type: 'text', editable: false });
    expect(datatable.columns[6]).toMatchObject({ type: 'action' });
    await expect(element).toBeAccessible();
  });

  it('should transform graphql response into flat records with correct value strategy', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const datatable = element.shadowRoot.querySelector('c-datatable-extension');

    // then
    expect(datatable.data).toHaveLength(3);
    expect(datatable.data[0]).toMatchObject({
      Id: RECORD_ID,
      Name: 'John Doe',
      Phone: '(555) 0100',
      CreatedDate: '2022-03-27T23:59:35.000Z',
      AccountId: 'Acme Corp'
    });
  });

  it('should handle view, edit, delete, and invalid row actions', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const childElement = element.shadowRoot.querySelector('c-datatable-extension');

    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'view' }, row: { Id: RECORD_ID } } })
    );

    // then
    expect(getNavigateCalledWith().pageReference).toMatchObject({
      type: 'standard__recordPage',
      attributes: { actionName: 'view' }
    });

    // when
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'edit' }, row: { Id: RECORD_ID } } })
    );

    // then
    expect(getNavigateCalledWith().pageReference).toMatchObject({
      type: 'standard__recordPage',
      attributes: { actionName: 'edit' }
    });

    // when
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'delete' }, row: { Id: RECORD_ID } } })
    );

    // then
    expect(deleteRecord).toHaveBeenCalledWith(RECORD_ID);

    // when
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'invalid' }, row: { Id: RECORD_ID } } })
    );

    // then
    expect(deleteRecord).toHaveBeenCalledTimes(1);
  });

  it('should handle error when delete record operation fails', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';

    // when
    deleteRecord.mockRejectedValue(MOCK_ERROR);
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'delete' }, row: { Id: RECORD_ID } } })
    );

    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(deleteRecord).toHaveBeenCalledWith(RECORD_ID);
  });

  it('should execute update record operation when save event is fired after inline editing', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    const draftRecord = { Id: RECORD_ID, Name: 'Updated Name' };
    childElement.dispatchEvent(new CustomEvent('save', { detail: { draftValues: [draftRecord] } }));

    // then
    return Promise.resolve().then(() => {
      expect(updateRecord).toHaveBeenCalledWith({ fields: draftRecord });
    });
  });

  it('should handle error when update record operation fails', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';

    // when
    updateRecord.mockRejectedValue(MOCK_ERROR);
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    const draftRecord = { Id: RECORD_ID, Name: 'Updated Name' };
    childElement.dispatchEvent(new CustomEvent('save', { detail: { draftValues: [draftRecord] } }));

    // then
    return Promise.resolve().then(() => {
      expect(updateRecord).toHaveBeenCalledWith({ fields: draftRecord });
    });
  });

  it('should execute delete record action when multiple rows are selected', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    element.isUsedAsRelatedList = true;
    element.showCard = true;
    element.showMultipleRowDeleteAction = true;

    // when
    deleteRecord.mockResolvedValue();
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const selectedRows = [{ Id: RECORD_ID }, { Id: '0037Q000007dN29QAE' }];
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('rowselection', { detail: { selectedRows } }));

    await new Promise((r) => setTimeout(r, 0));

    const deleteButton = element.shadowRoot.querySelector('lightning-button');
    deleteButton.click();

    // then
    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle error when delete operation for multiple records fails', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    element.isUsedAsRelatedList = true;
    element.showCard = true;
    element.showMultipleRowDeleteAction = true;

    // when
    deleteRecord.mockRejectedValue(MOCK_ERROR);
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);

    await new Promise((r) => setTimeout(r, 0));

    const selectedRows = [{ Id: RECORD_ID }, { Id: '0037Q000007dN29QAE' }];
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('rowselection', { detail: { selectedRows } }));

    await new Promise((r) => setTimeout(r, 0));

    const deleteButton = element.shadowRoot.querySelector('lightning-button');
    deleteButton.click();

    // then
    return Promise.resolve().then(() => {
      expect(deleteRecord).toHaveBeenCalledTimes(2);
    });
  });

  it('should navigate pages and jump directly to last when cursors are cached', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(cloneResponse({ totalCount: 2, pageInfo: { hasNextPage: true, endCursor: 'cursorA' } }));

    await new Promise((r) => setTimeout(r, 0));

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of 2');
    expect(pagination.isFirstPage).toBe(true);

    // when
    pagination.dispatchEvent(new CustomEvent('next'));
    await new Promise((r) => setTimeout(r, 0));
    graphql.emit(cloneResponse({ totalCount: 2, pageInfo: { hasNextPage: true, endCursor: 'cursorB' } }));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of 2');

    // when
    pagination.dispatchEvent(new CustomEvent('first'));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of 2');

    // when
    pagination.dispatchEvent(new CustomEvent('last'));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of 2');
    expect(pagination.isLastPage).toBe(true);

    // when
    pagination.dispatchEvent(new CustomEvent('previous'));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of 2');

    // when
    pagination.dispatchEvent(new CustomEvent('last'));
    await new Promise((r) => setTimeout(r, 0));
    pagination.dispatchEvent(new CustomEvent('last'));
    await new Promise((r) => setTimeout(r, 0));
  });

  it('should navigate to last page by iterating when cursors are not cached', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: true, endCursor: 'cursor1' } }));

    await new Promise((r) => setTimeout(r, 0));

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('last'));

    await new Promise((r) => setTimeout(r, 0));

    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: true, endCursor: 'cursor2' } }));
    await new Promise((r) => setTimeout(r, 0));

    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: false, endCursor: 'cursor3' } }));
    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 3 of 3');
    expect(pagination.isLastPage).toBe(true);
  });

  it('should reset page to 1 when search term changes', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    element.enableSearch = true;
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: true, endCursor: 'c1' } }));

    await new Promise((r) => setTimeout(r, 0));

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('next'));

    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of');

    // when
    const searchInput = element.shadowRoot.querySelector('lightning-input.search-input');
    searchInput.value = 'test%';
    searchInput.dispatchEvent(new CustomEvent('change', { detail: { value: 'test%' } }));

    await new Promise((r) => setTimeout(r, 0));

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of');
  });

  it('should show error toast when graphql returns errors', async () => {
    // given
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emitErrors([{ message: 'some graphql error' }]);

    await new Promise((r) => setTimeout(r, 0));

    // then
    const datatable = element.shadowRoot.querySelector('c-datatable-extension');
    expect(datatable.data).toEqual([]);
  });
});
