import { refreshApex } from '@salesforce/apex';
import getColumns from '@salesforce/apex/CustomDatatableUtil.convertFieldSetToColumns';
import getRecordCount from '@salesforce/apex/CustomDatatableUtil.getRecordCount';
import getRecords from '@salesforce/apex/CustomDatatableUtil.getRecordsWithFieldSet';
import {
  addRowActions,
  buildDatatableProperties,
  deleteSelectedRecords,
  getSelectedRecords,
  handleRowAction,
  handleSave,
  showToast
} from 'c/datatableUtils';
import { NavigationMixin } from 'lightning/navigation';
import { LightningElement, api, track, wire } from 'lwc';

/**
 * A custom datatable with different configuration options.
 * @alias CustomDatatable
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-custom-datatable
 *   object-api-name="Case"
 *   field-set-api-name="CaseFieldSet"
 *   where-conditions="Status = 'New'"
 *   hide-checkbox-column
 *   show-row-number-column
 *   enable-pagination
 *   page-size="25"
 * ></c-custom-datatable>
 */
export default class CustomDatatable extends NavigationMixin(LightningElement) {
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
   * API name of the field set that specifies which fields are displayed in the table.
   * @type {string}
   */
  @api fieldSetApiName = '';

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
   * @example Status = 'New'
   */
  @api whereConditions = '';

  @track columns = [];
  @track draftValues = [];
  @track records = [];
  @track selectedRecords = [];
  @track wiredRecords = [];

  isLoading = true;
  hasSelectedRecords = false;
  _currentPage = 1;
  _totalRecordCount = 0;
  _searchTerm = '';

  @wire(getColumns, { objectName: '$objectApiName', fieldSetName: '$fieldSetApiName', readOnly: '$readOnly' })
  wiredGetColumns({ data }) {
    if (data) {
      this.isLoading = false;
      this.columns = data.slice();
      this.addRowActions();
    }
  }

  @wire(getRecordCount, {
    objectName: '$objectApiName',
    fieldSetName: '$fieldSetApiName',
    whereConditions: '$whereConditions',
    searchTerm: '$currentSearchTerm'
  })
  wiredGetRecordCount({ data }) {
    if (data !== undefined) {
      this._totalRecordCount = data;
    }
  }

  @wire(getRecords, {
    objectName: '$objectApiName',
    fieldSetName: '$fieldSetApiName',
    whereConditions: '$whereConditions',
    pageSize: '$currentPageSize',
    pageNumber: '$currentPageNumber',
    searchTerm: '$currentSearchTerm'
  })
  wiredGetRecords(result) {
    this.wiredRecords = result;
    if (result.data) {
      this.records = result.data;
    } else if (result.error) {
      this.showToast('Error loading records', result.error.body?.message || 'Unknown error', 'error');
    }
  }

  get currentSearchTerm() {
    return this.enableSearch && this._searchTerm ? this._searchTerm : null;
  }

  get showSearch() {
    return this.enableSearch;
  }

  get currentPageSize() {
    return this.enablePagination ? this.pageSize : null;
  }

  get currentPageNumber() {
    return this.enablePagination ? this._currentPage : null;
  }

  get totalPages() {
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
    if (this.enablePagination) {
      return (this._currentPage - 1) * this.pageSize;
    }
    return this.rowNumberOffset;
  }

  get datatableProperties() {
    return buildDatatableProperties(this);
  }

  handleFirst() {
    this._currentPage = 1;
  }

  handlePrevious() {
    if (this._currentPage > 1) {
      this._currentPage--;
    }
  }

  handleNext() {
    if (this._currentPage < this.totalPages) {
      this._currentPage++;
    }
  }

  handleLast() {
    this._currentPage = this.totalPages;
  }

  handleSearchChange(event) {
    this._searchTerm = event.target.value;
    this._currentPage = 1;
  }

  addRowActions() {
    addRowActions(this.columns, this.showViewRowAction, this.showEditRowAction, this.showDeleteRowAction);
  }

  handleRowAction(event) {
    handleRowAction(this, event, () => refreshApex(this.wiredRecords));
  }

  handleSave(event) {
    handleSave(this, event.detail.draftValues, () => refreshApex(this.wiredRecords));
  }

  getSelectedRecords(event) {
    getSelectedRecords(this, event);
  }

  deleteSelectedRecords() {
    deleteSelectedRecords(this, this.selectedRecords, () => refreshApex(this.wiredRecords));
  }

  showToast(title, message, variant) {
    showToast(this, title, message, variant);
  }
}
