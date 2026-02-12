import { refreshApex } from '@salesforce/apex';
import {
  addRowActions,
  buildDatatableProperties,
  deleteSelectedRecords,
  getSelectedRecords,
  handleRowAction,
  handleSave,
  showToast
} from 'c/datatableUtils';
import { gql, graphql } from 'lightning/graphql';
import { NavigationMixin } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
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
    return buildDatatableProperties(this);
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
    addRowActions(this.columns, this.showViewRowAction, this.showEditRowAction, this.showDeleteRowAction);
  }

  handleRowAction(event) {
    handleRowAction(this, event, () => this._refreshData());
  }

  handleSave(event) {
    handleSave(this, event.detail.draftValues, () => this._refreshData());
  }

  getSelectedRecords(event) {
    getSelectedRecords(this, event);
  }

  deleteSelectedRecords() {
    deleteSelectedRecords(this, this.selectedRecords, () => this._refreshData());
  }

  showToast(title, message, variant) {
    showToast(this, title, message, variant);
  }
}
