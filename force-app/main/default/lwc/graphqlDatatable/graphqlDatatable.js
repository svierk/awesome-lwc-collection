import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { gql, graphql } from 'lightning/graphql';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';
import { LightningElement, api, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';

const DATA_TYPE_MAP = {
  String: 'text',
  Int: 'number',
  Double: 'number',
  Long: 'number',
  Boolean: 'boolean',
  Date: 'date',
  DateTime: 'date',
  Currency: 'currency',
  Phone: 'phone',
  Url: 'url',
  Email: 'email',
  Percent: 'percent',
  Reference: 'datatableLookup'
};

const SEARCHABLE_DATA_TYPES = new Set(['String', 'Email', 'Phone', 'Url', 'Picklist', 'TextArea']);

/**
 * A custom datatable powered by GraphQL instead of Apex.
 * Accepts a comma-separated list of field API names instead of a FieldSet.
 * @alias GraphqlDatatable
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-graphql-datatable
 *   object-api-name="Contact"
 *   fields="Name,Email,Phone"
 *   enable-pagination
 *   page-size="25"
 * ></c-graphql-datatable>
 */
export default class GraphqlDatatable extends NavigationMixin(LightningElement) {
  @api cardIcon = '';
  @api cardTitle = '';
  @api columnWidthsMode = 'fixed';
  @api defaultSortDirection = 'asc';
  @api enablePagination = false;
  @api enableSearch = false;
  @api fields = '';
  @api hideCheckboxColumn = false;
  @api hideTableHeader = false;
  @api isUsedAsRelatedList = false;
  @api keyField = 'Id';
  @api maxColumnWidth = 1000;
  @api maxRowSelection = 50;
  @api minColumnWidth = 50;
  @api objectApiName = '';
  @api pageSize = 10;
  @api readOnly = false;
  @api resizeColumnDisabled = false;
  @api rowNumberOffset = 0;
  @api showCard = false;
  @api showDeleteRowAction = false;
  @api showEditRowAction = false;
  @api showMultipleRowDeleteAction = false;
  @api showRowNumberColumn = false;
  @api showViewRowAction = false;
  @api suppressBottomBar = false;
  @api whereConditions = '';

  @track columns = [];
  @track draftValues = [];
  @track records = [];
  @track selectedRecords = [];

  isLoading = true;
  hasSelectedRecords = false;
  _currentPage = 1;
  _totalRecordCount = 0;
  _searchTerm = '';
  _cursorCache = [null];
  _objectInfo;
  _graphqlResult;

  get fieldList() {
    return this.fields
      ? this.fields
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean)
      : [];
  }

  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  wiredObjectInfo({ data }) {
    if (data) {
      this._objectInfo = data;
      this.buildColumns();
    }
  }

  buildColumns() {
    if (!this._objectInfo || !this.fieldList.length) return;
    const objectFields = this._objectInfo.fields;
    const cols = this.fieldList.map((fieldName) => {
      const fieldInfo = objectFields[fieldName];
      if (!fieldInfo) {
        return { fieldName, label: fieldName, type: 'text', sortable: false, editable: false };
      }
      const columnType = DATA_TYPE_MAP[fieldInfo.dataType] || 'text';
      const isEditable = !this.readOnly && fieldInfo.updateable;
      const column = { fieldName, label: fieldInfo.label, type: columnType, sortable: false, editable: isEditable };
      if (columnType === 'datatableLookup') {
        column.initialWidth = 180;
        column.typeAttributes = {
          disabled: !isEditable,
          fieldName,
          objectName: this.objectApiName,
          recordId: { fieldName: 'Id' }
        };
      }
      return column;
    });
    this.columns = cols;
    this.addRowActions();
  }

  _buildWhereClause() {
    const parts = [];
    if (this.whereConditions) parts.push(this.whereConditions);
    if (this._searchTerm && this._objectInfo) {
      const filters = this._getSearchableFields()
        .map((f) => `{ ${f}: { like: "%${this._escapeLike(this._searchTerm)}%" } }`)
        .join(', ');
      if (filters) parts.push(`{ or: [${filters}] }`);
    }
    if (parts.length === 1) return `, where: ${parts[0]}`;
    if (parts.length > 1) return `, where: { and: [${parts.join(', ')}] }`;
    return '';
  }

  get graphqlQuery() {
    if (!this.objectApiName || !this.fieldList.length) return undefined;
    const fieldNodes = this.fieldList.map((f) => `${f} { value displayValue }`).join('\n            ');
    const firstVal = this.enablePagination ? this.pageSize : 2000;
    const afterVal = this._cursorCache[this._currentPage - 1] || null;
    const afterParam = afterVal ? `, after: "${afterVal}"` : '';
    const whereClause = this._buildWhereClause();
    const queryString = `query { uiapi { query {
      ${this.objectApiName}(first: ${firstVal}${afterParam}${whereClause}) {
        edges { node { Id ${fieldNodes} } }
        totalCount
        pageInfo { hasNextPage endCursor }
      }
    } } }`;
    return gql`
      ${queryString}
    `;
  }

  @wire(graphql, { query: '$graphqlQuery' })
  wiredGraphQL(result) {
    this._graphqlResult = result;
    const { data, errors } = result;
    if (data) {
      this.isLoading = false;
      const queryResult = data.uiapi.query[this.objectApiName];
      this._totalRecordCount = queryResult.totalCount;
      this.records = queryResult.edges.map(({ node }) => {
        const record = { Id: node.Id };
        this.fieldList.forEach((field) => {
          record[field] = node[field]?.displayValue ?? node[field]?.value;
        });
        return record;
      });
      const { hasNextPage, endCursor } = queryResult.pageInfo;
      if (hasNextPage && this._cursorCache.length <= this._currentPage) {
        this._cursorCache.push(endCursor);
      }
    } else if (errors) {
      this.isLoading = false;
      this.showToast('Error loading records', errors[0]?.message || 'Unknown error', 'error');
    }
  }

  _refreshData() {
    return refreshApex(this._graphqlResult);
  }

  _getSearchableFields() {
    if (!this._objectInfo) return [];
    const objectFields = this._objectInfo.fields;
    return this.fieldList.filter((f) => {
      const info = objectFields[f];
      return info && SEARCHABLE_DATA_TYPES.has(info.dataType);
    });
  }

  _escapeLike(value) {
    return value.replace(/[%_\\]/g, '\\$&');
  }

  get currentSearchTerm() {
    return this.enableSearch && this._searchTerm ? this._searchTerm : null;
  }

  get showSearch() {
    return this.enableSearch;
  }

  get totalPages() {
    if (!this.enablePagination) return 1;
    return Math.ceil(this._totalRecordCount / this.pageSize) || 1;
  }

  get isFirstPage() {
    return this._currentPage <= 1;
  }

  get isLastPage() {
    return this._currentPage >= this.totalPages;
  }

  get showPagination() {
    return this.enablePagination && this.totalPages > 1;
  }

  get paginationLabel() {
    return `Page ${this._currentPage} of ${this.totalPages}`;
  }

  get recordCountLabel() {
    const start = (this._currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this._currentPage * this.pageSize, this._totalRecordCount);
    return `Showing ${start}\u2013${end} of ${this._totalRecordCount} records`;
  }

  get computedRowNumberOffset() {
    return this.enablePagination ? (this._currentPage - 1) * this.pageSize : this.rowNumberOffset;
  }

  get datatableProperties() {
    return {
      keyField: this.keyField,
      data: this.records,
      columns: this.columns,
      columnWidthsMode: this.columnWidthsMode,
      defaultSortDirection: this.defaultSortDirection,
      draftValues: this.draftValues,
      hideCheckboxColumn: this.hideCheckboxColumn,
      hideTableHeader: this.hideTableHeader,
      maxColumnWidth: this.maxColumnWidth,
      maxRowSelection: this.maxRowSelection,
      minColumnWidth: this.minColumnWidth,
      rowNumberOffset: this.computedRowNumberOffset,
      resizeColumnDisabled: this.resizeColumnDisabled,
      showRowNumberColumn: this.showRowNumberColumn,
      suppressBottomBar: this.suppressBottomBar
    };
  }

  handleFirst() {
    this._currentPage = 1;
  }

  handlePrevious() {
    if (this._currentPage > 1) this._currentPage--;
  }

  handleNext() {
    if (this._currentPage < this.totalPages) this._currentPage++;
  }

  handleLast() {
    if (this._cursorCache.length > this.totalPages) this._currentPage = this.totalPages;
  }

  handleSearchChange(event) {
    this._searchTerm = event.target.value;
    this._currentPage = 1;
    this._cursorCache = [null];
  }

  addRowActions() {
    const actions = [];
    if (this.showViewRowAction) actions.push({ label: 'View', name: 'view' });
    if (this.showEditRowAction) actions.push({ label: 'Edit', name: 'edit' });
    if (this.showDeleteRowAction) actions.push({ label: 'Delete', name: 'delete' });
    if (actions.length) {
      this.columns.push({ type: 'action', typeAttributes: { rowActions: actions, menuAlignment: 'right' } });
    }
  }

  handleRowAction(event) {
    const actionName = event.detail.action.name;
    const row = event.detail.row;
    switch (actionName) {
      case 'view':
        this.viewCurrentRecord(row);
        break;
      case 'edit':
        this.editCurrentRecord(row);
        break;
      case 'delete':
        this.deleteCurrentRecord(row);
        break;
      default:
    }
  }

  viewCurrentRecord(row) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: { recordId: row.Id, actionName: 'view' }
    });
  }

  editCurrentRecord(row) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: { recordId: row.Id, actionName: 'edit' }
    });
  }

  deleteCurrentRecord(row) {
    this.isLoading = true;
    deleteRecord(row.Id)
      .then(() => {
        this.showToast('Success', 'Record deleted', 'success');
        return this._refreshData().then(() => {
          this.isLoading = false;
        });
      })
      .catch((error) => {
        this.showToast('Error deleting record', error.body.message, 'error');
      });
  }

  handleSave(event) {
    const recordInputs = event.detail.draftValues.slice().map((draft) => ({ fields: { ...draft } }));
    const promises = recordInputs.map((recordInput) => updateRecord(recordInput));
    Promise.all(promises)
      .then(() => {
        this.showToast('Success', 'Records updated', 'success');
        return this._refreshData().then(() => {
          this.draftValues = [];
        });
      })
      .catch((error) => {
        this.showToast('Error updating records', error.body.message, 'error');
      });
  }

  getSelectedRecords(event) {
    this.selectedRecords = event.detail.selectedRows;
    this.hasSelectedRecords = this.selectedRecords.length > 0;
  }

  deleteSelectedRecords() {
    this.isLoading = true;
    const promises = this.selectedRecords.map((record) => deleteRecord(record.Id));
    Promise.all(promises)
      .then(() => {
        this.showToast('Success', 'Records deleted', 'success');
        return this._refreshData().then(() => {
          this.isLoading = false;
        });
      })
      .catch((error) => {
        this.showToast('Error deleting records', error.body.message, 'error');
      });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
