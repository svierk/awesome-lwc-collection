import CsvToDatatable from 'c/csvToDatatable';
import { createElement } from 'lwc';

let element;

describe('c-csv-to-datatable', () => {
  beforeEach(() => {
    element = createElement('c-csv-to-datatable', {
      is: CsvToDatatable
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should handle csv file upload successfully', async () => {
    // given
    jest.spyOn(global, 'FileReader').mockImplementation(function () {
      this.readAsText = jest.fn(
        () =>
          (this.result = `
      Name,Website,Phone,BillingStreet,BillingCity,BillingState,BillingPostalCode,BillingCountry
      sForceTest1,http://www.sforcetest1.com,(415) 901-7000,The Landmark @ One Market,San Francisco,CA,94105,US
      sForceTest2,http://www.sforcetest2.com,(415) 901-7000,The Landmark @ One Market Suite 300,San Francisco,CA,94105,US
      sForceTest3,http://www.sforcetest3.com,(415) 901-7000,1 Market St,San Francisco,CA,94105,US
      `)
      );
    });

    // when
    document.body.appendChild(element);
    const input = element.shadowRoot.querySelector('lightning-input');
    const files = [new Blob()];
    input.dispatchEvent(
      new CustomEvent('change', {
        detail: {
          files: files
        }
      })
    );

    // then
    expect(FileReader).toHaveBeenCalledTimes(1);
    const reader = FileReader.mock.instances[0];
    expect(reader.readAsText).toHaveBeenCalledTimes(1);
    expect(reader.readAsText).toHaveBeenCalledWith(files[0]);
    expect(reader.onload).toEqual(expect.any(Function));
    reader.onload();
  });

  it('should handle csv file upload errors properly', async () => {
    // given
    jest.spyOn(global, 'FileReader').mockImplementation(function () {
      this.readAsText = jest.fn(() => (this.result = ''));
    });

    // when
    document.body.appendChild(element);
    const input = element.shadowRoot.querySelector('lightning-input');
    const files = [new Blob()];
    input.dispatchEvent(
      new CustomEvent('change', {
        detail: {
          files: files
        }
      })
    );

    // then
    expect(FileReader).toHaveBeenCalledTimes(1);
    const reader = FileReader.mock.instances[0];
    expect(reader.readAsText).toHaveBeenCalledTimes(1);
    expect(reader.readAsText).toHaveBeenCalledWith(files[0]);
    expect(reader.onload).toEqual(expect.any(Function));
    reader.onerror();
  });
});
