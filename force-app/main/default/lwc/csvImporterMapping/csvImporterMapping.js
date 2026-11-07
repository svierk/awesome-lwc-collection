import COLUMN from '@salesforce/label/c.CsvImporterMapping_Column';
import DONT_IMPORT from '@salesforce/label/c.CsvImporterMapping_DontImport';
import DOWNLOAD_MAPPING from '@salesforce/label/c.CsvImporterMapping_DownloadMapping';
import DUPLICATES from '@salesforce/label/c.CsvImporterMapping_Duplicates';
import EXAMPLE from '@salesforce/label/c.CsvImporterMapping_Example';
import FIELD_FOR from '@salesforce/label/c.CsvImporterMapping_FieldFor';
import IMPORTING_INTO from '@salesforce/label/c.CsvImporterMapping_ImportingInto';
import MAPPING_ERROR from '@salesforce/label/c.CsvImporterMapping_MappingError';
import MISSING_FIELDS from '@salesforce/label/c.CsvImporterMapping_MissingFields';
import NO_MAPPING from '@salesforce/label/c.CsvImporterMapping_NoMapping';
import OBJECT from '@salesforce/label/c.CsvImporterMapping_Object';
import OBJECT_API_NAME from '@salesforce/label/c.CsvImporterMapping_ObjectApiName';
import OBJECT_ERROR from '@salesforce/label/c.CsvImporterMapping_ObjectError';
import OBJECT_HELP from '@salesforce/label/c.CsvImporterMapping_ObjectHelp';
import OBJECT_PLACEHOLDER from '@salesforce/label/c.CsvImporterMapping_ObjectPlaceholder';
import OTHER_OBJECT from '@salesforce/label/c.CsvImporterMapping_OtherObject';
import SALESFORCE_FIELD from '@salesforce/label/c.CsvImporterMapping_SalesforceField';
import UPLOAD_MAPPING from '@salesforce/label/c.CsvImporterMapping_UploadMapping';
import { isRequired } from 'c/csvValidator';
import { getErrorMessage } from 'c/errorUtils';
import { formatLabel } from 'c/labelUtils';
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

  /**
   * The field the records are upserted by, e.g. an external ID field or Id. It needs a column, and can be chosen even
   * when records can't be created with it.
   * @type {string}
   */
  @api keyFieldApiName;

  labels = {
    column: COLUMN,
    downloadMapping: DOWNLOAD_MAPPING,
    example: EXAMPLE,
    object: OBJECT,
    objectApiName: OBJECT_API_NAME,
    objectHelp: OBJECT_HELP,
    objectPlaceholder: OBJECT_PLACEHOLDER,
    salesforceField: SALESFORCE_FIELD,
    uploadMapping: UPLOAD_MAPPING
  };
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
      this.objectError = formatLabel(OBJECT_ERROR, this.objectApiName, getErrorMessage(error));
      this.notify();
    }
  }

  get isObjectFixed() {
    return Boolean(this.fixedObjectApiName);
  }

  get objectLabel() {
    return this.objectInfo?.label;
  }

  get importingInto() {
    return formatLabel(IMPORTING_INTO, this.objectLabel);
  }

  /** The fields a column can be mapped to: the ones records can be created with, and the upsert field. */
  get importableFields() {
    return Object.values(this.objectInfo?.fields ?? {}).filter(
      (field) => field.createable || field.apiName === this.keyFieldApiName
    );
  }

  /** The importable fields sorted by label, after the option to skip a column. */
  get fieldOptions() {
    const fields = this.importableFields
      .map((field) => ({ label: `${field.label} (${field.apiName})`, value: field.apiName }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: DONT_IMPORT, value: SKIP }, ...fields];
  }

  get duplicateFields() {
    const used = Object.values(this.mapping).filter(Boolean);
    return [...new Set(used.filter((field, index) => used.indexOf(field) !== index))];
  }

  get duplicateMessage() {
    const labels = this.duplicateFields.map((field) => this.objectInfo.fields[field].label);
    return labels.length ? formatLabel(DUPLICATES, labels.join(', ')) : '';
  }

  /** The labels of the fields records can't be imported without, when no column is mapped to them. Needs the object. */
  get missingFields() {
    const used = new Set(Object.values(this.mapping));
    const required = this.importableFields
      .filter((field) => isRequired(field) || field.apiName === this.keyFieldApiName)
      .filter((field) => !used.has(field.apiName))
      .map((field) => field.label);
    // an upsert field the object doesn't have can't be mapped either
    const unknownKey = this.keyFieldApiName && !this.objectInfo.fields[this.keyFieldApiName];
    return unknownKey ? [...required, this.keyFieldApiName] : required;
  }

  get missingMessage() {
    const labels = this.missingFields;
    return labels.length ? formatLabel(MISSING_FIELDS, labels.join(', ')) : '';
  }

  get isValid() {
    return (
      Boolean(this.objectInfo) &&
      this.duplicateFields.length === 0 &&
      this.missingFields.length === 0 &&
      Object.values(this.mapping).some(Boolean)
    );
  }

  get rows() {
    return this.headers.map((column) => ({
      column,
      sample: this.sampleRow?.[column] ?? '',
      field: this.mapping[column],
      label: formatLabel(FIELD_FOR, column)
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
    const fields = this.importableFields;
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
        throw new Error(NO_MAPPING);
      }
      if (this.isObjectFixed && objectApiName !== this.fixedObjectApiName) {
        throw new Error(formatLabel(OTHER_OBJECT, objectApiName, this.fixedObjectApiName));
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
      this.importError = formatLabel(MAPPING_ERROR, getErrorMessage(e));
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
