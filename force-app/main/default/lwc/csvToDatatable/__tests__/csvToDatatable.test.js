import CsvToDatatable from 'c/csvToDatatable';
import { createElement } from 'lwc';

// helper to create mock file with text() method
const createMockFile = (content, filename = 'test.csv') => {
  const file = new File([content], filename, { type: 'text/csv' });
  file.text = jest.fn().mockResolvedValue(content);
  return file;
};

// helper to wait for async dom updates
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

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
  });

  it('should render with default values', () => {
    // when
    document.body.appendChild(element);

    // then
    const card = element.shadowRoot.querySelector('lightning-card');
    expect(card).toBeTruthy();
    expect(card.title).toBe('CSV To Datatable');
    expect(card.iconName).toBe('doctype:csv');

    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable).toBeTruthy();
    expect(datatable.hideCheckboxColumn).toBe(true);
  });

  it('should handle valid csv file upload', async () => {
    // given
    const csvContent = 'Name,Age,City\nJohn,30,New York\nJane,25,Los Angeles';
    const mockFile = createMockFile(csvContent, 'employees.csv');

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [mockFile] }
      })
    );

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.columns).toHaveLength(3);
    expect(datatable.columns[0]).toEqual({ label: 'Name', fieldName: 'Name' });
    expect(datatable.data).toHaveLength(2);
    expect(datatable.data[0]).toEqual({ Name: 'John', Age: '30', City: 'New York' });
  });

  it('should handle csv with crlf line endings', async () => {
    // given
    const csvContent = 'Product,Price\r\nLaptop,1200\r\nMouse,25';
    const mockFile = createMockFile(csvContent);

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [mockFile] }
      })
    );

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.data).toHaveLength(2);
    expect(datatable.data[0]).toEqual({ Product: 'Laptop', Price: '1200' });
  });

  it('should handle empty files array', async () => {
    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [] }
      })
    );

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.columns).toEqual([]);
    expect(datatable.data).toEqual([]);
  });

  it('should handle file read error properly', async () => {
    // given
    const mockFile = new File(['content'], 'error.csv', { type: 'text/csv' });
    mockFile.text = jest.fn().mockRejectedValue(new Error('File read error'));

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [mockFile] }
      })
    );

    await flushPromises();

    // then
    expect(mockFile.text).toHaveBeenCalled();
  });
});
