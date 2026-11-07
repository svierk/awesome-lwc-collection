import importRecords from '@salesforce/apex/CsvImportController.importRecords';
import { formatCsv } from 'c/csvParser';
import { convertValue } from 'c/csvValidator';
import { getErrorMessage } from 'c/errorUtils';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { api, LightningElement, wire } from 'lwc';

// the most records Salesforce saves in one DML call without splitting the triggers into batches
const CHUNK_SIZE = 200;
const ERROR_COLUMN = 'Import Error';

const FAILURE_COLUMNS = [
  { label: 'Row', fieldName: 'rowNumber', type: 'number', initialWidth: 80, cellAttributes: { alignment: 'left' } },
  { label: 'Error', fieldName: 'message', wrapText: true }
];

/**
 * Imports the checked rows of a CSV file in chunks of 200 and shows the result of each row. Used by the CSV
 * Importer.
 * @alias CsvImporterImport
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires CsvImporterImport#importstart
 * @fires CsvImporterImport#importfinish
 */
export default class CsvImporterImport extends LightningElement {
  /**
   * The object the rows are imported into.
   * @type {string}
   */
  @api objectApiName;

  /**
   * The field API name each column is mapped to; columns mapped to an empty value are skipped.
   * @type {Object}
   */
  @api mapping = {};

  /**
   * The rows of the file with the corrections, by column.
   * @type {Object[]}
   */
  @api rows = [];

  /**
   * The columns of the file, for the download of the failed rows.
   * @type {string[]}
   */
  @api headers = [];

  /**
   * The delimiter of the file, also used for the download of the failed rows.
   * @type {string}
   */
  @api delimiter = ',';

  /**
   * The name of the file, the download of the failed rows is named after it.
   * @type {string}
   */
  @api fileName = '';

  /**
   * The field the records are upserted by. Without it, every row creates a new record.
   * @type {string}
   */
  @api externalIdFieldApiName;

  failureColumns = FAILURE_COLUMNS;
  objectInfo;
  results = [];
  status = 'ready';

  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  wiredObjectInfo({ data }) {
    // the mapping step already shows why an object can't be loaded
    if (data) {
      this.objectInfo = data;
    }
  }

  get isReady() {
    return this.status === 'ready';
  }

  get isDone() {
    return this.status === 'done';
  }

  get isImportDisabled() {
    return !this.objectInfo || this.rows.length === 0;
  }

  get intro() {
    const objectLabel = this.objectInfo?.labelPlural ?? this.objectApiName;
    const keyLabel = this.objectInfo?.fields[this.externalIdFieldApiName]?.label ?? this.externalIdFieldApiName;
    const mode = this.externalIdFieldApiName
      ? `Rows with the ${keyLabel} of an existing record update it, the others create new records.`
      : 'Every row creates a new record.';
    return `${this.rows.length} rows are ready to be imported into ${objectLabel}. ${mode}`;
  }

  get progress() {
    return Math.round((this.results.length / this.rows.length) * 100);
  }

  get progressText() {
    return `Processed ${this.results.length} of ${this.rows.length} rows.`;
  }

  get failures() {
    return this.results.filter((result) => !result.success);
  }

  get hasFailures() {
    return this.failures.length > 0;
  }

  get summary() {
    const created = this.results.filter((result) => result.created).length;
    const updated = this.results.filter((result) => result.success && !result.created).length;
    return `Done: ${created} created, ${updated} updated, ${this.failures.length} failed.`;
  }

  /** The values of the mapped fields of each row, converted to the types of the fields. */
  toRecords() {
    const fields = Object.entries(this.mapping)
      .filter(([, apiName]) => this.objectInfo.fields[apiName])
      .map(([column, apiName]) => ({ column, field: this.objectInfo.fields[apiName] }));
    return this.rows.map((row) => {
      const record = {};
      fields.forEach(({ column, field }) => {
        const value = convertValue(row[column], field);
        if (value !== undefined) {
          record[field.apiName] = value;
        }
      });
      return record;
    });
  }

  async handleImport() {
    this.status = 'running';
    this.results = [];
    /**
     * Fired when the import starts.
     * @event CsvImporterImport#importstart
     * @type {CustomEvent}
     */
    this.dispatchEvent(new CustomEvent('importstart'));

    const records = this.toRecords();
    const chunks = [];
    for (let start = 0; start < records.length; start += CHUNK_SIZE) {
      chunks.push(records.slice(start, start + CHUNK_SIZE));
    }
    // one chunk after the other, so the progress grows steadily and the server isn't flooded
    await chunks.reduce((previous, chunk) => previous.then(() => this.importChunk(chunk)), Promise.resolve());

    this.status = 'done';
    /**
     * Fired when every row was sent.
     * @event CsvImporterImport#importfinish
     * @type {CustomEvent}
     * @property {Object} detail - created, updated and failed: the number of rows; recordIds: the ids of the saved
     * records
     */
    this.dispatchEvent(
      new CustomEvent('importfinish', {
        detail: {
          created: this.results.filter((result) => result.created).length,
          updated: this.results.filter((result) => result.success && !result.created).length,
          failed: this.failures.length,
          recordIds: this.results.filter((result) => result.success).map((result) => result.recordId)
        }
      })
    );
  }

  async importChunk(chunk) {
    let chunkResults;
    try {
      chunkResults = await importRecords({
        objectApiName: this.objectApiName,
        recordsJson: JSON.stringify(chunk),
        externalIdField: this.externalIdFieldApiName ?? ''
      });
    } catch (error) {
      // a call that fails, e.g. because the session expired, fails all rows of its chunk
      const message = getErrorMessage(error);
      chunkResults = chunk.map(() => ({ success: false, created: false, message }));
    }
    const offset = this.results.length;
    this.results = [
      ...this.results,
      ...chunkResults.map((result, index) => ({ ...result, rowNumber: offset + index + 1 }))
    ];
  }

  /** Downloads the failed rows as they were in the file, with the corrections and a column with the error. */
  handleDownload() {
    const rows = this.failures.map((failure) => ({
      ...this.rows[failure.rowNumber - 1],
      [ERROR_COLUMN]: failure.message
    }));
    const text = formatCsv([...this.headers, ERROR_COLUMN], rows, { delimiter: this.delimiter });
    const link = document.createElement('a');
    // the byte order mark makes Excel read the file as UTF-8; the importer ignores it
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${text}`)}`;
    link.download = `${this.fileName.replace(/\.[^.]*$/, '') || 'import'}-failed.csv`;
    link.click();
  }
}
