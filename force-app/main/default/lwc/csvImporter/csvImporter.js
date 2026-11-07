import { detectDelimiter, parseCsv } from 'c/csvParser';
import { getErrorMessage } from 'c/errorUtils';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { api, LightningElement } from 'lwc';

const PREVIEW_ROWS = 20;
const BYTES_PER_MB = 1024 * 1024;

const DELIMITER_OPTIONS = [
  { label: 'Detect automatically', value: 'auto' },
  { label: 'Comma (,)', value: ',' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Tab', value: '\t' }
];

const ENCODING_OPTIONS = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'Windows-1252', value: 'windows-1252' }
];

const DELIMITER_NAMES = { ',': 'comma', ';': 'semicolon', '\t': 'tab' };

const STEPS = [
  { label: 'Upload', value: 'upload' },
  { label: 'Map Fields', value: 'map' },
  { label: 'Review', value: 'review' },
  { label: 'Import', value: 'import' }
];

/**
 * Imports CSV files into Salesforce in steps: the file is read and previewed, its columns are mapped to fields, the
 * rows are checked against these fields, and then inserted or upserted.
 * @alias CsvImporter
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires CsvImporter#parsed
 * @fires CsvImporter#imported
 *
 * @example
 * <c-csv-importer import-object-api-name="Contact" max-file-size-mb="10" onparsed={handleParsed}></c-csv-importer>
 */
export default class CsvImporter extends LightningElement {
  /**
   * The object the rows are imported into, e.g. 'Contact'. Without it, users enter the object in the wizard. It
   * isn't called objectApiName, because record pages set that property to the object of the page.
   * @type {string}
   * @default ''
   */
  @api importObjectApiName = '';

  /**
   * The largest file in megabytes that can be read.
   * @type {number}
   * @default 5
   */
  @api maxFileSizeMb = 5;

  /**
   * The most rows a file may have, not counting the header.
   * @type {number}
   * @default 10000
   */
  @api maxRows = 10000;

  /**
   * The field the rows are upserted by, e.g. an external ID field or Id: rows with the value of an existing record
   * update it, the others create new records. Without it, every row creates a new record.
   * @type {string}
   * @default ''
   */
  @api externalIdFieldApiName = '';

  /**
   * Read-only. The number of rows that created or updated a record in the last import. Also available as a Flow output.
   * @type {number}
   */
  @api
  get successCount() {
    return this._successCount;
  }

  /**
   * Read-only. The number of rows that failed in the last import. Also available as a Flow output.
   * @type {number}
   */
  @api
  get failedCount() {
    return this._failedCount;
  }

  /**
   * Read-only. The ids of the records the last import created. Also available as a Flow output.
   * @type {string[]}
   */
  @api
  get createdRecordIds() {
    return this._createdRecordIds;
  }

  _successCount = 0;
  _failedCount = 0;
  _createdRecordIds = [];

  currentStep = 'upload';
  delimiter = 'auto';
  delimiterOptions = DELIMITER_OPTIONS;
  encoding = 'utf-8';
  encodingOptions = ENCODING_OPTIONS;
  errorMessage = '';
  fileName = '';
  headers = [];
  importCount = 0;
  importFinished = false;
  importStarted = false;
  keyField = 'id';
  mapping = {};
  mappingObjectApiName;
  mappingValid = false;
  reviewRows = [];
  reviewValid = false;
  rows = [];
  steps = STEPS;
  usedDelimiter = ',';
  buffer;

  get columns() {
    return this.headers.map((header) => ({ label: header, fieldName: header }));
  }

  get previewRows() {
    return this.rows.slice(0, PREVIEW_ROWS);
  }

  get hasRows() {
    return this.rows.length > 0;
  }

  get sampleRow() {
    return this.rows[0];
  }

  get stepIndex() {
    return STEPS.findIndex((step) => step.value === this.currentStep);
  }

  // the steps stay in the page while hidden, so going back doesn't lose what was entered
  stepClass(step) {
    return this.currentStep === step ? '' : 'slds-hide';
  }

  get uploadClass() {
    return this.stepClass('upload');
  }

  get mapClass() {
    return this.stepClass('map');
  }

  get reviewClass() {
    return this.stepClass('review');
  }

  get importClass() {
    return this.stepClass('import');
  }

  // once the import started, going back could import the rows twice
  get backClass() {
    return this.stepIndex === 0 || this.importStarted ? 'slds-hide' : '';
  }

  get nextClass() {
    return `slds-col_bump-left ${this.stepIndex === STEPS.length - 1 ? 'slds-hide' : ''}`;
  }

  get isNextDisabled() {
    const ready = { upload: this.hasRows, map: this.mappingValid, review: this.reviewValid };
    return !ready[this.currentStep];
  }

  handleNext() {
    this.currentStep = STEPS[this.stepIndex + 1].value;
  }

  handleBack() {
    this.currentStep = STEPS[this.stepIndex - 1].value;
  }

  handleMappingChange(event) {
    const { objectApiName, mapping, valid } = event.detail;
    Object.assign(this, { mappingObjectApiName: objectApiName, mapping, mappingValid: valid });
  }

  handleReviewChange(event) {
    const { rows, valid } = event.detail;
    Object.assign(this, { reviewRows: rows, reviewValid: valid });
  }

  handleImportStart() {
    this.importStarted = true;
  }

  // a new key renders a new file input, which also takes the same file again
  get fileInputKeys() {
    return [`file-${this.importCount}`];
  }

  /** Starts over with the upload, keeping the encoding and delimiter users chose. */
  handleNewImport() {
    this.reset();
    Object.assign(this, {
      buffer: undefined,
      currentStep: 'upload',
      fileName: '',
      importCount: this.importCount + 1,
      importFinished: false,
      importStarted: false,
      mapping: {},
      mappingObjectApiName: undefined,
      mappingValid: false,
      reviewRows: [],
      reviewValid: false
    });
    this.setOutputs(0, 0, []);
  }

  /** Keeps the result of the import and passes it on to a Flow. */
  setOutputs(successCount, failedCount, createdRecordIds) {
    Object.assign(this, {
      _successCount: successCount,
      _failedCount: failedCount,
      _createdRecordIds: createdRecordIds
    });
    this.dispatchEvent(new FlowAttributeChangeEvent('successCount', successCount));
    this.dispatchEvent(new FlowAttributeChangeEvent('failedCount', failedCount));
    this.dispatchEvent(new FlowAttributeChangeEvent('createdRecordIds', createdRecordIds));
  }

  handleImportFinish(event) {
    const { created, updated, failed, createdRecordIds } = event.detail;
    this.importFinished = true;
    this.setOutputs(created + updated, failed, [...createdRecordIds]);
    /**
     * Fired when the import is done.
     * @event CsvImporter#imported
     * @type {CustomEvent}
     * @property {Object} detail - objectApiName; created, updated and failed: the number of rows; recordIds: the ids
     * of the saved records; createdRecordIds: the ids of the new records
     */
    this.dispatchEvent(
      new CustomEvent('imported', { detail: { objectApiName: this.mappingObjectApiName, ...event.detail } })
    );
  }

  get summary() {
    const shown = Math.min(this.rows.length, PREVIEW_ROWS);
    return `${this.fileName}: showing ${shown} of ${this.rows.length} rows, separated by ${DELIMITER_NAMES[this.usedDelimiter]}.`;
  }

  async handleFileUpload(event) {
    const [file] = event.detail.files;
    if (!file) {
      return;
    }
    this.reset();
    this.buffer = undefined;
    this.fileName = file.name;

    if (file.size > this.limit(this.maxFileSizeMb, 5) * BYTES_PER_MB) {
      this.errorMessage = `The file is larger than ${this.limit(this.maxFileSizeMb, 5)} MB.`;
      return;
    }
    try {
      this.buffer = await file.arrayBuffer();
    } catch (e) {
      this.errorMessage = `The file could not be read: ${getErrorMessage(e)}`;
      return;
    }
    this.parse();
  }

  handleEncodingChange(event) {
    this.encoding = event.detail.value;
    this.parse();
  }

  handleDelimiterChange(event) {
    this.delimiter = event.detail.value;
    this.parse();
  }

  /** A positive number from a builder property, or the default for an empty or invalid value. */
  limit(value, fallback) {
    const number = Number(value);
    return number > 0 ? number : fallback;
  }

  reset() {
    this.errorMessage = '';
    this.headers = [];
    this.rows = [];
    this.keyField = 'id';
  }

  parse() {
    if (!this.buffer) {
      return;
    }
    this.reset();
    try {
      const text = new TextDecoder(this.encoding).decode(this.buffer);
      this.usedDelimiter = this.delimiter === 'auto' ? detectDelimiter(text) : this.delimiter;
      const { headers, rows, keyField } = parseCsv(text, { delimiter: this.usedDelimiter });
      const maxRows = this.limit(this.maxRows, 10000);
      if (rows.length > maxRows) {
        this.errorMessage = `The file has more than ${maxRows} rows.`;
        return;
      }
      Object.assign(this, { headers, rows, keyField });
    } catch (e) {
      this.errorMessage = getErrorMessage(e);
      return;
    }

    /**
     * Fired when a file was parsed.
     * @event CsvImporter#parsed
     * @type {CustomEvent}
     * @property {Object} detail - A copy of the result: fileName, headers, keyField, rows and delimiter
     */
    this.dispatchEvent(
      new CustomEvent('parsed', {
        detail: structuredClone({
          fileName: this.fileName,
          headers: this.headers,
          keyField: this.keyField,
          rows: this.rows,
          delimiter: this.usedDelimiter
        })
      })
    );
  }
}
