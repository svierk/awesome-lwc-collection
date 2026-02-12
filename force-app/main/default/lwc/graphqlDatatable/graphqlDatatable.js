import { refreshApex } from '@salesforce/apex';
import { gql, graphql } from 'lightning/graphql';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { deleteRecord, updateRecord } from 'lightning/uiRecordApi';
import { LightningElement, api, track, wire } from 'lwc';

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
const RAW_VALUE_DATA_TYPES = new Set(['Date', 'DateTime', 'Currency', 'Percent', 'Int', 'Double', 'Long', 'Boolean']);

/**
 * A custom datatable powered by GraphQL instead of Apex.
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
  /**
   * If show card option is active, the card icon is displayed in the header before the card title.
   * It should contain the SLDS name of the icon.
   * Specify the name in the format 'utility:down' where 'utility' is the category and 'down' the icon to be displayed.
   * @type {string}
   * @default ''
   * @example 'standard:case'
   */
  @api cardIcon = '';

  /**
   * If show card option is active, the card title can include text and is displayed in the header above the table.
   * @type {string}
   * @default ''
   */
  @api cardTitle = '';

  /**
   * Specifies how column widths are calculated. Set to 'fixed' for columns with equal widths.
   * Set to 'auto' for column widths that are based on the width of the column content and the table width.
   * @type {string}
   * @default 'fixed'
   */
  @api columnWidthsMode = 'fixed';

  /**
   * Specifies the default sorting direction on an unsorted column. Valid options include 'asc' and 'desc'.
   * @type {string}
   * @default 'asc'
   */
  @api defaultSortDirection = 'asc';

  /**
   * If present, enables server-side pagination with page navigation controls.
   * @type {boolean}
   * @default false
   */
  @api enablePagination = false;

  /**
   * If present, enables a server-side fuzzy search input that filters records across all text fields.
   * @type {boolean}
   * @default false
   */
  @api enableSearch = false;

  /**
   * Comma-separated list of field API names that specifies which fields are displayed in the table.
   * @type {string}
   * @example 'Name,Email,Phone'
   */
  @api fields = '';

  /**
   * If present, the checkbox column for row selection is hidden.
   * @type {boolean}
   * @default false
   */
  @api hideCheckboxColumn = false;

  /**
   * If present, the table header is hidden.
   * @type {boolean}
   * @default false
   */
  @api hideTableHeader = false;

  /**
   * If present, the table is wrapped with the correct page header to fit better into the related list layout.
   * @type {boolean}
   * @default false
   */
  @api isUsedAsRelatedList = false;

  /**
   * Required field for better table performance. Associates each row with a unique Id.
   * @type {string}
   * @default 'Id'
   */
  @api keyField = 'Id';

  /**
   * The maximum width for all columns. The default is 1000px.
   * @type {number}
   * @default 1000
   */
  @api maxColumnWidth = 1000;

  /**
   * The maximum number of rows that can be selected.
   * Checkboxes are used for selection by default, and radio buttons are used when maxRowSelection is 1.
   * @type {number}
   * @default 50
   */
  @api maxRowSelection = 50;

  /**
   * The minimum width for all columns. The default is 50px.
   * @type {number}
   * @default 50
   */
  @api minColumnWidth = 50;

  /**
   * API name of the object that will be displayed in the table.
   * @type {string}
   */
  @api objectApiName = '';

  /**
   * The number of records displayed per page when pagination is enabled.
   * @type {number}
   * @default 10
   */
  @api pageSize = 10;

  /**
   * If present, then all datatable fields are not editable.
   * @type {boolean}
   * @default false
   */
  @api readOnly = false;

  /**
   * If present, column resizing is disabled.
   * @type {boolean}
   * @default false
   */
  @api resizeColumnDisabled = false;

  /**
   * Determines where to start counting the row number.
   * @type {number}
   * @default 0
   */
  @api rowNumberOffset = 0;

  /**
   * If present, the table is wrapped in a lightning card to fit better into the overall page layout.
   * @type {boolean}
   * @default false
   */
  @api showCard = false;

  /**
   * If present, the last column contains a delete record action.
   * @type {boolean}
   * @default false
   */
  @api showDeleteRowAction = false;

  /**
   * If present, the last column contains a edit record action.
   * @type {boolean}
   * @default false
   */
  @api showEditRowAction = false;

  /**
   * If present, a delete action button is available when multiple records are selected.
   * This is only available if the checkbox column is visible and the table is either displayed with a Lightning Card
   * or as a Related List.
   * @type {boolean}
   * @default false
   */
  @api showMultipleRowDeleteAction = false;

  /**
   * If present, the row numbers are shown in the first column.
   * @type {boolean}
   * @default false
   */
  @api showRowNumberColumn = false;

  /**
   * If present, the last column contains a view record action.
   * @type {boolean}
   * @default false
   */
  @api showViewRowAction = false;

  /**
   * If present, the footer that displays the Save and Cancel buttons is hidden during inline editing.
   * @type {boolean}
   * @default false
   */
  @api suppressBottomBar = false;

  /**
   * Optional where clause conditions for loaded data records.
   * @type {string}
   * @default ''
   * @example { Status: { eq: "New" } }
   */
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
  _navigatingToLast = false;
  _fieldDataTypes = {};

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
    this._fieldDataTypes = {};
    const cols = this.fieldList.map((fieldName) => {
      const fieldInfo = objectFields[fieldName];
      if (!fieldInfo) {
        return { fieldName, label: fieldName, type: 'text', sortable: false, editable: false };
      }
      this._fieldDataTypes[fieldName] = fieldInfo.dataType;
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
      if (!this._navigatingToLast) this.isLoading = false;
      const queryResult = data.uiapi.query[this.objectApiName];
      this._totalRecordCount = queryResult.totalCount;
      this.records = queryResult.edges.map(({ node }) => {
        const record = { Id: node.Id };
        this.fieldList.forEach((field) => {
          const useRawValue = RAW_VALUE_DATA_TYPES.has(this._fieldDataTypes[field]);
          record[field] = useRawValue ? node[field]?.value : (node[field]?.displayValue ?? node[field]?.value);
        });
        return record;
      });
      const { hasNextPage, endCursor } = queryResult.pageInfo;
      if (hasNextPage && this._cursorCache.length <= this._currentPage) {
        this._cursorCache.push(endCursor);
      }
      if (this._navigatingToLast) {
        if (hasNextPage && this._currentPage < this.totalPages) {
          this._currentPage++;
        } else {
          this._navigatingToLast = false;
          this.isLoading = false;
        }
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
    return value.replaceAll(/[%_\\]/g, String.raw`\$&`);
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
    const lastPage = this.totalPages;
    if (this._currentPage >= lastPage) return;
    if (this._cursorCache.length > lastPage) {
      this._currentPage = lastPage;
    } else {
      this.isLoading = true;
      this._navigatingToLast = true;
      this._currentPage++;
    }
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
