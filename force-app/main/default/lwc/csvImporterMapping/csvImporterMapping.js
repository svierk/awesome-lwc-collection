import { getErrorMessage } from 'c/errorUtils';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { api, LightningElement, wire } from 'lwc';

const SKIP = '';
const MAPPING_VERSION = 1;

// "First Name", "first_name" and "FirstName" all become "firstname"; custom fields match without their suffix
const normalize = (value) =>
  String(value)
    .toLowerCase()
    .replace(/__c$/, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Maps the columns of a CSV file to the fields of a Salesforce object. Used by the CSV Importer.
 * @alias CsvImporterMapping
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires CsvImporterMapping#mappingchange
 */
export default class CsvImporterMapping extends LightningElement {
  /**
   * The columns of the file.
   * @type {string[]}
   */
  @api
  get headers() {
    return this._headers;
  }

  set headers(value) {
    this._headers = Array.isArray(value) ? value : [];
    this.autoMatch();
  }

  /**
   * The first row of the file, shown as an example for every column.
   * @type {Object}
   */
  @api sampleRow = {};

  /**
   * The object set in the Lightning App Builder. Without it, users enter the object themselves.
   * @type {string}
   */
  @api
  get fixedObjectApiName() {
    return this._fixedObjectApiName;
  }

  set fixedObjectApiName(value) {
    this._fixedObjectApiName = value;
    this.objectApiName = value || this.objectApiName;
  }

  objectApiName;
  objectInfo;
  objectError = '';
  importError = '';
  mapping = {};
  pendingMapping;
  _headers = [];
  _fixedObjectApiName;

  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  wiredObjectInfo({ data, error }) {
    if (data) {
      this.objectInfo = data;
      this.objectError = '';
      if (this.pendingMapping) {
        this.applyMapping(this.pendingMapping);
        this.pendingMapping = undefined;
      } else {
        this.autoMatch();
      }
    } else if (error) {
      this.objectInfo = undefined;
      this.objectError = `The object ${this.objectApiName} can't be used: ${getErrorMessage(error)}`;
      this.notify();
    }
  }

  get isObjectFixed() {
    return Boolean(this.fixedObjectApiName);
  }

  get objectLabel() {
    return this.objectInfo?.label;
  }

  /** The fields records can be created with, sorted by label, after the option to skip a column. */
  get fieldOptions() {
    const fields = Object.values(this.objectInfo?.fields ?? {})
      .filter((field) => field.createable)
      .map((field) => ({ label: `${field.label} (${field.apiName})`, value: field.apiName }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: "Don't import", value: SKIP }, ...fields];
  }

  get duplicateFields() {
    const used = Object.values(this.mapping).filter(Boolean);
    return [...new Set(used.filter((field, index) => used.indexOf(field) !== index))];
  }

  get duplicateMessage() {
    const labels = this.duplicateFields.map((field) => this.objectInfo.fields[field].label);
    return labels.length ? `More than one column is mapped to: ${labels.join(', ')}.` : '';
  }

  get isValid() {
    return Boolean(this.objectInfo) && this.duplicateFields.length === 0 && Object.values(this.mapping).some(Boolean);
  }

  get rows() {
    return this.headers.map((column) => ({
      column,
      sample: this.sampleRow?.[column] ?? '',
      field: this.mapping[column],
      label: `Field for ${column}`
    }));
  }

  get hasObject() {
    return Boolean(this.objectInfo);
  }

  handleObjectChange(event) {
    this.objectApiName = event.target.value.trim();
    this.objectInfo = undefined;
    this.objectError = '';
    this.mapping = {};
    this.notify();
  }

  handleFieldChange(event) {
    this.mapping = { ...this.mapping, [event.target.dataset.column]: event.detail.value };
    this.notify();
  }

  /** Maps every column to the field whose API name or label it matches, keeping the columns already mapped. */
  autoMatch() {
    if (!this.objectInfo) {
      return;
    }
    const fields = Object.values(this.objectInfo.fields).filter((field) => field.createable);
    const mapping = {};
    this.headers.forEach((column) => {
      const key = normalize(column);
      const match = fields.find((field) => normalize(field.apiName) === key || normalize(field.label) === key);
      mapping[column] = this.mapping[column] ?? match?.apiName ?? SKIP;
    });
    this.mapping = mapping;
    this.notify();
  }

  handleExport() {
    const content = { version: MAPPING_VERSION, objectApiName: this.objectApiName, mapping: this.mapping };
    const link = document.createElement('a');
    link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(content, null, 2))}`;
    link.download = `${this.objectApiName}-mapping.json`;
    link.click();
  }

  async handleImport(event) {
    const [file] = event.detail.files;
    if (!file) {
      return;
    }
    this.importError = '';
    try {
      const { objectApiName, mapping } = JSON.parse(await file.text());
      if (typeof mapping !== 'object' || mapping === null) {
        throw new Error('it has no mapping');
      }
      if (this.isObjectFixed && objectApiName !== this.fixedObjectApiName) {
        throw new Error(`it is for ${objectApiName}, not for ${this.fixedObjectApiName}`);
      }
      if (!this.isObjectFixed && objectApiName && objectApiName !== this.objectApiName) {
        // the fields of the other object are checked once they are loaded
        this.pendingMapping = mapping;
        this.objectApiName = objectApiName;
        this.objectInfo = undefined;
        this.mapping = {};
        return;
      }
      this.applyMapping(mapping);
    } catch (e) {
      this.importError = `The mapping could not be used: ${getErrorMessage(e)}`;
    }
  }

  /** Takes the fields of an imported mapping that exist on the object, and skips the other columns. */
  applyMapping(mapping) {
    const fields = new Set(this.fieldOptions.map((option) => option.value));
    this.mapping = Object.fromEntries(
      this.headers.map((column) => [column, fields.has(mapping[column]) ? mapping[column] : SKIP])
    );
    this.notify();
  }

  notify() {
    /**
     * Fired when the object or the mapping changes.
     * @event CsvImporterMapping#mappingchange
     * @type {CustomEvent}
     * @property {Object} detail - objectApiName, objectLabel, the mapping from column to field API name, and whether
     * it can be used for the import
     */
    this.dispatchEvent(
      new CustomEvent('mappingchange', {
        detail: {
          objectApiName: this.objectApiName,
          objectLabel: this.objectLabel,
          mapping: { ...this.mapping },
          valid: this.isValid
        }
      })
    );
  }
}
