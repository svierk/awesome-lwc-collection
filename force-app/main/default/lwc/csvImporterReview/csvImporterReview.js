import ERRORS from '@salesforce/label/c.CsvImporterReview_Errors';
import NO_ERRORS from '@salesforce/label/c.CsvImporterReview_NoErrors';
import ONLY_ERRORS from '@salesforce/label/c.CsvImporterReview_OnlyErrors';
import PICKLIST_ERROR from '@salesforce/label/c.CsvImporterReview_PicklistError';
import ROW from '@salesforce/label/c.CsvImporterReview_Row';
import { picklistValues, validateRecords } from 'c/csvValidator';
import { getErrorMessage } from 'c/errorUtils';
import { formatLabel } from 'c/labelUtils';
import { getObjectInfo, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import { api, LightningElement, wire } from 'lwc';

// field API names can't start with an underscore, so the key never hides a field
const KEY = '_key';
const LISTED_ROWS = 10;
// the datatable shows the rows in pages, because rendering thousands of rows at once takes seconds
const PAGE_SIZE = 50;

/**
 * Checks the rows of a CSV file against the fields their columns are mapped to, and lets users correct the values
 * in the table. Used by the CSV Importer.
 * @alias CsvImporterReview
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires CsvImporterReview#reviewchange
 */
export default class CsvImporterReview extends LightningElement {
  /**
   * The object the rows are imported into.
   * @type {string}
   */
  @api
  get objectApiName() {
    return this._objectApiName;
  }

  set objectApiName(value) {
    if (value !== this._objectApiName) {
      this._objectApiName = value;
      this.objectInfo = undefined;
      this.recordTypeId = undefined;
      this.picklists = {};
      this.picklistsLoaded = false;
      this.build();
    }
  }

  /**
   * The field API name each column is mapped to; columns mapped to an empty value are skipped.
   * @type {Object}
   */
  @api
  get mapping() {
    return this._mapping;
  }

  set mapping(value) {
    this._mapping = value ?? {};
    this.build();
  }

  /**
   * The rows of the file. A new file drops the corrections made so far.
   * @type {Object[]}
   */
  @api
  get rows() {
    return this._rows;
  }

  set rows(value) {
    this._rows = Array.isArray(value) ? value : [];
    this.corrections = {};
    this.shownCount = PAGE_SIZE;
    this.build();
  }

  objectInfo;
  recordTypeId;
  labels = { onlyErrors: ONLY_ERRORS };
  picklists = {};
  picklistsLoaded = false;
  picklistError = '';
  records = [];
  errors = {};
  draftValues = [];
  onlyErrors = false;
  shownCount = PAGE_SIZE;
  corrections = {};
  _objectApiName;
  _mapping = {};
  _rows = [];

  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  wiredObjectInfo({ data }) {
    // the mapping step already shows why an object can't be loaded
    if (data) {
      this.objectInfo = data;
      this.recordTypeId = data.defaultRecordTypeId;
      this.build();
    }
  }

  @wire(getPicklistValuesByRecordType, { objectApiName: '$objectApiName', recordTypeId: '$recordTypeId' })
  wiredPicklists({ data, error }) {
    if (data) {
      this.picklists = picklistValues(data);
      this.picklistsLoaded = true;
      this.picklistError = '';
      this.build();
    } else if (error) {
      this.picklists = {};
      this.picklistsLoaded = true;
      this.picklistError = formatLabel(PICKLIST_ERROR, getErrorMessage(error));
      this.notify();
    }
  }

  /** The mapped columns with the fields of the object they are mapped to. */
  get mappedFields() {
    const fields = this.objectInfo?.fields ?? {};
    return Object.entries(this._mapping)
      .filter(([, apiName]) => fields[apiName])
      .map(([column, apiName]) => ({ column, field: fields[apiName] }));
  }

  get columns() {
    const fields = this.mappedFields.map(({ field }) => ({
      label: field.label,
      fieldName: field.apiName,
      editable: true
    }));
    // the datatable numbers the rows it shows, so the filtered rows also need their row in the file
    return this.onlyErrors ? [{ label: ROW, fieldName: KEY, initialWidth: 80 }, ...fields] : fields;
  }

  get filteredRecords() {
    return this.onlyErrors ? this.records.filter((record) => this.errors[record[KEY]]) : this.records;
  }

  get visibleRecords() {
    return this.filteredRecords.slice(0, this.shownCount);
  }

  get hasMoreRows() {
    return this.shownCount < this.filteredRecords.length;
  }

  get tableErrors() {
    return { rows: this.errors };
  }

  get errorKeys() {
    return Object.keys(this.errors);
  }

  get hasNoErrors() {
    return this.errorKeys.length === 0;
  }

  get summary() {
    const keys = this.errorKeys;
    if (!keys.length) {
      return formatLabel(NO_ERRORS, 0, this.records.length);
    }
    const listed = keys.slice(0, LISTED_ROWS).join(', ') + (keys.length > LISTED_ROWS ? ', …' : '');
    return formatLabel(ERRORS, keys.length, this.records.length, listed);
  }

  handleOnlyErrorsChange(event) {
    this.onlyErrors = event.target.checked;
    this.shownCount = PAGE_SIZE;
  }

  handleLoadMore() {
    this.shownCount += PAGE_SIZE;
  }

  /** Keeps the values users entered by row and column, so they survive a change of the mapping. */
  handleSave(event) {
    const columns = Object.fromEntries(this.mappedFields.map(({ column, field }) => [field.apiName, column]));
    event.detail.draftValues.forEach(({ [KEY]: key, ...values }) => {
      Object.entries(values).forEach(([apiName, value]) => {
        this.corrections[key] = { ...this.corrections[key], [columns[apiName]]: value };
      });
    });
    this.draftValues = [];
    this.build();
  }

  /** Turns the rows into records of the mapped fields, with the corrections, and checks them. */
  build() {
    const mappedFields = this.mappedFields;
    this.records = this._rows.map((row, index) => {
      const key = String(index + 1);
      const record = { [KEY]: key };
      mappedFields.forEach(({ column, field }) => {
        record[field.apiName] = this.corrections[key]?.[column] ?? row[column];
      });
      return record;
    });
    this.errors = validateRecords(
      this.records,
      mappedFields.map(({ field }) => field),
      KEY,
      this.picklists
    );
    this.notify();
  }

  notify() {
    /**
     * Fired when the rows were checked again.
     * @event CsvImporterReview#reviewchange
     * @type {CustomEvent}
     * @property {Object} detail - valid: whether every row can be imported; rows: the rows of the file with the
     * corrections, by column
     */
    this.dispatchEvent(
      new CustomEvent('reviewchange', {
        detail: {
          valid: Boolean(this.objectInfo) && this.picklistsLoaded && this.records.length > 0 && this.hasNoErrors,
          rows: this._rows.map((row, index) => ({ ...row, ...this.corrections[String(index + 1)] }))
        }
      })
    );
  }
}
