import GraphqlDatatable from 'c/graphqlDatatable';
import { executeMutation, graphql } from 'lightning/graphql';
import { getNavigateCalledWith } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
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

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

let element;

describe('c-graphql-datatable', () => {
  beforeEach(() => {
    element = createElement('c-graphql-datatable', { is: GraphqlDatatable });
    element.objectApiName = 'Contact';
    element.fields = 'Name,Email,Phone,CreatedDate,AccountId,UnknownField';
    executeMutation.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  async function mountWithDefaults() {
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(mockGraphqlResponse);
    await flushPromises();
  }

  it('should build columns including reference and unknown fields and be accessible with card layout', async () => {
    // given
    element.showCard = true;
    element.cardIcon = 'standard:contact';
    element.cardTitle = 'All Contacts';
    element.showViewRowAction = true;
    element.showEditRowAction = true;
    element.showDeleteRowAction = true;

    // when
    await mountWithDefaults();
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
    // when
    await mountWithDefaults();
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
    // when
    await mountWithDefaults();
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
    expect(executeMutation).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.stringContaining(RECORD_ID) })
    );

    // when
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'invalid' }, row: { Id: RECORD_ID } } })
    );

    // then
    expect(executeMutation).toHaveBeenCalledTimes(1);
  });

  it('should handle error when delete record operation fails', async () => {
    // when
    executeMutation.mockRejectedValue(MOCK_ERROR);
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'delete' }, row: { Id: RECORD_ID } } })
    );

    await flushPromises();

    // then
    expect(executeMutation).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.stringContaining(RECORD_ID) })
    );
  });

  it('should execute update record operation when save event is fired after inline editing', async () => {
    // when
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('save', { detail: { draftValues: [{ Id: RECORD_ID, Name: 'Updated Name' }] } })
    );

    // then
    return Promise.resolve().then(() => {
      expect(executeMutation).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringContaining(RECORD_ID) })
      );
      expect(executeMutation).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringContaining('Updated Name') })
      );
    });
  });

  it('should handle error when update record operation fails', async () => {
    // when
    executeMutation.mockRejectedValue(MOCK_ERROR);
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('save', { detail: { draftValues: [{ Id: RECORD_ID, Name: 'Updated Name' }] } })
    );

    // then
    return Promise.resolve().then(() => {
      expect(executeMutation).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringContaining(RECORD_ID) })
      );
    });
  });

  it('should show error toast when save mutation resolves with graphql errors', async () => {
    // when
    executeMutation.mockResolvedValue({ errors: [{ message: 'Update failed' }] });
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('save', { detail: { draftValues: [{ Id: RECORD_ID, Name: 'Updated Name' }] } })
    );

    await flushPromises();

    // then
    expect(executeMutation).toHaveBeenCalledTimes(1);
  });

  it('should execute delete record action when multiple rows are selected', async () => {
    // given
    element.isUsedAsRelatedList = true;
    element.showCard = true;
    element.showMultipleRowDeleteAction = true;

    // when
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowselection', { detail: { selectedRows: [{ Id: RECORD_ID }, { Id: '0037Q000007dN29QAE' }] } })
    );

    await flushPromises();
    element.shadowRoot.querySelector('lightning-button').click();

    // then
    return Promise.resolve().then(() => {
      expect(executeMutation).toHaveBeenCalledTimes(2);
      expect(executeMutation).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringContaining(RECORD_ID) })
      );
      expect(executeMutation).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringContaining('0037Q000007dN29QAE') })
      );
    });
  });

  it('should handle error when delete operation for multiple records fails', async () => {
    // given
    element.isUsedAsRelatedList = true;
    element.showCard = true;
    element.showMultipleRowDeleteAction = true;

    // when
    executeMutation.mockRejectedValue(MOCK_ERROR);
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowselection', { detail: { selectedRows: [{ Id: RECORD_ID }, { Id: '0037Q000007dN29QAE' }] } })
    );

    await flushPromises();
    element.shadowRoot.querySelector('lightning-button').click();

    // then
    return Promise.resolve().then(() => {
      expect(executeMutation).toHaveBeenCalledTimes(2);
    });
  });

  it('should show error toast when delete multiple records mutation resolves with graphql errors', async () => {
    // given
    element.isUsedAsRelatedList = true;
    element.showCard = true;
    element.showMultipleRowDeleteAction = true;

    // when
    executeMutation.mockResolvedValue({ errors: [{ message: 'Delete failed' }] });
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(new CustomEvent('rowselection', { detail: { selectedRows: [{ Id: RECORD_ID }] } }));

    await flushPromises();
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(executeMutation).toHaveBeenCalledTimes(1);
  });

  it('should show error toast when single row delete mutation resolves with graphql errors', async () => {
    // when
    executeMutation.mockResolvedValue({ errors: [{ message: 'Delete failed' }] });
    await mountWithDefaults();
    const childElement = element.shadowRoot.querySelector('c-datatable-extension');
    childElement.dispatchEvent(
      new CustomEvent('rowaction', { detail: { action: { name: 'delete' }, row: { Id: RECORD_ID } } })
    );

    await flushPromises();

    // then
    expect(executeMutation).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.stringContaining(RECORD_ID) })
    );
  });

  it('should navigate pages and jump directly to last when cursors are cached', async () => {
    // given
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(cloneResponse({ totalCount: 2, pageInfo: { hasNextPage: true, endCursor: 'cursorA' } }));
    await flushPromises();

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of 2');
    expect(pagination.isFirstPage).toBe(true);

    // when
    pagination.dispatchEvent(new CustomEvent('next'));
    await flushPromises();
    graphql.emit(cloneResponse({ totalCount: 2, pageInfo: { hasNextPage: true, endCursor: 'cursorB' } }));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of 2');

    // when
    pagination.dispatchEvent(new CustomEvent('first'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of 2');

    // when
    pagination.dispatchEvent(new CustomEvent('last'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of 2');
    expect(pagination.isLastPage).toBe(true);

    // when
    pagination.dispatchEvent(new CustomEvent('previous'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of 2');

    // when
    pagination.dispatchEvent(new CustomEvent('last'));
    await flushPromises();
    pagination.dispatchEvent(new CustomEvent('last'));
    await flushPromises();
  });

  it('should navigate to last page by iterating when cursors are not cached', async () => {
    // given
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: true, endCursor: 'cursor1' } }));
    await flushPromises();

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('last'));
    await flushPromises();

    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: true, endCursor: 'cursor2' } }));
    await flushPromises();

    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: false, endCursor: 'cursor3' } }));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 3 of 3');
    expect(pagination.isLastPage).toBe(true);
  });

  it('should reset page to 1 when search term changes', async () => {
    // given
    element.enableSearch = true;
    element.enablePagination = true;
    element.pageSize = 1;

    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emit(cloneResponse({ totalCount: 3, pageInfo: { hasNextPage: true, endCursor: 'c1' } }));
    await flushPromises();

    const pagination = element.shadowRoot.querySelector('c-datatable-pagination');
    pagination.dispatchEvent(new CustomEvent('next'));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 2 of');

    // when
    const searchInput = element.shadowRoot.querySelector('lightning-input.search-input');
    searchInput.value = 'test%';
    searchInput.dispatchEvent(new CustomEvent('change', { detail: { value: 'test%' } }));
    await flushPromises();

    // then
    expect(pagination.paginationLabel).toContain('Page 1 of');
  });

  it('should show error toast when graphql returns errors', async () => {
    // when
    document.body.appendChild(element);
    getObjectInfo.emit(mockObjectInfo);
    graphql.emitErrors([{ message: 'some graphql error' }]);
    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('c-datatable-extension');
    expect(datatable.data).toEqual([]);
  });
});
