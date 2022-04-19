import { refreshApex } from '@salesforce/apex';
import getColumns from '@salesforce/apex/CustomDatatableUtil.convertFieldSetToColumns';
import getRecords from '@salesforce/apex/CustomDatatableUtil.getRecordsWithFieldSet';
import { NavigationMixin } from 'lightning/navigation';
import { deleteRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, track, wire } from 'lwc';

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
 * ></c-custom-datatable>
 */
export default class CustomDatatable extends NavigationMixin(LightningElement) {
  /**
   * API name of the object that will be displayed in the table.
   * @type {string}
   */
  @api objectApiName = '';

  /**
   * API name of the field set that specifies which fields are displayed in the table.
   * @type {string}
   */
  @api fieldSetApiName = '';

  /**
   * Optional where clause conditions for loaded data records.
   * @type {string}
   * @default ''
   * @example Status = 'New'
   */
  @api whereConditions = '';

  /**
   * If present, then all datatable fields are not editable.
   * @type {boolean}
   * @default false
   */
  @api readOnly = false;

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
   * If present, the last column contains a edit record action.
   * @type {boolean}
   * @default false
   */
  @api showEditRowAction = false;

  /**
   * If present, the last column contains a delete record action.
   * @type {boolean}
   * @default false
   */
  @api showDeleteRowAction = false;

  /**
   * If present, the footer that displays the Save and Cancel buttons is hidden during inline editing.
   * @type {boolean}
   * @default false
   */
  @api suppressBottomBar = false;

  @track wiredRecords = [];
  @track records = [];
  @track columns = [];

  isLoading = true;

  @wire(getColumns, { objectName: '$objectApiName', fieldSetName: '$fieldSetApiName', readOnly: '$readOnly' })
  wiredGetColumns({ data }) {
    if (data) {
      this.isLoading = false;
      this.columns = data.slice();
      this.addRowActions();
    }
  }

  @wire(getRecords, {
    objectName: '$objectApiName',
    fieldSetName: '$fieldSetApiName',
    whereConditions: '$whereConditions'
  })
  wiredGetRecords(result) {
    this.wiredRecords = result;
    if (result.data) {
      this.records = result.data;
    }
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
      attributes: {
        recordId: row.Id,
        objectApiName: this.objectName,
        actionName: 'view'
      }
    });
  }

  editCurrentRecord(row) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: row.Id,
        objectApiName: this.objectName,
        actionName: 'edit'
      }
    });
  }

  deleteCurrentRecord(row) {
    this.isLoading = true;
    deleteRecord(row.Id).then(() => {
      refreshApex(this.wiredRecords);
      this.isLoading = false;
    });
  }
}
