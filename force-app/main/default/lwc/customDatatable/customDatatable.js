import getColumns from '@salesforce/apex/CustomDatatableUtil.convertFieldSetToColumns';
import getRecords from '@salesforce/apex/CustomDatatableUtil.getRecordsWithFieldSet';
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
export default class CustomDatatable extends LightningElement {
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
   * If present, the checkbox column for row selection is hidden.
   * @type {boolean}
   * @default false
   */
  @api hideCheckboxColumn = false;

  /**
   * The maximum number of rows that can be selected.
   * Checkboxes are used for selection by default, and radio buttons are used when maxRowSelection is 1.
   * @type {number}
   * @default 50
   */
  @api maxRowSelection = 50;

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

  @track records = [];
  @track columns = [];

  isLoading = true;

  @wire(getColumns, { objectName: '$objectApiName', fieldSetName: '$fieldSetApiName', readOnly: '$readOnly' })
  wiredGetColumns({ data }) {
    if (data) {
      this.isLoading = false;
      this.columns = data;
    }
  }

  @wire(getRecords, {
    objectName: '$objectApiName',
    fieldSetName: '$fieldSetApiName',
    whereConditions: '$whereConditions'
  })
  wiredGetRecords({ data }) {
    if (data) {
      this.records = data;
    }
  }
}
