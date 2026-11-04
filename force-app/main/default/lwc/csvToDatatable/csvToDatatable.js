import { parseCsv } from 'c/csvParser';
import { LightningElement, track } from 'lwc';

/**
 * A simple parser for UTF-8 encoded, comma separated .csv files.
 * @alias CsvToDatatable
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-csv-to-datatable></c-csv-to-datatable>
 */
export default class CsvToDatatable extends LightningElement {
  errorMessage = '';
  fileName = 'No file uploaded yet.';
  keyField = 'id';
  @track columns = [];
  @track data = [];

  async handleFileUpload(event) {
    const files = event.detail.files;

    if (files.length > 0) {
      const file = files[0];
      this.fileName = file.name;

      await this.read(file);
    }
  }

  async read(file) {
    this.reset();

    let csv;
    try {
      csv = await file.text();
    } catch (e) {
      this.errorMessage = `The file could not be read: ${e.message}`;
      return;
    }

    try {
      this.parse(csv);
    } catch (e) {
      this.errorMessage = e.message;
    }
  }

  reset() {
    this.errorMessage = '';
    this.columns = [];
    this.data = [];
    this.keyField = 'id';
  }

  parse(csv) {
    const { headers, rows, keyField } = parseCsv(csv);
    this.columns = headers.map((header) => {
      return { label: header, fieldName: header };
    });
    this.keyField = keyField;
    this.data = rows;
  }
}
