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
    try {
      const result = await this.load(file);
      this.parse(result);
    } catch (e) {
      this.error = e;
    }
  }

  async load(file) {
    try {
      return await file.text();
    } catch (e) {
      this.error = e;
      return null;
    }
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
