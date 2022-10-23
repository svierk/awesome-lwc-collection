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
  @track columns = [];
  @track data = [];

  handleFileUpload(event) {
    const files = event.detail.files;

    if (files.length > 0) {
      const file = files[0];
      this.fileName = file.name;

      this.read(file);
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  }

  parse(csv) {
    const lines = csv.split(/\r\n|\n/);

    const headers = lines[0].split(',');
    this.columns = headers.map((header) => {
      return { label: header, fieldName: header };
    });

    const data = [];
    lines.forEach((line, i) => {
      if (i === 0) return;

      const obj = {};
      const currentline = line.split(',');

      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j];
      }

      data.push(obj);
    });
    this.data = data;
  }
}
